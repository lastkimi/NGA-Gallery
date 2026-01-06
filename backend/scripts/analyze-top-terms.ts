import mongoose from 'mongoose';
import { config } from '../src/config';
import { ObjectModel } from '../src/models/schemas';
import fs from 'fs';
import path from 'path';

async function analyzeTopTerms() {
  try {
    await mongoose.connect(config.database.uri);
    console.log('已连接到 MongoDB');

    const LIMIT = 500; // 每个字段取 Top 500
    // 分类分析：字段 -> 文件名
    const fieldMap: Record<string, string> = {
        'attribution': 'terms_attribution.json',
        'medium': 'terms_medium.json',
        'credit_line': 'terms_credit_line.json',
        'classification': 'terms_classification.json',
        'sub_classification': 'terms_sub_classification.json',
        'visual_classification': 'terms_visual_classification.json',
        'department': 'terms_department.json',
        // 'provenance': 'terms_provenance.json' // Provenance 通常太长，不适合作为术语
    };

    const topTerms: Record<string, number> = {};
    const dictionaries: Record<string, string[]> = {};

    for (const [field, filename] of Object.entries(fieldMap)) {
        console.log(`正在分析字段: ${field}...`);
        const agg = await ObjectModel.aggregate([
            { $match: { [field]: { $exists: true, $ne: '' } } }, // 忽略空值
            { $group: { _id: `$${field}`, count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: LIMIT }
        ]);

        console.log(`  找到 ${agg.length} 个高频词 (Top ${LIMIT})`);
        
        dictionaries[field] = [];

        agg.forEach(item => {
            const term = item._id;
            // 过滤掉太长的句子（适合做字典的是短语）
            if (term && term.length < 100) {
                topTerms[term] = (topTerms[term] || 0) + item.count;
                dictionaries[field].push(term);
            }
        });
        
        // 保存单个字段的字典
        fs.writeFileSync(path.join(__dirname, `../top_terms_${field}.json`), JSON.stringify(dictionaries[field], null, 2));
    }

    // 转换为数组并排序 (总表)
    const sortedTerms = Object.entries(topTerms)
        .sort((a, b) => b[1] - a[1])
        .map(entry => entry[0]);

    console.log(`\n总计提取高频短语: ${sortedTerms.length} 个`);
    
    // 写入总文件
    fs.writeFileSync(path.join(__dirname, '../top_terms.json'), JSON.stringify(sortedTerms, null, 2));
    console.log('💾 高频词表已保存至 backend/top_terms.json 和各分类文件');

  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
  }
}

analyzeTopTerms();
