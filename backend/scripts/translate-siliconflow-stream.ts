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

// 真正的流式并发设置
// BATCH_SIZE 仅用于从数据库取数，取出来后立即丢给 pLimit 处理，不等待整个批次完成
const DB_BATCH_SIZE = 2000; 
const CONCURRENCY_LIMIT = 2000; // 极限提升至 2000 并发，以达到每秒 40+ item 的处理速度 (140000 / 3600 = ~40)
const MAX_RETRIES = 10; // 网络压力大，增加重试

// 增加 httpAgent 配置以复用连接，避免 "Too many open files" 或 DNS 问题
import http from 'http';
import https from 'https';

const httpAgent = new http.Agent({ keepAlive: true, maxSockets: CONCURRENCY_LIMIT + 100 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: CONCURRENCY_LIMIT + 100 });

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
        agent: SILICONFLOW_API_URL.startsWith('https') ? httpsAgent : httpAgent,
        timeout: 30000 // 30s 超时
      });

      if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      if (data.choices && data.choices[0] && data.choices[0].message) {
        let content = data.choices[0].message.content.trim();
        
        // 关键修复：移除 <think> 标签及其内容
        if (content.includes('<think>')) {
            content = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        }
        // 处理截断的标签
        content = content.split('</think>').pop()?.trim() || content;

        // 移除可能的 "中文翻译：" 前缀
        content = content.replace(/^(中文)?翻译[:：]\s*/, '');

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
         
         const translated = await translateWithSiliconFlow(obj[field], contextMap[field]);
         
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

// 全局计数器
let completedCount = 0;
let startTime = Date.now();

async function runStreamingTranslation() {
    try {
        await mongoose.connect(config.database.uri);
        console.log('✅ Connected to MongoDB');
        console.log(`Using Model Pool (${MODEL_POOL.length} models)`);
        console.log(`Max Concurrency: ${CONCURRENCY_LIMIT}`);

        const total = await ObjectModel.countDocuments({});
        const START_INDEX = parseInt(process.env.START_INDEX || '0', 10);
        
        console.log(`Starting Streaming Translation from index ${START_INDEX}. Total: ${total}`);

        const cursor = ObjectModel.find({})
            .select('object_id title attribution medium provenance credit_line display_date translations')
            .skip(START_INDEX)
            .cursor({ batchSize: DB_BATCH_SIZE });

        // 任务队列
        const tasks: Promise<void>[] = [];

        for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
            
            // 创建受限任务
            const task = limit(async () => {
                try {
                    const translations = await translateObjectFields(doc);
                    if (translations) {
                        await updateDatabase(doc._id, translations);
                    }
                    
                    completedCount++;
                    if (completedCount % 50 === 0) {
                        const elapsed = (Date.now() - startTime) / 1000;
                        const speed = (completedCount / elapsed).toFixed(1);
                        process.stdout.write(`\rProcessed: ${completedCount} | Speed: ${speed} items/sec | Pending: ${limit.pendingCount} | Active: ${limit.activeCount}   `);
                    }
                } catch (e) {
                    console.error(`Error processing ${doc.object_id}`, e);
                }
            });

            tasks.push(task);

            // 可选：如果积压任务过多，暂停一下读取（背压控制）
            if (limit.pendingCount > CONCURRENCY_LIMIT * 2) {
                // await new Promise(r => setTimeout(r, 100)); 
                // 由于 p-limit 已经做了限制，这里其实不需要强等待，除非内存爆了
                // 但为了不让 cursor 读太快导致 OOM，我们可以定期清理 promise 数组
                // 这里为了简化，直接依赖 p-limit 内部队列
            }
        }

        await Promise.all(tasks);
        console.log('\nDone!');

    } catch (error) {
        console.error('Fatal error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

runStreamingTranslation().catch(console.error);
