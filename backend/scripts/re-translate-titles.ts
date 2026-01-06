import mongoose from 'mongoose';
import { config } from '../src/config';
import { ObjectModel } from '../src/models/schemas';
import { translate as googleTranslate } from '@vitalets/google-translate-api';
import { translate as bingTranslate } from 'bing-translate-api';
import fs from 'fs';
import path from 'path';

const TARGET_LOCALE = 'zh';
const CONCURRENCY = 20;
const MAX_RETRIES = 3;
const CACHE_FILE = path.join(__dirname, '../cache.json');

// 加载缓存
const MEMORY_CACHE = new Map<string, string>();
if (fs.existsSync(CACHE_FILE)) {
    try {
        const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
        if (raw.trim()) {
            const json = JSON.parse(raw);
            for (const [k, v] of Object.entries(json)) {
                MEMORY_CACHE.set(k.toLowerCase(), v as string);
            }
            console.log(`📦 已加载缓存: ${MEMORY_CACHE.size} 条`);
        }
    } catch (e) {
        console.error('Failed to load cache:', e);
    }
}

// 翻译引擎
async function tryGoogle(text: string): Promise<string> {
    const res = await googleTranslate(text, { to: 'zh-CN' });
    return res.text;
}

async function tryBing(text: string): Promise<string> {
    const res = await bingTranslate(text, null, 'zh-Hans');
    return res.translation;
}

async function tryYoudao(text: string): Promise<string> {
    const url = `http://fanyi.youdao.com/translate?&doctype=json&type=AUTO&i=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    const json: any = await res.json();
    if (json.errorCode === 0 && json.translateResult) {
        return json.translateResult.map((seg: any[]) => seg.map(s => s.tgt).join('')).join('\n');
    }
    throw new Error('Youdao failed');
}

const ENGINES = [
    { name: 'Google', fn: tryGoogle },
    { name: 'Bing', fn: tryBing },
    { name: 'Youdao', fn: tryYoudao },
];

async function translateText(text: string, retryCount = 0): Promise<string> {
    if (!text || text.trim().length === 0) return text;
    
    const shuffled = [...ENGINES];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    for (const engine of shuffled) {
        try {
            const res = await engine.fn(text);
            // 如果翻译结果和原文相同，跳过（可能是专有名词）
            if (res.trim() === text.trim()) {
                continue;
            }
            return res.trim();
        } catch (e) {
            continue;
        }
    }

    if (retryCount < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 2000 * Math.pow(2, retryCount)));
        return await translateText(text, retryCount + 1);
    }
    
    return text; // 如果所有引擎都失败，返回原文
}

async function processBatch(objects: any[]) {
    const results = await Promise.all(objects.map(async (obj) => {
        try {
            const originalTitle = obj.title?.trim();
            if (!originalTitle) return { id: obj._id, success: false };

            // 检查缓存
            const cacheKey = originalTitle.toLowerCase();
            let translatedTitle: string;
            
            if (MEMORY_CACHE.has(cacheKey)) {
                translatedTitle = MEMORY_CACHE.get(cacheKey)!;
            } else {
                // 翻译
                translatedTitle = await translateText(originalTitle);
                
                // 如果翻译结果和原文不同，保存到缓存
                if (translatedTitle !== originalTitle) {
                    MEMORY_CACHE.set(cacheKey, translatedTitle);
                }
            }

            // 如果翻译结果和原文相同，跳过更新
            if (translatedTitle === originalTitle) {
                return { id: obj._id, success: false, reason: 'unchanged' };
            }

            const existingIndex = obj.translations?.findIndex((t: any) => t.locale === TARGET_LOCALE);
            let updateOp;

            if (existingIndex !== undefined && existingIndex >= 0) {
                updateOp = {
                    $set: {
                        [`translations.${existingIndex}.title`]: translatedTitle,
                        updated_at: new Date()
                    }
                };
            } else {
                updateOp = {
                    $push: {
                        translations: {
                            locale: TARGET_LOCALE,
                            title: translatedTitle
                        }
                    },
                    $set: { updated_at: new Date() }
                };
            }
            
            return { id: obj._id, update: updateOp, success: true, title: translatedTitle };
        } catch (error) {
            return { id: obj._id, success: false, error: (error as Error).message };
        }
    }));

    let successCount = 0;
    for (const res of results) {
        if (res.success && res.update) {
            try {
                await ObjectModel.updateOne({ _id: res.id }, res.update);
                successCount++;
            } catch (e) {
                console.error(`Failed to update ${res.id}:`, e);
            }
        }
    }
    
    return { success: successCount, total: objects.length };
}

async function reTranslateTitles() {
    try {
        await mongoose.connect(config.database.uri);
        console.log('已连接到 MongoDB');
        console.log('🔄 开始重新翻译标题...\n');

        // 查找所有有中文翻译但标题翻译等于原文的作品
        const query = {
            'translations.locale': TARGET_LOCALE,
            $expr: {
                $eq: ['$title', { $arrayElemAt: ['$translations.title', 0] }]
            }
        };
        
        const countToProcess = await ObjectModel.countDocuments(query);
        console.log(`📚 需要重新翻译的标题: ${countToProcess} 个\n`);

        if (countToProcess === 0) {
            console.log('✅ 所有标题都已正确翻译！');
            await mongoose.disconnect();
            return;
        }

        let processed = 0;
        let totalSuccess = 0;

        while (processed < countToProcess) {
            const objects = await ObjectModel.find(query)
                .select('object_id title translations')
                .limit(CONCURRENCY);

            if (objects.length === 0) break;

            const startTime = Date.now();
            const result = await processBatch(objects);
            const duration = Date.now() - startTime;
            
            totalSuccess += result.success;
            processed += objects.length;
            
            const rate = (result.success / (duration / 1000)).toFixed(1);
            process.stdout.write(`\r进度: ${processed}/${countToProcess} | 成功: ${result.success}/${objects.length} | 速率: ${rate}/s`);
            
            // 保存缓存
            try {
                const obj = Object.fromEntries(MEMORY_CACHE);
                fs.writeFileSync(CACHE_FILE, JSON.stringify(obj, null, 2));
            } catch (e) {}
            
            // 避免过快请求
            await new Promise(r => setTimeout(r, 500));
        }

        console.log(`\n\n🎉 完成！成功翻译 ${totalSuccess}/${countToProcess} 个标题`);

    } catch (error) {
        console.error('❌ 脚本错误:', error);
    } finally {
        try {
            const obj = Object.fromEntries(MEMORY_CACHE);
            fs.writeFileSync(CACHE_FILE, JSON.stringify(obj, null, 2));
        } catch (e) {}
        
        await mongoose.disconnect();
        console.log('已断开 MongoDB 连接');
    }
}

reTranslateTitles().catch(console.error);
