import mongoose from 'mongoose';
import { config } from '../src/config';
import { ObjectModel } from '../src/models/schemas';
import fetch from 'node-fetch';
import pLimit from 'p-limit';

// --- Configuration ---
const SILICONFLOW_API_KEY = process.env.SILICONFLOW_API_KEY || 'sk-qfenrkobztqapseexvyynwljnincylbnywplfktfijhuviuv';
const SILICONFLOW_API_URL = 'https://api.siliconflow.cn/v1/chat/completions';

const MODEL_POOL = [
  'netease-youdao/bce-embedding-base_v1',
  'BAAI/bge-m3',
  'netease-youdao/bce-reranker-base_v1',
  'BAAI/bge-reranker-v2-m3',
  'BAAI/bge-large-zh-v1.5',
  'BAAI/bge-large-en-v1.5',
  'Qwen/Qwen3-8B', 
  'deepseek-ai/DeepSeek-OCR',
  'tencent/Hunyuan-MT-7B',
  'THUDM/GLM-4.1V-9B-Thinking',
  'deepseek-ai/DeepSeek-R1-0528-Qwen3-8B',
  'THUDM/GLM-Z1-9B-0414',
  'deepseek-ai/DeepSeek-R1-Distill-Qwen-7B',
  'Qwen/Qwen2.5-7B-Instruct',
  'Qwen/Qwen2.5-Coder-7B-Instruct',
  'THUDM/GLM-4-9B-0414',
  'internlm/internlm2_5-7b-chat',
  'THUDM/glm-4-9b-chat',
  'Qwen/Qwen2-7B-Instruct'
];

// 高并发设置
const BATCH_SIZE = 500; // 数据库批次大小
const CONCURRENCY_LIMIT = 50; // 实际 API 并发请求数限制 (QPS控制)
const MAX_RETRIES = 5;

// 并发限制器
const limit = pLimit(CONCURRENCY_LIMIT);

let modelIndex = 0;
function getNextModel() {
  const model = MODEL_POOL[modelIndex % MODEL_POOL.length];
  modelIndex++;
  return model;
}

// --- Translation Function ---

async function translateWithSiliconFlow(text: string, context: string = ''): Promise<string> {
  if (!text || text.trim().length === 0) return text;

  let retries = 0;
  
  while (retries < MAX_RETRIES) {
    const currentModel = getNextModel();
    const isMTModel = currentModel.includes('Hunyuan-MT');
    
    let messages = [];
    if (isMTModel) {
        messages = [{ role: 'user', content: `将下面的艺术文本翻译成中文：\n${text}` }];
    } else {
        messages = [
            { role: 'system', content: '你是一个专业的艺术史翻译专家。请直接将用户输入的英文艺术文本翻译成中文。保留专业术语，人名保留英文或标准音译。不要输出任何解释。' },
            { role: 'user', content: text }
        ];
    }

    try {
      const response = await fetch(SILICONFLOW_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SILICONFLOW_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: currentModel,
          messages: messages,
          temperature: 0.3,
          max_tokens: 512,
          stream: false
        }),
      });

      if (!response.ok) {
          // const errText = await response.text();
          // console.warn(`Model ${currentModel} failed: ${response.status}`);
          throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      if (data.choices && data.choices[0] && data.choices[0].message) {
        let content = data.choices[0].message.content.trim();
        if ((content.startsWith('"') && content.endsWith('"')) || (content.startsWith('“') && content.endsWith('”'))) {
            content = content.slice(1, -1);
        }
        return content;
      }
      throw new Error('Invalid response format');
    } catch (error) {
      retries++;
    }
  }
  return text;
}

// 批量翻译一个对象的所有字段
async function translateObjectFields(obj: any): Promise<any> {
  const fields = ['title', 'attribution', 'medium', 'provenance', 'credit_line', 'display_date'];
  const translations: any = {};
  let hasUpdates = false;

  const translationTasks = fields.map(async (field) => {
    if (obj[field] && /[a-zA-Z]/.test(obj[field])) {
         const contextMap: Record<string, string> = {
             'title': '艺术品标题',
             'attribution': '艺术家署名',
             'medium': '艺术媒介/材质',
             'provenance': '艺术品来源/流传历史',
             'credit_line': '收藏/致谢信息',
             'display_date': '创作日期'
         };
         
         // 使用 p-limit 包裹 API 调用
         const translated = await limit(() => translateWithSiliconFlow(obj[field], contextMap[field]));
         
         if (translated && translated !== obj[field]) {
             translations[field] = translated;
             hasUpdates = true;
         } else {
             translations[field] = obj[field];
         }
    } else if (obj[field]) {
        translations[field] = obj[field];
    }
  });

  await Promise.all(translationTasks);
  return hasUpdates ? translations : null;
}

async function updateDatabase(objId: any, translations: any) {
    const locale = 'zh';
    try {
        const result = await ObjectModel.updateOne(
            { _id: objId, 'translations.locale': locale },
            { $set: { 'translations.$': { locale, ...translations }, updated_at: new Date() } }
        );

        if (result.matchedCount === 0) {
            await ObjectModel.updateOne(
                { _id: objId },
                { $push: { translations: { locale, ...translations } }, $set: { updated_at: new Date() } }
            );
        }
    } catch (err) {
        console.error(`DB Update Error ${objId}:`, err);
    }
}

async function runFullTranslation() {
    try {
        await mongoose.connect(config.database.uri);
        console.log('✅ Connected to MongoDB');
        console.log(`Using User Defined Model Pool (${MODEL_POOL.length} models)`);
        console.log(`Concurrent Request Limit: ${CONCURRENCY_LIMIT}`);

        const total = await ObjectModel.countDocuments({});
        const START_INDEX = parseInt(process.env.START_INDEX || '0', 10);
        let processed = START_INDEX;

        console.log(`Starting translation from index ${START_INDEX}. Total: ${total}`);

        while (processed < total) {
            const batch = await ObjectModel.find({})
                .select('object_id title attribution medium provenance credit_line display_date translations')
                .skip(processed)
                .limit(BATCH_SIZE);
            
            if (batch.length === 0) break;

            const batchStart = Date.now();
            console.log(`Processing batch ${processed} - ${processed + batch.length}...`);

            let completedInBatch = 0;

            const results = await Promise.allSettled(batch.map(async (doc) => {
                try {
                    const translations = await translateObjectFields(doc);
                    if (translations) {
                        await updateDatabase(doc._id, translations);
                    }
                    completedInBatch++;
                    if (completedInBatch % 50 === 0) {
                        process.stdout.write('.'); // Progress dot
                    }
                } catch (e) {
                    console.error(`Error processing ${doc.object_id}`, e);
                }
            }));

            const successCount = results.filter(r => r.status === 'fulfilled').length;
            const duration = ((Date.now() - batchStart) / 1000).toFixed(1);
            
            console.log(`\n  Batch done in ${duration}s. Success: ${successCount}/${batch.length}`);

            processed += batch.length;
        }

        console.log('Done!');

    } catch (error) {
        console.error('Fatal error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

runFullTranslation().catch(console.error);
