import mongoose from 'mongoose';
import { config } from '../src/config';
import { ObjectModel } from '../src/models/schemas';
import fetch from 'node-fetch';
import pLimit from 'p-limit';
import http from 'http';
import https from 'https';

// --- Configuration ---
const SILICONFLOW_API_KEY = process.env.SILICONFLOW_API_KEY || 'sk-qfenrkobztqapseexvyynwljnincylbnywplfktfijhuviuv';
const SILICONFLOW_API_URL = 'https://api.siliconflow.cn/v1/chat/completions';

const MODEL_POOL = [
  'tencent/Hunyuan-MT-7B', // 聚合翻译首选
  'Qwen/Qwen2.5-7B-Instruct',
  'THUDM/glm-4-9b-chat',
  'internlm/internlm2_5-7b-chat',
  'deepseek-ai/DeepSeek-R1-Distill-Qwen-7B',
  'Qwen/Qwen2.5-Coder-7B-Instruct',
  'THUDM/GLM-4-9B-0414',
  'THUDM/glm-4-9b-chat',
  'Qwen/Qwen2-7B-Instruct',
  // 排除 Embedding/Reranker，因为它们不适合处理复杂的聚合指令
];

// --- 批量聚合设置 ---
// 策略：一次 API 调用翻译 10 个对象的字段
// 优点：大幅减少 HTTP 请求数 (1/10)，降低网络开销，提高 Token 利用率
// 风险：单个请求变大，处理时间变长，需平衡并发
const BATCH_SIZE_PER_REQUEST = 10; 
const CONCURRENCY_LIMIT = 200; // 并发请求数 (200 * 10 = 2000 items/sec 理论值)
const MAX_RETRIES = 5;

const limit = pLimit(CONCURRENCY_LIMIT);
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: CONCURRENCY_LIMIT + 100 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: CONCURRENCY_LIMIT + 100 });

let modelIndex = 0;
function getNextModel() {
  const model = MODEL_POOL[modelIndex % MODEL_POOL.length];
  modelIndex++;
  return model;
}

// --- Translation Function ---

// 将多个文本聚合为一个 Prompt
// 输入: Array<{ id: string, text: string, context: string }>
// 输出: Map<id, translatedText>
async function translateBatchWithSiliconFlow(items: { id: string, text: string, context: string }[]): Promise<Map<string, string>> {
  if (items.length === 0) return new Map();

  const resultMap = new Map<string, string>();
  
  // 构建 JSON 结构的 Prompt，要求模型返回 JSON
  const promptInput = items.map(item => ({ id: item.id, text: item.text, context: item.context }));
  
  const prompt = `你是一个专业的艺术史翻译专家。请将以下 JSON 数组中的英文文本翻译成中文。
  
  要求：
  1. 保持 JSON 结构不变，只翻译 "text" 字段的内容。
  2. 保持专业术语准确（如 oil on canvas -> 布面油画）。
  3. 不要输出任何解释或 Markdown 代码块，直接返回合法的 JSON 数组。
  
  输入数据：
  ${JSON.stringify(promptInput)}
  `;

  let retries = 0;
  while (retries < MAX_RETRIES) {
    const currentModel = getNextModel();
    
    try {
      const response = await fetch(SILICONFLOW_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SILICONFLOW_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: currentModel,
          messages: [
             { role: 'system', content: 'You are a translator. Output only valid JSON.' },
             { role: 'user', content: prompt }
          ],
          temperature: 0.1, // 低温度保证 JSON 格式稳定
          max_tokens: 4096, // 增加 Token 上限以容纳批量结果
          stream: false,
          response_format: { type: "json_object" } // 尝试强制 JSON 模式（部分模型支持）
        }),
        agent: SILICONFLOW_API_URL.startsWith('https') ? httpsAgent : httpAgent,
        timeout: 60000 // 增加超时到 60s
      });

      if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      let content = data.choices?.[0]?.message?.content?.trim();
      
      if (!content) throw new Error('Empty response');

      // 清理 Markdown 代码块标记
      content = content.replace(/```json/g, '').replace(/```/g, '').trim();

      // 解析 JSON
      let parsed;
      try {
          parsed = JSON.parse(content);
          // 兼容可能的包裹结构 { "translations": [...] } 或直接 [...]
          if (!Array.isArray(parsed) && parsed.translations) {
              parsed = parsed.translations;
          }
      } catch (e) {
          // 尝试修复常见 JSON 错误或重试
          throw new Error('JSON Parse Error');
      }

      if (Array.isArray(parsed)) {
          parsed.forEach((item: any) => {
              if (item.id && item.text) {
                  resultMap.set(item.id, item.text);
              }
          });
          return resultMap; // 成功返回
      }
      
      throw new Error('Invalid JSON structure');

    } catch (error) {
      // console.warn(`Batch failed with ${currentModel}, retrying...`);
      retries++;
    }
  }
  
  return resultMap; // 失败返回空 Map
}

// 批量翻译一个对象的所有字段 (不再使用，由 flushBuffer 接管)
// async function translateObjectFields...

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

// 主逻辑
async function runBatchTranslation() {
    try {
        await mongoose.connect(config.database.uri);
        console.log('✅ Connected to MongoDB');
        console.log(`Mode: Batch Processing (Size: ${BATCH_SIZE_PER_REQUEST})`);
        console.log(`Concurrent Request Limit: ${CONCURRENCY_LIMIT}`);

        const total = await ObjectModel.countDocuments({});
        const START_INDEX = parseInt(process.env.START_INDEX || '0', 10);
        
        console.log(`Starting Batch Translation from index ${START_INDEX}. Total: ${total}`);

        const cursor = ObjectModel.find({})
            .select('object_id title attribution medium provenance credit_line display_date translations')
            .skip(START_INDEX)
            .cursor({ batchSize: 2000 });

        let buffer: any[] = [];
        const tasks: Promise<void>[] = [];
        let completedCount = 0;
        let startTime = Date.now();

        // 刷新缓冲区函数
        const flushBuffer = async (items: any[]) => {
            if (items.length === 0) return;

            await limit(async () => {
                // 1. 提取所有需要翻译的字段
                const batchItems: { id: string, text: string, context: string, docId: string, field: string }[] = [];
                
                items.forEach(doc => {
                    const fields = ['title', 'attribution', 'medium', 'provenance', 'credit_line', 'display_date'];
                    fields.forEach(field => {
                        if (doc[field] && /[a-zA-Z]/.test(doc[field])) {
                            batchItems.push({
                                id: `${doc._id}_${field}`, // 唯一标识
                                text: doc[field],
                                context: field,
                                docId: doc._id,
                                field: field
                            });
                        }
                    });
                });

                if (batchItems.length === 0) {
                    completedCount += items.length;
                    return;
                }

                // 2. 分割为 API 请求批次 (BATCH_SIZE_PER_REQUEST)
                // 这里我们再次切分，因为一次 API 不能太大
                const apiChunks = [];
                for (let i = 0; i < batchItems.length; i += BATCH_SIZE_PER_REQUEST) {
                    apiChunks.push(batchItems.slice(i, i + BATCH_SIZE_PER_REQUEST));
                }

                // 3. 并行调用 API
                await Promise.all(apiChunks.map(async (chunk) => {
                    const translations = await translateBatchWithSiliconFlow(chunk);
                    
                    // 4. 组装结果并更新数据库
                    // 注意：这里需要按文档归组更新，避免对同一文档多次写入冲突
                    const updatesByDocId = new Map<string, any>();
                    
                    chunk.forEach(item => {
                        const translatedText = translations.get(item.id);
                        if (translatedText) {
                            if (!updatesByDocId.has(item.docId)) {
                                updatesByDocId.set(item.docId, {});
                            }
                            updatesByDocId.get(item.docId)[item.field] = translatedText;
                        }
                    });

                    // 执行 DB 更新
                    await Promise.all(Array.from(updatesByDocId.entries()).map(async ([docId, trans]) => {
                        await updateDatabase(docId, trans);
                    }));
                }));

                completedCount += items.length;
                if (completedCount % 50 === 0) {
                    const elapsed = (Date.now() - startTime) / 1000;
                    const speed = (completedCount / elapsed).toFixed(1);
                    process.stdout.write(`\rProcessed: ${completedCount} | Speed: ${speed} items/sec | Active: ${limit.activeCount}   `);
                }
            });
        };

        for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
            buffer.push(doc);
            
            // 每凑齐 50 个文档（或者更少，取决于想聚合多少字段），就发起一批处理
            // 注意：这里是文档数，不是 API 请求数。flushBuffer 内部会再拆分。
            if (buffer.length >= 50) { 
                tasks.push(flushBuffer([...buffer]));
                buffer = [];
            }
        }

        // 处理剩余
        if (buffer.length > 0) {
            tasks.push(flushBuffer(buffer));
        }

        await Promise.all(tasks);
        console.log('\nDone!');

    } catch (error) {
        console.error('Fatal error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

runBatchTranslation().catch(console.error);
