import mongoose from 'mongoose';
import { config } from '../src/config';
import { ObjectModel } from '../src/models/schemas';

async function cleanTranslations() {
  try {
    await mongoose.connect(config.database.uri);
    console.log('✅ Connected to MongoDB');

    const BATCH_SIZE = 1000;
    const total = await ObjectModel.countDocuments({ 'translations.locale': 'zh' });
    console.log(`Found ${total} items with translations. Scanning for dirty data...`);

    let processed = 0;
    let cleanedCount = 0;
    let removeCount = 0;

    while (processed < total) {
      const docs = await ObjectModel.find({ 'translations.locale': 'zh' })
        .select('translations object_id')
        .skip(processed) // 注意：如果删除了翻译，skip 可能会漏掉数据，但这里我们通常是 update 不是 remove doc
        .limit(BATCH_SIZE);

      if (docs.length === 0) break;

      const bulkOps: any[] = [];

      for (const doc of docs) {
        const zh = doc.translations.find((t: any) => t.locale === 'zh');
        if (!zh) continue;

        let isDirty = false;
        let shouldRemove = false;
        
        const cleanField = (text: string): string => {
            if (!text) return text;
            let cleaned = text;

            // 1. 移除 <think>...</think>
            if (cleaned.includes('<think>')) {
                cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
                isDirty = true;
            }
            // 处理不带闭合标签的情况（截断）
            if (cleaned.includes('<think>')) {
                cleaned = cleaned.split('<think>')[0].trim();
                isDirty = true;
            }
            if (cleaned.includes('</think>')) {
                cleaned = cleaned.split('</think>')[1].trim();
                isDirty = true;
            }

            // 2. 移除 "中文翻译：" 前缀
            if (cleaned.startsWith('中文翻译：') || cleaned.startsWith('翻译：')) {
                cleaned = cleaned.replace(/^(中文)?翻译[:：]\s*/, '');
                isDirty = true;
            }

            // 3. 检查是否包含大量无关内容（简单启发式）
            // 如果字段本身很短（如 Title），但翻译结果巨长（超过 500 字符），视为幻觉/解释
            if (text.length < 50 && cleaned.length > 500) {
                // console.log(`[Suspicious] ID ${doc.object_id}: ${text.substring(0,20)}... -> ${cleaned.substring(0,50)}...`);
                shouldRemove = true; 
            }

            return cleaned;
        };

        const newZh = { ...zh.toObject() };
        
        ['title', 'attribution', 'medium', 'provenance', 'credit_line', 'display_date'].forEach(field => {
            if (newZh[field]) {
                const originalLen = newZh[field].length;
                newZh[field] = cleanField(newZh[field]);
                if (newZh[field].length !== originalLen) isDirty = true;
                
                // 彻底移除明显错误的字段（例如仍然包含英文解释）
                if (newZh[field].includes('Sure, I can help') || newZh[field].includes('Here is the translation')) {
                    newZh[field] = ''; // 清空
                    isDirty = true;
                }
            }
        });

        if (shouldRemove) {
            // 如果判定为严重幻觉，直接从 translations 数组中移除 zh 条目
            bulkOps.push({
                updateOne: {
                    filter: { _id: doc._id },
                    update: { $pull: { translations: { locale: 'zh' } } }
                }
            });
            removeCount++;
        } else if (isDirty) {
            // 更新清洗后的内容
            bulkOps.push({
                updateOne: {
                    filter: { _id: doc._id, 'translations.locale': 'zh' },
                    update: { $set: { 'translations.$': newZh } }
                }
            });
            cleanedCount++;
        }
      }

      if (bulkOps.length > 0) {
          await ObjectModel.bulkWrite(bulkOps);
      }

      processed += docs.length;
      process.stdout.write(`\rScanned: ${processed} | Cleaned: ${cleanedCount} | Removed: ${removeCount}`);
    }

    console.log('\nCleaning complete!');

  } catch (error) {
    console.error('Cleaning error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

cleanTranslations().catch(console.error);
