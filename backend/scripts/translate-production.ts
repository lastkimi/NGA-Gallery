import mongoose from 'mongoose';
import { config } from '../src/config';
import { ObjectModel } from '../src/models/schemas';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

// ================= 配置区域 =================
const CONCURRENCY = 50; // 并发数
const BATCH_SIZE = 1000; // 每次从数据库读取的批次大小 (不是API批次)
const API_ENDPOINTS = [
  'https://translate.googleapis.com/translate_a/single',
  'https://translate.google.com/translate_a/single',
  'https://translate.google.com.hk/translate_a/single',
  'https://translate.google.co.kr/translate_a/single',
  'https://translate.google.co.jp/translate_a/single',
  'https://translate.google.com.tw/translate_a/single',
  'https://translate.google.com.sg/translate_a/single',
  'https://translate.google.co.in/translate_a/single',
];

// 待翻译字段映射
const FIELDS_TO_TRANSLATE = [
    'title',
    'medium',
    'attribution',
    'classification',
    'sub_classification',
    'visual_classification',
    'department',
    'dimensions',
    'attribution_inverted'
    // 排除 provenance, credit_line, display_date
];

// ================= 字典加载 =================
let dictionary: Record<string, string> = {};

function loadDictionaries() {
    const files = [
        'top_terms.json', // 假设这里面已经是 key:value 格式，或者我们需要一个转换逻辑
        // 如果 top_terms.json 只是数组，我们需要一个这一步去生成翻译的字典文件
        // 这里为了演示，我们先假设字典为空，或者您可以提供一个 key-value 的 json
    ];
    
    // TODO: 实际运行时，建议先运行一个脚本将 top_terms.json 翻译成 top_terms_zh.json (key-value)
    // 这里简单加载一个假设存在的字典
    const dictPath = path.join(__dirname, '../data/processed/translation_dictionary.json');
    if (fs.existsSync(dictPath)) {
        try {
            dictionary = JSON.parse(fs.readFileSync(dictPath, 'utf-8'));
            console.log(`📚 已加载本地词典: ${Object.keys(dictionary).length} 条目`);
        } catch (e) {
            console.warn('⚠️ 读取词典失败:', e);
        }
    }
}

// ================= 工具函数 =================

// 单条翻译
async function translateText(text: string, endpointIndex: number): Promise<string> {
    if (!text || !text.trim()) return '';
    
    // 1. 查本地词典
    if (dictionary[text]) return dictionary[text];
    if (dictionary[text.toLowerCase()]) return dictionary[text.toLowerCase()];

    // 2. API 请求
    const apiUrl = API_ENDPOINTS[endpointIndex % API_ENDPOINTS.length];
    const params = new URLSearchParams({
        client: 'gtx',
        sl: 'en',
        tl: 'zh-CN',
        dt: 't',
        q: text
    });

    try {
        const response = await fetch(`${apiUrl}?${params}`);
        if (!response.ok) {
             // 简单的重试逻辑：换个节点试一次
             const nextUrl = API_ENDPOINTS[(endpointIndex + 1) % API_ENDPOINTS.length];
             const retryRes = await fetch(`${nextUrl}?${params}`);
             if(retryRes.ok) {
                 const data = await retryRes.json();
                 return data[0]?.map((i:any) => i[0]).join('') || text;
             }
             return text; // 失败返回原文
        }
        
        const data = await response.json();
        return data[0]?.map((i:any) => i[0]).join('') || text;
    } catch (e) {
        return text;
    }
}

// 处理单个对象
async function processObject(obj: any, threadId: number) {
    const updates: any = {};
    let hasUpdate = false;

    for (const field of FIELDS_TO_TRANSLATE) {
        // 如果没有原值，或者已经翻译过，跳过
        if (!obj[field]) continue;
        if (obj[`${field}_zh`]) continue; // 增量更新：已有翻译则跳过

        const translated = await translateText(obj[field], threadId);
        if (translated && translated !== obj[field]) {
            updates[`${field}_zh`] = translated;
            hasUpdate = true;
        }
    }

    if (hasUpdate) {
        updates.updated_at = new Date();
        await ObjectModel.updateOne({ _id: obj._id }, { $set: updates });
        return true; // 标记已更新
    }
    return false;
}

// 进度条显示
function logProgress(
    processed: number, 
    total: number, 
    startTime: number, 
    charsProcessed: number
) {
    const now = Date.now();
    const elapsed = (now - startTime) / 1000; // 秒
    const rate = charsProcessed / elapsed; // 字符/秒
    const docsPerSec = processed / elapsed;
    
    const percent = ((processed / total) * 100).toFixed(2);
    const remainingDocs = total - processed;
    const etaSeconds = remainingDocs / (docsPerSec || 1);
    
    const etaMin = Math.floor(etaSeconds / 60);
    const etaSec = Math.floor(etaSeconds % 60);

    // 清除当前行并重写
    process.stdout.write(`\r[${percent}%] 已处理: ${processed}/${total} | 速度: ${rate.toFixed(0)} 字符/s (${docsPerSec.toFixed(1)} 文档/s) | 预计剩余: ${etaMin}分${etaSec}秒`);
}

// ================= 主逻辑 =================

async function main() {
    try {
        await mongoose.connect(config.database.uri);
        console.log('✅ 数据库已连接');
        
        loadDictionaries();

        // 统计总量
        console.log('正在统计待处理文档...');
        const totalDocs = await ObjectModel.countDocuments({}); 
        // 也可以只统计未翻译的： { title_zh: { $exists: false } }
        
        console.log(`总文档数: ${totalDocs}`);
        console.log(`并发线程: ${CONCURRENCY}`);
        console.log('🚀 开始翻译任务...');

        let processedCount = 0;
        let totalCharsProcessed = 0;
        const startTime = Date.now();

        // 游标遍历，内存友好
        const cursor = ObjectModel.find({})
            .select([...FIELDS_TO_TRANSLATE, ...FIELDS_TO_TRANSLATE.map(f => `${f}_zh`)].join(' '))
            .cursor({ batchSize: BATCH_SIZE });

        let activePromises: Promise<any>[] = [];
        
        for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
            
            // 简单的流控：保持 activePromises 数量在 CONCURRENCY 以内
            const p = processObject(doc, processedCount % API_ENDPOINTS.length)
                .then((updated) => {
                    // 简单的字符数估算用于统计速度 (只算更新了的)
                    if (updated) {
                         FIELDS_TO_TRANSLATE.forEach(f => {
                             if(doc[f]) totalCharsProcessed += doc[f].length;
                         });
                    }
                });
                
            activePromises.push(p);

            // 当达到并发限制时，等待最早的一个完成（这里简化为 Promise.race 不太对，
            // 更好的做法是维护一个池，但为了简单，我们每满 CONCURRENCY 就等全部跑完一批，或者用 p-limit 库）
            // 这里手写一个简单的滑动窗口太复杂，我们用简单的批次等待策略：
            // 每积攒 CONCURRENCY 个请求，就由 Promise.all 等待一次。
            // 缺点是会有一点“波浪式”停顿，但对于爬虫类任务够用了。
            
            if (activePromises.length >= CONCURRENCY) {
                await Promise.all(activePromises);
                processedCount += activePromises.length;
                activePromises = [];
                
                // 更新进度
                logProgress(processedCount, totalDocs, startTime, totalCharsProcessed);
            }
        }

        // 处理剩余的
        if (activePromises.length > 0) {
            await Promise.all(activePromises);
            processedCount += activePromises.length;
            logProgress(processedCount, totalDocs, startTime, totalCharsProcessed);
        }

        console.log('\n\n✅ 全部任务完成！');

    } catch (e) {
        console.error('\n❌ 发生错误:', e);
    } finally {
        await mongoose.disconnect();
    }
}

main();