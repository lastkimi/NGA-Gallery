import mongoose from 'mongoose';
import { config } from '../src/config';
import { ObjectModel } from '../src/models/schemas';
import fetch from 'node-fetch';
import pLimit from 'p-limit';
import http from 'http';

// --- Configuration ---
// 4 个容器实现负载均衡
const API_NODES = [
    'http://localhost:5050/translate',
    'http://localhost:5051/translate',
    'http://localhost:5052/translate',
    'http://localhost:5053/translate'
];

// 策略：每批 32 个字符串，并发 40 个请求 (每节点10并发)
const BATCH_SIZE_PER_REQUEST = 32; 
const CONCURRENCY_LIMIT = 40; 
const MAX_RETRIES = 5;

// 并发限制
const limit = pLimit(CONCURRENCY_LIMIT);

// HTTP Agent 复用连接，避免端口耗尽
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 200 });

let nodeIndex = 0;
function getNextNode() {
    const node = API_NODES[nodeIndex % API_NODES.length];
    nodeIndex++;
    return node;
}

async function translateBatchWithLibre(texts: string[]): Promise<string[]> {
    if (!texts || texts.length === 0) return [];
    
    let retries = 0;
    while (retries < MAX_RETRIES) {
        const apiUrl = getNextNode(); // 轮询节点
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                body: JSON.stringify({
                    q: texts,
                    source: "en",
                    target: "zh",
                    format: "text"
                }),
                headers: { "Content-Type": "application/json" },
                timeout: 60000, // 60s
                agent: httpAgent
            });

            if (!response.ok) {
                 // 可能是某个节点忙，重试会换节点
                 throw new Error(`API Error: ${response.status} from ${apiUrl}`);
            }

            const data = await response.json();
            if (data.translatedText && Array.isArray(data.translatedText)) {
                return data.translatedText;
            }
            throw new Error('Invalid response format');
        } catch (error) {
            retries++;
            // 指数退避
            await new Promise(r => setTimeout(r, 200 * retries));
        }
    }
    return texts; 
}

// 主逻辑
async function runLibreCluster() {
    try {
        await mongoose.connect(config.database.uri);
        console.log('✅ Connected to MongoDB');
        console.log(`Using LibreTranslate Cluster (${API_NODES.length} nodes)`);
        console.log(`Batch Size: ${BATCH_SIZE_PER_REQUEST}, Concurrency: ${CONCURRENCY_LIMIT}`);

        const total = await ObjectModel.countDocuments({});
        console.log(`Total documents to process: ${total}`);
        
        // 批处理读取，减少内存压力
        const cursor = ObjectModel.find({}).cursor({ batchSize: 2000 });

        let processedDocs = 0;
        let processedItems = 0; 
        let startTime = Date.now();
        
        let docBuffer: any[] = [];
        const tasks: Promise<void>[] = [];

        const processDocBuffer = async (docs: any[]) => {
            if (docs.length === 0) return;

            // 1. 提取文本
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

            // 2. 切分大批次
            const chunks: string[][] = [];
            for (let i = 0; i < allTexts.length; i += BATCH_SIZE_PER_REQUEST) {
                chunks.push(allTexts.slice(i, i + BATCH_SIZE_PER_REQUEST));
            }

            // 3. 并行请求
            await limit(async () => {
                const results = await Promise.all(chunks.map(async (chunk) => {
                    const res = await translateBatchWithLibre(chunk);
                    // console.log(`Chunk translated: ${chunk[0].substring(0, 20)}... -> ${res[0]?.substring(0, 20)}...`);
                    return res;
                }));
                const flatResults = results.flat();
                
                if (flatResults.length === 0) {
                    console.log('Warning: Empty translation results');
                }

                // 4. 回填
                const updatesByDocId = new Map<string, { id: any, updates: any }>();
                
                flatResults.forEach((translatedText, i) => {
                    const info = meta[i];
                    if (info && translatedText !== info.doc[info.field]) {
                         const docIdStr = info.doc._id.toString();
                         if (!updatesByDocId.has(docIdStr)) {
                             updatesByDocId.set(docIdStr, { id: info.doc._id, updates: {} });
                         }
                         updatesByDocId.get(docIdStr).updates[info.field] = translatedText;
                    }
                });

                // 5. BulkWrite
                if (updatesByDocId.size > 0) {
                     // console.log(`Writing ${updatesByDocId.size} updates to DB...`);
                     const bulkOps = Array.from(updatesByDocId.values()).map(({ id, updates }) => ({
                         updateOne: {
                             filter: { _id: id },
                             update: { 
                                 $push: { translations: { locale: 'zh', ...updates } },
                                 $set: { updated_at: new Date() }
                             }
                         }
                     }));
                     const result = await ObjectModel.bulkWrite(bulkOps);
                     if (result.modifiedCount > 0) {
                        // console.log(`Successfully updated ${result.modifiedCount} docs`);
                     } else {
                        console.log(`Warning: Matched ${result.matchedCount} but modified ${result.modifiedCount}`);
                     }
                     if (result.hasWriteErrors()) {
                         console.error('Bulk write errors:', result.getWriteErrors());
                     }
                } else {
                    console.log('No updates collected for this batch.');
                }

                processedDocs += docs.length;
                processedItems += allTexts.length;
                
                if (processedDocs % 200 === 0) {
                    const elapsed = (Date.now() - startTime) / 1000;
                    const docSpeed = (processedDocs / elapsed).toFixed(1);
                    const itemSpeed = (processedItems / elapsed).toFixed(1);
                    process.stdout.write(`\rProcessed Docs: ${processedDocs} | Speed: ${docSpeed} docs/s (${itemSpeed} items/s) | Active: ${limit.activeCount}   `);
                }
            });
        };

        // 增大 Buffer 以配合更大的 BatchRequest
        for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
            docBuffer.push(doc);
            if (docBuffer.length >= 200) { 
                tasks.push(processDocBuffer([...docBuffer]));
                docBuffer = [];
                
                if (limit.activeCount >= CONCURRENCY_LIMIT && limit.pendingCount > 100) {
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

runLibreCluster().catch(console.error);
