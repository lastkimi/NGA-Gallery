#!/usr/bin/env ts-node

/**
 * Universal Translator Tool (通用翻译工具)
 * 
 * 一个高性能、多源并发的翻译工具，支持 Google Translate Mirrors 和 AI 模型 (SiliconFlow/DeepSeek/Qwen)。
 * 支持 CLI 批量文件翻译模式和 HTTP API Server 模式。
 * 
 * Usage:
 *   1. CLI Mode:   ts-node universal-translator.ts file <input_json_file> [target_lang]
 *   2. Server Mode: ts-node universal-translator.ts server [port]
 * 
 * Author: OpenArt Team
 * License: MIT
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { URLSearchParams } from 'url';

// ================= 配置区域 (Configuration) =================

const CONFIG = {
    // 总并发数控制 (建议 50-300)
    CONCURRENCY: 200,
    
    // 自动保存间隔 (处理文件时，每多少条保存一次)
    SAVE_INTERVAL: 100,

    // SiliconFlow API Key (如有需要请替换)
    SILICONFLOW_KEY: process.env.SILICONFLOW_API_KEY || 'sk-qfenrkobztqapseexvyynwljnincylbnywplfktfijhuviuv',
    
    // 默认目标语言
    DEFAULT_TARGET_LANG: 'zh-CN',

    // 长文本阈值 (超过此长度优先使用 AI 翻译)
    LONG_TEXT_THRESHOLD: 500,
};

// ================= 接口定义 =================

interface TranslationProvider {
    name: string;
    translate(text: string, targetLang: string): Promise<string | null>;
}

// ================= 1. Google Mirror Provider =================
// 利用全球各地的 Google 翻译镜像进行负载均衡

class GoogleMirrorProvider implements TranslationProvider {
    name = 'GoogleMirror';
    
    // 镜像列表 (包含官方 ccTLD 和部分第三方代理)
    private mirrors = [
        'https://translate.googleapis.com/translate_a/single',
        'https://translate.google.com/translate_a/single',
        'https://translate.google.ac/translate_a/single', 'https://translate.google.ad/translate_a/single',
        'https://translate.google.ae/translate_a/single', 'https://translate.google.al/translate_a/single',
        'https://translate.google.am/translate_a/single', 'https://translate.google.as/translate_a/single',
        'https://translate.google.at/translate_a/single', 'https://translate.google.az/translate_a/single',
        'https://translate.google.be/translate_a/single', 'https://translate.google.bg/translate_a/single',
        'https://translate.google.bi/translate_a/single', 'https://translate.google.bj/translate_a/single',
        'https://translate.google.bs/translate_a/single', 'https://translate.google.ca/translate_a/single',
        'https://translate.google.cat/translate_a/single', 'https://translate.google.cc/translate_a/single',
        'https://translate.google.cd/translate_a/single', 'https://translate.google.cf/translate_a/single',
        'https://translate.google.ch/translate_a/single', 'https://translate.google.ci/translate_a/single',
        'https://translate.google.cl/translate_a/single', 'https://translate.google.cn/translate_a/single',
        'https://translate.google.co.id/translate_a/single', 'https://translate.google.co.il/translate_a/single',
        'https://translate.google.co.in/translate_a/single', 'https://translate.google.co.jp/translate_a/single',
        'https://translate.google.co.kr/translate_a/single', 'https://translate.google.co.th/translate_a/single',
        'https://translate.google.co.uk/translate_a/single', 'https://translate.google.com.au/translate_a/single',
        'https://translate.google.com.br/translate_a/single', 'https://translate.google.com.hk/translate_a/single',
        'https://translate.google.com.mx/translate_a/single', 'https://translate.google.com.sg/translate_a/single',
        'https://translate.google.com.tw/translate_a/single', 'https://translate.google.com.vn/translate_a/single',
        'https://translate.google.de/translate_a/single', 'https://translate.google.es/translate_a/single',
        'https://translate.google.fr/translate_a/single', 'https://translate.google.it/translate_a/single',
        'https://translate.google.ru/translate_a/single', 'https://translate.google.us/translate_a/single',
        // 第三方
        'https://translate.amz.wang/translate_a/single', 
        'https://gfonts.aby.pub/translate_a/single',
    ];

    async translate(text: string, targetLang: string): Promise<string | null> {
        // 随机选择一个镜像
        const mirror = this.mirrors[Math.floor(Math.random() * this.mirrors.length)];
        const params = new URLSearchParams({
            client: 'gtx',
            sl: 'auto',
            tl: targetLang,
            dt: 't',
            q: text
        });

        try {
            // 超时控制在 3s，快速失败以便重试或切换
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3000);
            
            const res = await fetch(`${mirror}?${params}`, { 
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            clearTimeout(timeout);
            
            if (!res.ok) return null;
            const data: any = await res.json();
            // Google 返回格式: [[["翻译结果", "原文", ...], ...], ...]
            return data[0]?.map((i:any) => i[0]).join('') || null;
        } catch (e) { 
            return null; 
        }
    }
}

// ================= 2. SiliconFlow Provider (AI) =================
// 适合高质量、长难句翻译

class SiliconFlowProvider implements TranslationProvider {
    name = 'SiliconFlow';
    private apiKey = CONFIG.SILICONFLOW_KEY;
    
    async translate(text: string, targetLang: string): Promise<string | null> {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000); // AI 允许更长超时

            const res = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({
                    model: 'Qwen/Qwen2.5-7B-Instruct', // 使用性价比高的模型
                    messages: [
                        { role: 'system', content: `Translate the following text to ${targetLang}. Only output the translated text, no explanations.` },
                        { role: 'user', content: text }
                    ],
                    max_tokens: 1024,
                    temperature: 0.3
                }),
                signal: controller.signal
            });
            clearTimeout(timeout);

            if (!res.ok) return null;
            const data: any = await res.json();
            return data.choices?.[0]?.message?.content?.trim() || null;
        } catch { return null; }
    }
}

// ================= 调度器 (Scheduler) =================

class TranslationScheduler {
    private google = new GoogleMirrorProvider();
    private silicon = new SiliconFlowProvider();

    async translate(text: string, targetLang: string = CONFIG.DEFAULT_TARGET_LANG): Promise<string> {
        if (!text || !text.trim()) return text;

        // 策略 1: 长文本优先 AI
        if (text.length > CONFIG.LONG_TEXT_THRESHOLD) {
            const res = await this.silicon.translate(text, targetLang);
            if (res) return res;
            // AI 失败降级到 Google
            const fallback = await this.google.translate(text, targetLang);
            return fallback || text;
        }

        // 策略 2: 混合负载均衡 (80% Google, 20% AI)
        // AI 用量有限或较慢，Google 免费且快
        const rand = Math.random() * 100;
        const useAI = rand > 80; 

        if (useAI) {
             const res = await this.silicon.translate(text, targetLang);
             if (res) return res;
             // 失败回退
             const fallback = await this.google.translate(text, targetLang);
             return fallback || text;
        } else {
             const res = await this.google.translate(text, targetLang);
             if (res) return res;
             // 失败回退
             const fallback = await this.silicon.translate(text, targetLang);
             return fallback || text;
        }
    }
}

// ================= 模式: CLI 文件处理 =================

async function runFileMode(filePath: string, targetLang: string) {
    console.log(`📂 打开文件: ${filePath}`);
    console.log(`🎯 目标语言: ${targetLang}`);
    
    if (!fs.existsSync(filePath)) {
        console.error('❌ 文件不存在');
        process.exit(1);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    let data: any[];
    
    try {
        data = JSON.parse(content);
        if (!Array.isArray(data)) {
            // 如果是对象，尝试包装成数组
            data = [data]; 
        }
    } catch (e) {
        console.error('❌ 文件格式错误: 必须是 JSON 数组或对象');
        process.exit(1);
    }

    const scheduler = new TranslationScheduler();
    const total = data.length;
    let processed = 0;
    const startTime = Date.now();
    let activePromises: Promise<void>[] = [];

    // 假设我们需要翻译对象中的所有字符串值，或者特定的 Key
    // 为了通用性，这里简化为：递归查找所有名为 'text', 'title', 'description', 'content' 的字段，或者用户指定
    // 这里默认只翻译特定的通用字段，实际使用可修改
    const TARGET_FIELDS = ['title', 'description', 'content', 'text', 'caption', 'name'];

    const processItem = async (item: any) => {
        const tasks: Promise<void>[] = [];

        for (const key of Object.keys(item)) {
            if (TARGET_FIELDS.includes(key) && typeof item[key] === 'string' && item[key].trim()) {
                // 如果已经有 _zh 或 _translated 后缀的字段，跳过? 
                // 这里为了简单，直接覆盖或添加 _translated
                const targetKey = `${key}_translated`;
                if (item[targetKey]) continue;

                tasks.push((async () => {
                    const translated = await scheduler.translate(item[key], targetLang);
                    if (translated && translated !== item[key]) {
                        item[targetKey] = translated;
                    }
                })());
            }
        }
        await Promise.all(tasks);
    };

    console.log(`🚀 开始处理 ${total} 条数据，并发数: ${CONFIG.CONCURRENCY}...`);

    for (let i = 0; i < total; i++) {
        const p = processItem(data[i]).then(() => {
            processed++;
            const elapsed = (Date.now() - startTime) / 1000;
            const rate = processed / elapsed;
            if (processed % 10 === 0) {
                process.stdout.write(`\r✅ 进度: ${processed}/${total} | 速度: ${rate.toFixed(1)} ops`);
            }
        });

        activePromises.push(p);

        if (activePromises.length >= CONFIG.CONCURRENCY) {
            await Promise.race(activePromises);
            // 清理已完成
            // 简单做法：等待当前批次的一小部分，或者直接 Promise.all 一批 (为了代码简单，这里用批处理逻辑)
            // 更好的做法是维护一个 Set，但为了单文件简单性，我们每 BATCH 个等待一下
        }
        
        // 简单流控：每隔 CONCURRENCY 个任务，彻底等待一次，防止内存爆炸
        if (activePromises.length >= CONFIG.CONCURRENCY) {
             await Promise.all(activePromises);
             activePromises = [];
             
             // 自动保存快照
             if (processed % CONFIG.SAVE_INTERVAL === 0) {
                 const newPath = filePath.replace('.json', '_translated.json');
                 fs.writeFileSync(newPath, JSON.stringify(data, null, 2));
             }
        }
    }

    await Promise.all(activePromises);
    
    const outPath = filePath.replace('.json', '_translated.json');
    fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
    console.log(`\n🎉 完成! 结果已保存至: ${outPath}`);
}

// ================= 模式: HTTP Server =================

function runServerMode(port: number) {
    const scheduler = new TranslationScheduler();
    
    const server = http.createServer(async (req, res) => {
        const url = new URL(req.url || '', `http://${req.headers.host}`);
        
        // 允许跨域
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        if (url.pathname === '/translate' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const { text, target_lang } = JSON.parse(body);
                    if (!text) {
                        res.writeHead(400);
                        res.end(JSON.stringify({ error: 'Missing text' }));
                        return;
                    }

                    const result = await scheduler.translate(text, target_lang || CONFIG.DEFAULT_TARGET_LANG);
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        original: text, 
                        translated: result,
                        provider: text.length > CONFIG.LONG_TEXT_THRESHOLD ? 'HighPerf-Mix' : 'Fast-Mix'
                    }));
                } catch (e) {
                    res.writeHead(500);
                    res.end(JSON.stringify({ error: 'Internal Server Error' }));
                }
            });
        } else {
            res.writeHead(404);
            res.end(JSON.stringify({ status: 'Not Found' }));
        }
    });

    server.listen(port, () => {
        console.log(`🌍 翻译服务已启动: http://localhost:${port}`);
        console.log(`📝 测试命令: curl -X POST http://localhost:${port}/translate -d '{"text":"Hello world"}'`);
    });
}

// ================= 入口 (Entry Point) =================

function main() {
    const args = process.argv.slice(2);
    const mode = args[0];

    if (mode === 'file') {
        const filePath = args[1];
        const lang = args[2] || CONFIG.DEFAULT_TARGET_LANG;
        if (!filePath) {
            console.error('Usage: file <path> [lang]');
            return;
        }
        runFileMode(filePath, lang);
    } else if (mode === 'server') {
        const port = parseInt(args[1] || '3000', 10);
        runServerMode(port);
    } else {
        console.log('Universal Translator Tool');
        console.log('Usage:');
        console.log('  ts-node universal-translator.ts file <path.json> [zh-CN]');
        console.log('  ts-node universal-translator.ts server [3000]');
    }
}

main();
