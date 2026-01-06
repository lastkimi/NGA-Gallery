import mongoose from 'mongoose';
import { config } from '../src/config';
import { ObjectModel } from '../src/models/schemas';

async function improveTranslations() {
    try {
        await mongoose.connect(config.database.uri);
        console.log('✅ 连接数据库...');

        // 1. 术语修正映射
        const TERM_REPLACEMENTS = {
            '打印': '版画', // Print -> 版画
            '文件夹': '作品集', // Portfolio -> 作品集
            '未定义': '',
            'undefined': ''
        };

        console.log('\n--- 开始修正术语 ---');
        for (const [wrong, right] of Object.entries(TERM_REPLACEMENTS)) {
            // 使用游标遍历更新，比 aggregation pipeline 兼容性更好且不易出错
            const cursor = ObjectModel.find({
                $or: [
                    { classification_zh: wrong },
                    { medium_zh: { $regex: wrong } }
                ]
            }).cursor();

            let count = 0;
            for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
                let changed = false;
                
                if (doc.classification_zh === wrong) {
                    doc.classification_zh = right;
                    changed = true;
                }
                
                if (doc.medium_zh && doc.medium_zh.includes(wrong)) {
                    doc.medium_zh = doc.medium_zh.replace(new RegExp(wrong, 'g'), right);
                    changed = true;
                }

                if (changed) {
                    await doc.save();
                    count++;
                }
            }
            console.log(`修正 "${wrong}" -> "${right}": ${count} 条记录`);
        }

        // 2. 补漏逻辑
        // 查找 title_zh 存在但 medium_zh 缺失的
        console.log('\n--- 检查漏翻字段 ---');
        const missingMedium = await ObjectModel.countDocuments({
            title_zh: { $exists: true },
            medium: { $exists: true, $ne: '' },
            medium_zh: { $exists: false } // 或者为空字符串
        });
        
        console.log(`发现 ${missingMedium} 条记录有标题但缺少材质翻译。`);
        console.log('提示: 请运行 translate-ultimate.ts，它会自动跳过已完全翻译的，但目前的脚本逻辑是只要有title_zh就跳过。');
        console.log('建议: 修改 translate-ultimate.ts 的查询条件为 { $or: [{title_zh:null}, {medium_zh:null}] } 以便补漏。');

    } catch (e) {
        console.error(e);
  } finally {
    await mongoose.disconnect();
  }
}

improveTranslations();