import mongoose from 'mongoose';
import { config } from '../src/config';
import { ObjectModel } from '../src/models/schemas';
import fetch from 'node-fetch';
import pLimit from 'p-limit';

// --- Configuration ---
const LIBRETRANSLATE_API_URL = 'http://localhost:5050/translate';

// LibreTranslate 默认支持批量输入 (API文档: q can be a string or array of strings)
// 为了在 30 分钟内完成 (14.4万条)，我们需要每分钟处理 4800 条，即每秒 80 条
// 策略：每批 32 个字符串，并发 50 个请求
const BATCH_SIZE_PER_REQUEST = 32; 
const CONCURRENCY_LIMIT = 50; 
const MAX_RETRIES = 3;

// 并发限制
const limit = pLimit(CONCURRENCY_LIMIT);

// 批量翻译函数：输入字符串数组，输出翻译后的字符串数组
async function translateBatchWithLibre(texts: string[]): Promise<string[]> {
    if (!texts || texts.length === 0) return [];
    
    let retries = 0;
    while (retries < MAX_RETRIES) {
        try {
            const response = await fetch(LIBRETRANSLATE_API_URL, {
                method: 'POST',
                body: JSON.stringify({
                    q: texts, // 传入数组
                    source: "en",
                    target: "zh",
                    format: "text"
                }),
                headers: { "Content-Type": "application/json" },
                timeout: 30000 // 30s
            });

            if (!response.ok) {
                 throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();
            // 响应格式: { translatedText: ["...","..."] }
            if (data.translatedText && Array.isArray(data.translatedText)) {
                return data.translatedText;
            }
            throw new Error('Invalid response format');
        } catch (error) {
            retries++;
            // 简单指数退避
            await new Promise(r => setTimeout(r, 200 * retries));
        }
    }
    return texts; // 失败则返回原文
}

// 主逻辑
async function runLibreTranslation() {
    try {
        await mongoose.connect(config.database.uri);
        console.log('✅ Connected to MongoDB');
        console.log(`Using LibreTranslate Batch Mode at ${LIBRETRANSLATE_API_URL}`);
        console.log(`Batch Size: ${BATCH_SIZE_PER_REQUEST}, Concurrency: ${CONCURRENCY_LIMIT}`);

        const total = await ObjectModel.countDocuments({});
        console.log(`Total documents to process: ${total}`);
        
        // 我们需要按文档读取，然后收集字段，打包发送
        const cursor = ObjectModel.find({})
            .select('object_id title attribution medium provenance credit_line display_date translations')
            .cursor({ batchSize: 2000 });

        let processedDocs = 0;
        let processedItems = 0; // 实际翻译的字段数
        let startTime = Date.now();
        
        let docBuffer: any[] = [];
        const tasks: Promise<void>[] = [];

        const processDocBuffer = async (docs: any[]) => {
            if (docs.length === 0) return;

            // 1. 提取所有需要翻译的文本
            const allTexts: string[] = [];
            const meta: { doc: any, field: string, index: number }[] = [];
            
            docs.forEach(doc => {
                 ['title', 'attribution', 'medium', 'provenance', 'credit_line', 'display_date'].forEach(field => {
                    const text = doc[field];
                    if (text && typeof text === 'string' && text.trim().length > 0 && /[a-zA-Z]/.test(text)) {
                        meta.push({ doc, field, index: allTexts.length });
                        allTexts.push(text);
                    }
                 });
            });

            if (allTexts.length === 0) {
                processedDocs += docs.length;
                return;
            }

            // 2. 将文本再切分为 BATCH_SIZE_PER_REQUEST 的小批次
            const chunks: string[][] = [];
            for (let i = 0; i < allTexts.length; i += BATCH_SIZE_PER_REQUEST) {
                chunks.push(allTexts.slice(i, i + BATCH_SIZE_PER_REQUEST));
            }

            // 3. 并行请求 API
            await limit(async () => {
                const results = await Promise.all(chunks.map(chunk => translateBatchWithLibre(chunk)));
                // results 是 [ ["trans1", "trans2"], ["trans3"] ...]

                const flatResults = results.flat();

                // 4. 将翻译结果回填到 Map 中，按 doc 分组
                const updatesByDocId = new Map<string, any>();
                
                flatResults.forEach((translatedText, i) => {
                    const info = meta[i]; // 对应元数据
                    if (info && translatedText !== info.doc[info.field]) {
                         const docId = info.doc._id.toString();
                         if (!updatesByDocId.has(docId)) {
                             updatesByDocId.set(docId, {});
                         }
                         updatesByDocId.get(docId)[info.field] = translatedText;
                    }
                });

                // 5. 批量更新数据库 (BulkWrite)
                if (updatesByDocId.size > 0) {
                     const bulkOps = Array.from(updatesByDocId.entries()).map(([docId, translations]) => ({
                         updateOne: {
                             filter: { _id: docId },
                             update: { 
                                 $push: { translations: { locale: 'zh', ...translations } },
                                 $set: { updated_at: new Date() }
                             }
                         }
                     }));
                     await ObjectModel.bulkWrite(bulkOps);
                }

                processedDocs += docs.length;
                processedItems += allTexts.length;
                
                if (processedDocs % 100 === 0) {
                    const elapsed = (Date.now() - startTime) / 1000;
                    const docSpeed = (processedDocs / elapsed).toFixed(1);
                    const itemSpeed = (processedItems / elapsed).toFixed(1);
                    process.stdout.write(`\rDocs: ${processedDocs} | Items: ${processedItems} | Speed: ${docSpeed} docs/s (${itemSpeed} items/s) | Active: ${limit.activeCount}   `);
                }
            });
        };

        // 主循环
        for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
            docBuffer.push(doc);
            if (docBuffer.length >= 100) { // 攒够 100 个文档处理一次
                tasks.push(processDocBuffer([...docBuffer]));
                docBuffer = [];
                
                // 简单的背压控制：如果堆积任务太多，稍微等一下
                if (limit.activeCount >= CONCURRENCY_LIMIT && limit.pendingCount > 50) {
                    await new Promise(r => setTimeout(r, 100));
                }
            }
        }
        
        if (docBuffer.length > 0) {
             tasks.push(processDocBuffer(docBuffer));
        }

        await Promise.all(tasks);
        console.log('\nDone!');

    } catch (error) {
        console.error('Fatal error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

runLibreTranslation().catch(console.error);
