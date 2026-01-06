import mongoose from 'mongoose';
import { config } from '../src/config';
import { ObjectModel } from '../src/models/schemas';
import fetch from 'node-fetch';
import pLimit from 'p-limit';

// --- Configuration ---
const LIBRETRANSLATE_API_URL = 'http://localhost:5050/translate';
const CONCURRENCY_LIMIT = 50; // LibreTranslate 是 CPU 密集型，并发太高会卡死

// 并发限制
const limit = pLimit(CONCURRENCY_LIMIT);

async function translateWithLibre(text: string): Promise<string> {
    if (!text || text.trim().length === 0) return text;

    try {
        const response = await fetch(LIBRETRANSLATE_API_URL, {
            method: 'POST',
            body: JSON.stringify({
                q: text,
                source: "en",
                target: "zh",
                format: "text"
            }),
            headers: { "Content-Type": "application/json" }
        });

        if (!response.ok) {
             // throw new Error(`API Error: ${response.status}`);
             return text; // 失败则返回原文，不打断流程
        }

        const data = await response.json();
        return data.translatedText || text;
    } catch (error) {
        return text;
    }
}

async function translateObjectFields(obj: any): Promise<any> {
    const fields = ['title', 'attribution', 'medium', 'provenance', 'credit_line', 'display_date'];
    const translations: any = {};
    let hasUpdates = false;

    // 串行还是并行？LibreTranslate 内部可能处理不了太多并发
    // 我们在这里对单个对象的字段并行调用
    const tasks = fields.map(async (field) => {
        if (obj[field] && /[a-zA-Z]/.test(obj[field])) {
            const translated = await translateWithLibre(obj[field]);
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

    await Promise.all(tasks);
    return hasUpdates ? translations : null;
}

async function updateDatabase(objId: any, translations: any) {
    const locale = 'zh';
    try {
        await ObjectModel.updateOne(
            { _id: objId },
            { $push: { translations: { locale, ...translations } }, $set: { updated_at: new Date() } }
        );
    } catch (err) {
        console.error(`DB Update Error ${objId}:`, err);
    }
}

async function runLibreTranslation() {
    try {
        await mongoose.connect(config.database.uri);
        console.log('✅ Connected to MongoDB');
        console.log(`Using LibreTranslate at ${LIBRETRANSLATE_API_URL}`);

        const total = await ObjectModel.countDocuments({});
        let processed = 0;
        let startTime = Date.now();

        // 使用 Cursor 流式处理
        const cursor = ObjectModel.find({}).cursor();

        const tasks: Promise<void>[] = [];

        for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
            const task = limit(async () => {
                const translations = await translateObjectFields(doc);
                if (translations) {
                    await updateDatabase(doc._id, translations);
                }
                
                processed++;
                if (processed % 50 === 0) {
                    const elapsed = (Date.now() - startTime) / 1000;
                    const speed = (processed / elapsed).toFixed(1);
                    process.stdout.write(`\rProcessed: ${processed} | Speed: ${speed} items/sec | Active: ${limit.activeCount}   `);
                }
            });
            tasks.push(task);
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
