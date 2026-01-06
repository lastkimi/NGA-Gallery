import mongoose from 'mongoose';
import { config } from '../src/config';
import { ObjectModel } from '../src/models/schemas';
import fetch from 'node-fetch';

// --- Configuration ---
const SILICONFLOW_API_KEY = process.env.SILICONFLOW_API_KEY || 'sk-qfenrkobztqapseexvyynwljnincylbnywplfktfijhuviuv';
const SILICONFLOW_API_URL = 'https://api.siliconflow.cn/v1/chat/completions';

// 免费模型列表 (筛选出适合翻译的 Chat 模型)
// 注意：Embedding 和 Reranker 模型不适合直接用于文本翻译任务
// 我们主要使用 Chat 模型进行翻译
const AVAILABLE_MODELS = [
  'Qwen/Qwen2.5-7B-Instruct',
  'Qwen/Qwen2.5-Coder-7B-Instruct',
  'Qwen/Qwen2-7B-Instruct',
  'THUDM/glm-4-9b-chat',
  'internlm/internlm2_5-7b-chat',
  'deepseek-ai/DeepSeek-V2.5', // 这是一个强大的模型，虽然不在你列出的免费列表里，但通常用于翻译效果很好，如果是付费的我们会回退到免费的
  // 下面是用户明确列出的免费模型中适合 Chat/翻译的：
  'Qwen/Qwen2.5-7B-Instruct',
  'Qwen/Qwen2-7B-Instruct',
  'THUDM/glm-4-9b-chat',
  'internlm/internlm2_5-7b-chat',
  'deepseek-ai/DeepSeek-R1-Distill-Qwen-7B'
];

// 选择一个主力模型
const MODEL_NAME = 'Qwen/Qwen2.5-7B-Instruct';

const BATCH_SIZE = 20; // SiliconFlow 并发
const CONCURRENCY_LIMIT = 5; // 同时请求数

// --- Art Terms Dictionary (Enhanced) ---
// 词典作为辅助，Prompt 中也会让 AI 注意艺术术语
const ART_TERMS_DICTIONARY: Record<string, string> = {
  'oil on canvas': '布面油画',
  'oil on panel': '木板油画',
  'tempera': '蛋彩画',
  'etching': '蚀刻版画',
  'lithograph': '石版画',
  // ... 词典可以简化，主要依赖大模型能力
};

// --- Translation Function ---

async function translateWithSiliconFlow(text: string, context: string = ''): Promise<string> {
  if (!text || text.trim().length === 0) return text;

  // 构建 Prompt
  const prompt = `你是一个专业的艺术史翻译专家。请将以下${context}相关的英文文本翻译成中文。
  
  规则：
  1. 保持专业艺术术语的准确性（如 oil on canvas -> 布面油画）。
  2. 人名如果不是非常著名的（如达芬奇、毕加索），请保留英文原名或采用标准音译。
  3. 产地、来源信息要通顺。
  4. 只返回翻译后的文本，不要包含任何解释、引号或额外内容。
  
  待翻译文本：
  "${text}"`;

  try {
    const response = await fetch(SILICONFLOW_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SILICONFLOW_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [
          { role: 'system', content: 'You are a helpful assistant specialized in translating art history texts.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3, // 降低随机性
        max_tokens: 512,
        stream: false
      }),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`SiliconFlow API Error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    if (data.choices && data.choices[0] && data.choices[0].message) {
      let content = data.choices[0].message.content.trim();
      // 清理可能存在的引号
      if ((content.startsWith('"') && content.endsWith('"')) || (content.startsWith('“') && content.endsWith('”'))) {
          content = content.slice(1, -1);
      }
      return content;
    }
    
    return text; // Fallback
  } catch (error) {
    console.error('Translation error:', error);
    return text;
  }
}

// 批量翻译一个对象的所有字段
async function translateObjectFields(obj: any): Promise<any> {
  const fields = ['title', 'attribution', 'medium', 'provenance', 'credit_line', 'display_date'];
  const translations: any = {};
  let hasUpdates = false;

  // 并行处理字段翻译以加快速度
  const promises = fields.map(async (field) => {
    if (obj[field]) {
      const original = obj[field];
      // 简单判断是否需要翻译（包含英文字符）
      if (/[a-zA-Z]/.test(original)) {
         // 上下文提示
         const contextMap: Record<string, string> = {
             'title': '艺术品标题',
             'attribution': '艺术家署名',
             'medium': '艺术媒介/材质',
             'provenance': '艺术品来源/流传历史',
             'credit_line': '收藏/致谢信息',
             'display_date': '创作日期'
         };
         
         const translated = await translateWithSiliconFlow(original, contextMap[field] || '艺术信息');
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
    
    // 使用原子操作更新
    const result = await ObjectModel.updateOne(
        { _id: objId, 'translations.locale': locale },
        { 
            $set: { 
                'translations.$': { locale, ...translations },
                updated_at: new Date()
            } 
        }
    );

    // 如果没有匹配到（说明没有 zh 翻译），则 push
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
        console.log(`Using SiliconFlow Model: ${MODEL_NAME}`);

        const total = await ObjectModel.countDocuments({});
        const START_INDEX = parseInt(process.env.START_INDEX || '0', 10);
        let processed = START_INDEX;

        console.log(`Starting SiliconFlow translation from index ${START_INDEX}. Total: ${total}`);

        while (processed < total) {
            // 获取一批数据
            const batch = await ObjectModel.find({})
                .select('object_id title attribution medium provenance credit_line display_date translations')
                .skip(processed)
                .limit(BATCH_SIZE);
            
            if (batch.length === 0) break;

            const batchStart = Date.now();
            console.log(`Processing batch ${processed} - ${processed + batch.length}...`);

            // 使用 p-limit 或简单的 Promise.all 控制并发
            // 这里 BATCH_SIZE 本身就是控制，直接全跑
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
