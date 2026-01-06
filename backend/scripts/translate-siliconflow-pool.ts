import mongoose from 'mongoose';
import { config } from '../src/config';
import { ObjectModel } from '../src/models/schemas';
import fetch from 'node-fetch';

// --- Configuration ---
const SILICONFLOW_API_KEY = process.env.SILICONFLOW_API_KEY || 'sk-qfenrkobztqapseexvyynwljnincylbnywplfktfijhuviuv';
const SILICONFLOW_API_URL = 'https://api.siliconflow.cn/v1/chat/completions';

// 模型池：包含用户提供的所有支持对话/文本生成的模型
// 注意：移除了 Embedding 和 Reranker 模型，因为它们无法生成文本（翻译），只能输出向量数字。
// 如果强制使用 Embedding 模型进行 chat/completions 调用，API 会报错。
const MODEL_POOL = [
  'tencent/Hunyuan-MT-7B', // 专门的翻译模型，可能效果最好/速度最快
  'Qwen/Qwen2.5-7B-Instruct',
  'Qwen/Qwen2.5-Coder-7B-Instruct',
  'Qwen/Qwen2-7B-Instruct',
  'THUDM/glm-4-9b-chat',
  'THUDM/GLM-4-9B-0414',
  'THUDM/GLM-4.1V-9B-Thinking',
  'THUDM/GLM-Z1-9B-0414',
  'internlm/internlm2_5-7b-chat',
  'deepseek-ai/DeepSeek-R1-Distill-Qwen-7B',
  'deepseek-ai/DeepSeek-R1-0528-Qwen3-8B',
  // 'Qwen/Qwen3-8B', // 如果 API 支持则保留，通常 Qwen2.5 是最新的
];

const BATCH_SIZE = 50; // 提高并发，利用多模型池
const MAX_RETRIES = 3;

// 轮询计数器
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
    const currentModel = getNextModel(); // 每次重试或请求都轮换模型

    // 构建 Prompt
    // 针对 Hunyuan-MT 这种专门翻译模型，Prompt 可以更直接
    const isMTModel = currentModel.includes('Hunyuan-MT');
    
    let messages = [];
    if (isMTModel) {
        // 专门翻译模型通常只需要 user 输入
        messages = [
            { role: 'user', content: `将下面的艺术文本翻译成中文：\n${text}` }
        ];
    } else {
        // 通用 Chat 模型
        messages = [
            { role: 'system', content: '你是一个专业的艺术史翻译专家。请直接将用户输入的英文艺术文本翻译成中文。保留专业术语（如 oil on canvas -> 布面油画），人名保留英文或标准音译。不要输出任何解释。' },
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
          // 如果是 429 (Rate Limit) 或 5xx，我们重试
          if (response.status === 429 || response.status >= 500) {
              console.warn(`Model ${currentModel} failed with ${response.status}, retrying with next model...`);
              retries++;
              continue; 
          }
          const errText = await response.text();
          throw new Error(`API Error (${currentModel}): ${response.status} - ${errText}`);
      }

      const data = await response.json();
      if (data.choices && data.choices[0] && data.choices[0].message) {
        let content = data.choices[0].message.content.trim();
        // 清理引号
        if ((content.startsWith('"') && content.endsWith('"')) || (content.startsWith('“') && content.endsWith('”'))) {
            content = content.slice(1, -1);
        }
        return content;
      }
      
      throw new Error('Invalid response format');

    } catch (error) {
      console.warn(`Translation error with ${currentModel}:`, error);
      retries++;
      if (retries >= MAX_RETRIES) return text; // 最终失败返回原文
    }
  }
  return text;
}

// 批量翻译一个对象的所有字段
async function translateObjectFields(obj: any): Promise<any> {
  const fields = ['title', 'attribution', 'medium', 'provenance', 'credit_line', 'display_date'];
  const translations: any = {};
  let hasUpdates = false;

  // 并行处理字段翻译
  const promises = fields.map(async (field) => {
    if (obj[field]) {
      const original = obj[field];
      if (/[a-zA-Z]/.test(original)) {
         const contextMap: Record<string, string> = {
             'title': '艺术品标题',
             'attribution': '艺术家署名',
             'medium': '艺术媒介/材质',
             'provenance': '艺术品来源/流传历史',
             'credit_line': '收藏/致谢信息',
             'display_date': '创作日期'
         };
         
         const translated = await translateWithSiliconFlow(original, contextMap[field]);
         if (translated && translated !== original) {
             translations[field] = translated;
             hasUpdates = true;
         } else {
             translations[field] = original;
         }
      } else {
          translations[field] = original;
      }
    }
  });

  await Promise.all(promises);
  return hasUpdates ? translations : null;
}

async function updateDatabase(objId: any, translations: any) {
    const locale = 'zh';
    const result = await ObjectModel.updateOne(
        { _id: objId, 'translations.locale': locale },
        { 
            $set: { 
                'translations.$': { locale, ...translations },
                updated_at: new Date()
            } 
        }
    );

    if (result.matchedCount === 0) {
        await ObjectModel.updateOne(
            { _id: objId },
            { 
                $push: { translations: { locale, ...translations } },
                $set: { updated_at: new Date() }
            }
        );
    }
}

async function runFullTranslation() {
    try {
        await mongoose.connect(config.database.uri);
        console.log('✅ Connected to MongoDB');
        console.log(`Model Pool Size: ${MODEL_POOL.length}`);
        console.log('Models:', MODEL_POOL.join(', '));

        const total = await ObjectModel.countDocuments({});
        const START_INDEX = parseInt(process.env.START_INDEX || '0', 10);
        let processed = START_INDEX;

        console.log(`Starting SiliconFlow translation from index ${START_INDEX}. Total: ${total}`);

        while (processed < total) {
            const batch = await ObjectModel.find({})
                .select('object_id title attribution medium provenance credit_line display_date translations')
                .skip(processed)
                .limit(BATCH_SIZE);
            
            if (batch.length === 0) break;

            const batchStart = Date.now();
            console.log(`Processing batch ${processed} - ${processed + batch.length}...`);

            const results = await Promise.allSettled(batch.map(async (doc) => {
                try {
                    const translations = await translateObjectFields(doc);
                    if (translations) {
                        await updateDatabase(doc._id, translations);
                    }
                } catch (e) {
                    console.error(`Error processing ${doc.object_id}`, e);
                }
            }));

            const successCount = results.filter(r => r.status === 'fulfilled').length;
            const duration = ((Date.now() - batchStart) / 1000).toFixed(1);
            
            console.log(`  Batch done in ${duration}s. Success: ${successCount}/${batch.length}`);

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
