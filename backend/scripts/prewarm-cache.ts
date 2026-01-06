import { translate as googleTranslate } from '@vitalets/google-translate-api';
import { translate as bingTranslate } from 'bing-translate-api';
import fs from 'fs';
import path from 'path';

// Configuration
const CONCURRENCY = 50;
const TOP_TERMS_FILE = path.join(__dirname, '../top_terms.json');
const CACHE_FILE = path.join(__dirname, '../cache.json');

// 加载现有缓存
let MEMORY_CACHE = new Map<string, string>();
if (fs.existsSync(CACHE_FILE)) {
    try {
        const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
        if (raw.trim()) {
            const json = JSON.parse(raw);
            for (const [k, v] of Object.entries(json)) {
                MEMORY_CACHE.set(k, v as string);
            }
        }
    } catch (e) {}
}

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
    throw new Error('Youdao API failed');
}

async function tryLibreArgos(text: string): Promise<string> {
    const res = await fetch("https://translate.argosopentech.com/translate", {
        method: "POST",
        body: JSON.stringify({ q: text, source: "en", target: "zh" }),
        headers: { "Content-Type": "application/json" }
    });
    const json: any = await res.json();
    if (json.translatedText) return json.translatedText;
    throw new Error('LibreArgos failed');
}

async function tryLingva(text: string): Promise<string> {
    const res = await fetch(`https://lingva.ml/api/v1/en/zh/${encodeURIComponent(text)}`);
    const json: any = await res.json();
    if (json.translation) return json.translation;
    throw new Error('Lingva failed');
}

// 更多 LibreTranslate 镜像
async function tryLibreVern(text: string): Promise<string> {
    const res = await fetch("https://lt.vern.cc/translate", {
        method: "POST",
        body: JSON.stringify({ q: text, source: "en", target: "zh" }),
        headers: { "Content-Type": "application/json" }
    });
    const json: any = await res.json();
    if (json.translatedText) return json.translatedText;
    throw new Error('LibreVern failed');
}

const ENGINES = [
    { name: 'Google', fn: tryGoogle },
    { name: 'Bing', fn: tryBing },
    { name: 'Youdao', fn: tryYoudao },
    { name: 'LibreArgos', fn: tryLibreArgos },
    { name: 'Lingva', fn: tryLingva },
    { name: 'LibreVern', fn: tryLibreVern },
];

async function translateTextWithRetry(text: string, retryCount = 0): Promise<string> {
    const shuffled = [...ENGINES];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    for (const engine of shuffled) {
        try {
            const res = await engine.fn(text);
            if (res && res.trim().length > 0) return res;
        } catch (e) {
            continue;
        }
    }

    if (retryCount < 3) {
        await new Promise(r => setTimeout(r, 1000));
        return await translateTextWithRetry(text, retryCount + 1);
    }
    throw new Error('All engines failed');
}

async function prewarmCache() {
    console.log('🔥 开始高频词汇预热...');
    const terms = JSON.parse(fs.readFileSync(TOP_TERMS_FILE, 'utf-8'));
    console.log(`总词条数: ${terms.length}`);

    // 过滤掉已经在缓存中的
    const toTranslate = terms.filter((t: string) => !MEMORY_CACHE.has(t.toLowerCase()));
    console.log(`需翻译: ${toTranslate.length} 条 (已命中: ${terms.length - toTranslate.length})`);

    let processed = 0;
    let success = 0;

    // 分批处理
    for (let i = 0; i < toTranslate.length; i += CONCURRENCY) {
        const batch = toTranslate.slice(i, i + CONCURRENCY);
        const promises = batch.map(async (text: string) => {
            try {
                const translation = await translateTextWithRetry(text);
                MEMORY_CACHE.set(text.toLowerCase(), translation);
                return true;
            } catch (e) {
                return false;
            }
        });

        const results = await Promise.all(promises);
        success += results.filter(Boolean).length;
        processed += batch.length;

        process.stdout.write(`\rProgress: ${processed}/${toTranslate.length} | Success: ${success}`);
        
        // 保存中间结果
        const obj = Object.fromEntries(MEMORY_CACHE);
        fs.writeFileSync(CACHE_FILE, JSON.stringify(obj, null, 2));
    }

    console.log(`\n✅ 预热完成!`);
}

prewarmCache();
