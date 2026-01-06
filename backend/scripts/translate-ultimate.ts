import mongoose from 'mongoose';
import { config } from '../src/config';
import { ObjectModel } from '../src/models/schemas';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

// ================= 极速配置 =================
const CONCURRENCY = 300; // 总并发数 (Google ~250 + SiliconFlow ~50)
const BATCH_SIZE = 5000; // 数据库读取批次

// ================= 接口定义 =================
interface TranslationProvider {
    name: string;
    translate(text: string): Promise<string | null>;
    weight: number; // 权重/并发配额
}

// 1. Google Mirrors (主力军 - 全球轰炸模式 - 200+ 镜像)
class GoogleMirrorProvider implements TranslationProvider {
    name = 'GoogleMirror';
    weight = 80; 
    private mirrors = [
        // --- 核心 ---
        'https://translate.googleapis.com/translate_a/single',
        'https://translate.google.com/translate_a/single',
        
        // --- 自动生成的全球 ccTLD 列表 (约 180+) ---
        'https://translate.google.ac/translate_a/single', 'https://translate.google.ad/translate_a/single', 'https://translate.google.ae/translate_a/single',
        'https://translate.google.al/translate_a/single', 'https://translate.google.am/translate_a/single', 'https://translate.google.as/translate_a/single',
        'https://translate.google.at/translate_a/single', 'https://translate.google.az/translate_a/single', 'https://translate.google.ba/translate_a/single',
        'https://translate.google.be/translate_a/single', 'https://translate.google.bf/translate_a/single', 'https://translate.google.bg/translate_a/single',
        'https://translate.google.bi/translate_a/single', 'https://translate.google.bj/translate_a/single', 'https://translate.google.bs/translate_a/single',
        'https://translate.google.bt/translate_a/single', 'https://translate.google.by/translate_a/single', 'https://translate.google.ca/translate_a/single',
        'https://translate.google.cat/translate_a/single', 'https://translate.google.cc/translate_a/single', 'https://translate.google.cd/translate_a/single',
        'https://translate.google.cf/translate_a/single', 'https://translate.google.cg/translate_a/single', 'https://translate.google.ch/translate_a/single',
        'https://translate.google.ci/translate_a/single', 'https://translate.google.cl/translate_a/single', 'https://translate.google.cm/translate_a/single',
        'https://translate.google.cn/translate_a/single', 'https://translate.google.co.ao/translate_a/single', 'https://translate.google.co.bw/translate_a/single',
        'https://translate.google.co.ck/translate_a/single', 'https://translate.google.co.cr/translate_a/single', 'https://translate.google.co.id/translate_a/single',
        'https://translate.google.co.il/translate_a/single', 'https://translate.google.co.in/translate_a/single', 'https://translate.google.co.jp/translate_a/single',
        'https://translate.google.co.ke/translate_a/single', 'https://translate.google.co.kr/translate_a/single', 'https://translate.google.co.ls/translate_a/single',
        'https://translate.google.co.ma/translate_a/single', 'https://translate.google.co.mz/translate_a/single', 'https://translate.google.co.nz/translate_a/single',
        'https://translate.google.co.th/translate_a/single', 'https://translate.google.co.tz/translate_a/single', 'https://translate.google.co.ug/translate_a/single',
        'https://translate.google.co.uk/translate_a/single', 'https://translate.google.co.uz/translate_a/single', 'https://translate.google.co.ve/translate_a/single',
        'https://translate.google.co.vi/translate_a/single', 'https://translate.google.co.za/translate_a/single', 'https://translate.google.co.zm/translate_a/single',
        'https://translate.google.co.zw/translate_a/single', 'https://translate.google.com.af/translate_a/single', 'https://translate.google.com.ag/translate_a/single',
        'https://translate.google.com.ai/translate_a/single', 'https://translate.google.com.ar/translate_a/single', 'https://translate.google.com.au/translate_a/single',
        'https://translate.google.com.bd/translate_a/single', 'https://translate.google.com.bh/translate_a/single', 'https://translate.google.com.bn/translate_a/single',
        'https://translate.google.com.bo/translate_a/single', 'https://translate.google.com.br/translate_a/single', 'https://translate.google.com.bz/translate_a/single',
        'https://translate.google.com.co/translate_a/single', 'https://translate.google.com.cu/translate_a/single', 'https://translate.google.com.cy/translate_a/single',
        'https://translate.google.com.do/translate_a/single', 'https://translate.google.com.ec/translate_a/single', 'https://translate.google.com.eg/translate_a/single',
        'https://translate.google.com.et/translate_a/single', 'https://translate.google.com.fj/translate_a/single', 'https://translate.google.com.ge/translate_a/single',
        'https://translate.google.com.gh/translate_a/single', 'https://translate.google.com.gi/translate_a/single', 'https://translate.google.com.gt/translate_a/single',
        'https://translate.google.com.gy/translate_a/single', 'https://translate.google.com.hk/translate_a/single', 'https://translate.google.com.jm/translate_a/single',
        'https://translate.google.com.kh/translate_a/single', 'https://translate.google.com.kw/translate_a/single', 'https://translate.google.com.lb/translate_a/single',
        'https://translate.google.com.ly/translate_a/single', 'https://translate.google.com.mm/translate_a/single', 'https://translate.google.com.mt/translate_a/single',
        'https://translate.google.com.mx/translate_a/single', 'https://translate.google.com.my/translate_a/single', 'https://translate.google.com.na/translate_a/single',
        'https://translate.google.com.ng/translate_a/single', 'https://translate.google.com.ni/translate_a/single', 'https://translate.google.com.np/translate_a/single',
        'https://translate.google.com.om/translate_a/single', 'https://translate.google.com.pa/translate_a/single', 'https://translate.google.com.pe/translate_a/single',
        'https://translate.google.com.pg/translate_a/single', 'https://translate.google.com.ph/translate_a/single', 'https://translate.google.com.pk/translate_a/single',
        'https://translate.google.com.pr/translate_a/single', 'https://translate.google.com.py/translate_a/single', 'https://translate.google.com.qa/translate_a/single',
        'https://translate.google.com.sa/translate_a/single', 'https://translate.google.com.sb/translate_a/single', 'https://translate.google.com.sg/translate_a/single',
        'https://translate.google.com.sl/translate_a/single', 'https://translate.google.com.sv/translate_a/single', 'https://translate.google.com.tj/translate_a/single',
        'https://translate.google.com.tr/translate_a/single', 'https://translate.google.com.tw/translate_a/single', 'https://translate.google.com.ua/translate_a/single',
        'https://translate.google.com.uy/translate_a/single', 'https://translate.google.com.vc/translate_a/single', 'https://translate.google.com.vn/translate_a/single',
        'https://translate.google.cv/translate_a/single', 'https://translate.google.cz/translate_a/single', 'https://translate.google.de/translate_a/single',
        'https://translate.google.dj/translate_a/single', 'https://translate.google.dk/translate_a/single', 'https://translate.google.dm/translate_a/single',
        'https://translate.google.dz/translate_a/single', 'https://translate.google.ee/translate_a/single', 'https://translate.google.es/translate_a/single',
        'https://translate.google.fi/translate_a/single', 'https://translate.google.fm/translate_a/single', 'https://translate.google.fr/translate_a/single',
        'https://translate.google.ga/translate_a/single', 'https://translate.google.ge/translate_a/single', 'https://translate.google.gg/translate_a/single',
        'https://translate.google.gl/translate_a/single', 'https://translate.google.gm/translate_a/single', 'https://translate.google.gp/translate_a/single',
        'https://translate.google.gr/translate_a/single', 'https://translate.google.gy/translate_a/single', 'https://translate.google.hn/translate_a/single',
        'https://translate.google.hr/translate_a/single', 'https://translate.google.ht/translate_a/single', 'https://translate.google.hu/translate_a/single',
        'https://translate.google.ie/translate_a/single', 'https://translate.google.im/translate_a/single', 'https://translate.google.io/translate_a/single',
        'https://translate.google.iq/translate_a/single', 'https://translate.google.is/translate_a/single', 'https://translate.google.it/translate_a/single',
        'https://translate.google.je/translate_a/single', 'https://translate.google.jo/translate_a/single', 'https://translate.google.kg/translate_a/single',
        'https://translate.google.ki/translate_a/single', 'https://translate.google.kz/translate_a/single', 'https://translate.google.la/translate_a/single',
        'https://translate.google.li/translate_a/single', 'https://translate.google.lk/translate_a/single', 'https://translate.google.lt/translate_a/single',
        'https://translate.google.lu/translate_a/single', 'https://translate.google.lv/translate_a/single', 'https://translate.google.md/translate_a/single',
        'https://translate.google.me/translate_a/single', 'https://translate.google.mg/translate_a/single', 'https://translate.google.mk/translate_a/single',
        'https://translate.google.ml/translate_a/single', 'https://translate.google.mn/translate_a/single', 'https://translate.google.ms/translate_a/single',
        'https://translate.google.mu/translate_a/single', 'https://translate.google.mv/translate_a/single', 'https://translate.google.mw/translate_a/single',
        'https://translate.google.ne/translate_a/single', 'https://translate.google.nl/translate_a/single', 'https://translate.google.no/translate_a/single',
        'https://translate.google.nr/translate_a/single', 'https://translate.google.nu/translate_a/single', 'https://translate.google.pl/translate_a/single',
        'https://translate.google.pn/translate_a/single', 'https://translate.google.ps/translate_a/single', 'https://translate.google.pt/translate_a/single',
        'https://translate.google.ro/translate_a/single', 'https://translate.google.rs/translate_a/single', 'https://translate.google.ru/translate_a/single',
        'https://translate.google.rw/translate_a/single', 'https://translate.google.sc/translate_a/single', 'https://translate.google.se/translate_a/single',
        'https://translate.google.sh/translate_a/single', 'https://translate.google.si/translate_a/single', 'https://translate.google.sk/translate_a/single',
        'https://translate.google.sm/translate_a/single', 'https://translate.google.sn/translate_a/single', 'https://translate.google.so/translate_a/single',
        'https://translate.google.sr/translate_a/single', 'https://translate.google.st/translate_a/single', 'https://translate.google.td/translate_a/single',
        'https://translate.google.tg/translate_a/single', 'https://translate.google.tl/translate_a/single', 'https://translate.google.tm/translate_a/single',
        'https://translate.google.tn/translate_a/single', 'https://translate.google.to/translate_a/single', 'https://translate.google.tt/translate_a/single',
        'https://translate.google.us/translate_a/single', 'https://translate.google.vg/translate_a/single', 'https://translate.google.vu/translate_a/single',
        'https://translate.google.ws/translate_a/single',

        // --- 第三方/非官方镜像 (仅作为补充) ---
        'https://translate.amz.wang/translate_a/single', 
        'https://gfonts.aby.pub/translate_a/single',
    ];

    async translate(text: string): Promise<string | null> {
        // 随机选择一个镜像
        const mirror = this.mirrors[Math.floor(Math.random() * this.mirrors.length)];
        const params = new URLSearchParams({
            client: 'gtx', sl: 'en', tl: 'zh-CN', dt: 't', q: text
        });
        try {
            // 超时控制在 3s，快速失败
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3000);
            
            const res = await fetch(`${mirror}?${params}`, { signal: controller.signal });
            clearTimeout(timeout);
            
            if (!res.ok) return null;
            const data = await res.json();
            return data[0]?.map((i:any) => i[0]).join('') || null;
        } catch { return null; }
    }
}

// 2. SiliconFlow (特种部队)
class SiliconFlowProvider implements TranslationProvider {
    name = 'SiliconFlow';
    weight = 20; // 承担20%的并发，或专门处理长难句
    private apiKey = process.env.SILICONFLOW_API_KEY || 'sk-qfenrkobztqapseexvyynwljnincylbnywplfktfijhuviuv';
    
    async translate(text: string): Promise<string | null> {
        try {
            const res = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({
                    model: 'Qwen/Qwen2.5-7B-Instruct',
                    messages: [
                        { role: 'system', content: 'Translate to Chinese.' },
                        { role: 'user', content: text }
                    ],
                    max_tokens: 512
                }),
                timeout: 5000
            });
            if (!res.ok) return null;
            const data = await res.json();
            return data.choices?.[0]?.message?.content?.trim() || null;
        } catch { return null; }
    }
}

// ================= 调度器 =================
const googleProvider = new GoogleMirrorProvider();
const siliconProvider = new SiliconFlowProvider();

// 简单的负载均衡：随机分发，但可以根据 text 长度优化
// 策略：所有请求**同时**尝试抢占资源
// 但为了简单有效：短文本优先 Google，长文本优先 SiliconFlow，或者随机
async function dispatchTranslation(text: string): Promise<string> {
    if (!text) return '';
    
    // 策略优化：
    // 如果文本很长 (>500字符)，直接给 SiliconFlow，因为 Google GTX 对长文支持差
    if (text.length > 500) {
        const res = await siliconProvider.translate(text);
        if (res) return res;
    }

    // 默认：Google 优先，因为免费且快
    // 这里我们不做 "Google 失败再 Silicon"，因为这会增加延迟。
    // 我们做 "Race" 或者 "Load Balance"
    
    // 方案：随机选择一个 Provider 发送，如果失败了，立刻换另一个
    // 按照权重随机：80% 概率走 Google, 20% 概率走 SiliconFlow
    const rand = Math.random() * 100;
    const primary = rand < 80 ? googleProvider : siliconProvider;
    const secondary = primary === googleProvider ? siliconProvider : googleProvider;

    let res = await primary.translate(text);
    if (res) return res;

    // Primary 失败，立刻尝试 Secondary
    res = await secondary.translate(text);
    return res || text;
}

// ================= 主逻辑 (复用之前的架构) =================
const FIELDS_TO_TRANSLATE = [
    'title', 'medium', 'attribution', 'classification', 
    'sub_classification', 'visual_classification', 'department', 
    'dimensions', 'attribution_inverted'
];

async function processObject(obj: any) {
    const updates: any = {};
    let hasUpdate = false;

    // 所有的字段并行翻译！不要由一个字段阻塞另一个
    const promises = FIELDS_TO_TRANSLATE.map(async (field) => {
        if (!obj[field]) return;
        if (obj[`${field}_zh`]) return;

        const translated = await dispatchTranslation(obj[field]);
        if (translated && translated !== obj[field]) {
            updates[`${field}_zh`] = translated;
            hasUpdate = true;
        }
    });

    await Promise.all(promises);

    if (hasUpdate) {
        updates.updated_at = new Date();
        await ObjectModel.updateOne({ _id: obj._id }, { $set: updates });
    }
}

async function runUltimateTranslation() {
    await mongoose.connect(config.database.uri);
    console.log('🚀 终极并发引擎启动 (Google + SiliconFlow 并行)...');

    const totalDocs = await ObjectModel.countDocuments({});
    
    // 修正查询条件：排除空字符串，因为可能是原文为空导致的
    const query = {
        $or: [
            { title_zh: { $exists: false } },
            { title_zh: null },
            
            { medium_zh: { $exists: false } },
            { medium_zh: null },
            
            { attribution_zh: { $exists: false } },
            { attribution_zh: null },
        ]
    };
    
    let round = 1;
    while (true) {
        console.log(`\n=== 第 ${round} 轮扫描 ===`);
    const countToProcess = await ObjectModel.countDocuments(query);
        console.log(`待处理: ${countToProcess}/${totalDocs}`);

        if (countToProcess === 0) {
            console.log('🎉 所有记录已翻译完成！没有发现缺失字段的记录。');
            break;
        }

    let processed = 0;
        const startTime = Date.now();
        
        // 使用 cursor 遍历
        const cursor = ObjectModel.find(query)
            .select([...FIELDS_TO_TRANSLATE, ...FIELDS_TO_TRANSLATE.map(f => `${f}_zh`)].join(' '))
            .cursor({ batchSize: BATCH_SIZE });

        let activePromises: Promise<void>[] = [];

        for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
            const p = processObject(doc).then(() => {});
            activePromises.push(p);

            if (activePromises.length >= CONCURRENCY) {
                // 修正：为了不阻塞，我们使用批次等待 (简单可靠)
                await Promise.all(activePromises);
                processed += activePromises.length;
                activePromises = [];
                
                const elapsed = (Date.now() - startTime) / 1000;
                const rate = processed / elapsed;
                process.stdout.write(`\r[第 ${round} 轮] 已处理: ${processed} | 速度: ${rate.toFixed(1)} 文档/s`);
            }
        }
        
        // 剩余
        if (activePromises.length > 0) {
            await Promise.all(activePromises);
            processed += activePromises.length;
            const elapsed = (Date.now() - startTime) / 1000;
            const rate = processed / elapsed;
            process.stdout.write(`\r[第 ${round} 轮] 已处理: ${processed} | 速度: ${rate.toFixed(1)} 文档/s`);
        }
        
        console.log(`\n✅ 第 ${round} 轮完成！`);
        round++;
        
        // 暂停 2 秒后继续下一轮检查
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    await mongoose.disconnect();
}

runUltimateTranslation();