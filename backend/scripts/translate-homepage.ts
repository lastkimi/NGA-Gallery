import mongoose from 'mongoose';
import { config } from '../src/config';
import { ObjectModel } from '../src/models/schemas';
// 复制 translate-hybrid 的逻辑，因为它是作为脚本运行的，不好直接 import
import fetch from 'node-fetch';

// ================= 简化版混合翻译逻辑 =================
// 注意：为了脚本独立性，这里内联了翻译逻辑，避免 ts-node 的 import 问题

const API_ENDPOINTS = [
    'https://translate.googleapis.com/translate_a/single',
    'https://translate.google.com/translate_a/single',
    'https://translate.google.com.hk/translate_a/single',
    'https://translate.google.co.jp/translate_a/single',
    'https://translate.google.co.kr/translate_a/single',
    'https://translate.google.com.tw/translate_a/single',
    'https://translate.google.com.sg/translate_a/single',
    'https://translate.google.co.in/translate_a/single',
    'https://translate.google.de/translate_a/single',
    'https://translate.google.fr/translate_a/single',
    'https://translate.google.co.uk/translate_a/single',
    'https://translate.google.ca/translate_a/single',
    'https://translate.google.com.au/translate_a/single',
    'https://translate.google.com.br/translate_a/single',
    'https://translate.google.com.mx/translate_a/single',
    'https://translate.google.es/translate_a/single',
    'https://translate.google.it/translate_a/single',
    'https://translate.google.nl/translate_a/single',
    'https://translate.google.pl/translate_a/single',
    'https://translate.google.ru/translate_a/single'
];

async function translateText(text: string): Promise<string> {
    if (!text) return '';
    // 随机选择镜像
    const endpoint = API_ENDPOINTS[Math.floor(Math.random() * API_ENDPOINTS.length)];
    const params = new URLSearchParams({
        client: 'gtx',
        sl: 'en',
        tl: 'zh-CN',
        dt: 't',
        q: text
    });

    try {
        const response = await fetch(`${endpoint}?${params.toString()}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 5000
        });

        if (!response.ok) return text;

        const data = await response.json();
        // Google 返回的是数组的数组 [[["翻译结果","原文",null,null,1]],...]
        return data[0]?.map((item: any) => item[0]).join('') || text;
    } catch (error) {
        return text; // 失败返回原文
    }
}

const FEATURED_MASTERS = ['Gogh', 'Monet', 'Da Vinci', 'Rembrandt', 'Vermeer', 'Picasso', 'Cézanne'];
const MAIN_CLASSIFICATIONS = ['Painting', 'Sculpture', 'Drawing', 'Print', 'Photograph'];

async function translateHomepagePriority() {
    try {
        await mongoose.connect(config.database.uri);
        console.log('✅ 连接数据库...');

        // 1. Translate Featured Masters (Top Priority)
        console.log('\n--- 优先翻译首页精选大师作品 ---');
        let priorityIds = new Set<string>();

        for (const artist of FEATURED_MASTERS) {
            console.log(`正在查找大师: ${artist}...`);
            const objects = await ObjectModel.find({
                attribution: { $regex: artist, $options: 'i' },
                classification: 'Painting',
                $or: [
                    { title_zh: { $exists: false } },
                    { medium_zh: { $exists: false } }
                ]
            }).limit(20); // Translation limit per artist to ensure homepage coverage

            for (const obj of objects) {
                priorityIds.add(obj._id.toString());
            }
        }

        // 2. Translate Main Classifications (Secondary Priority)
        console.log('\n--- 优先翻译首页分类精选作品 ---');
        for (const classification of MAIN_CLASSIFICATIONS) {
             console.log(`正在查找分类: ${classification}...`);
             // Fetch objects that might be displayed on homepage (usually sorted by some criteria, here we grab a random sample or recent ones if logic matched homepage exactly)
             // Homepage logic: gets list by classification. We'll translate a batch of them.
             const objects = await ObjectModel.find({
                classification: classification,
                $or: [
                    { title_zh: { $exists: false } },
                    { medium_zh: { $exists: false } }
                ]
             }).limit(20);

             for (const obj of objects) {
                priorityIds.add(obj._id.toString());
             }
        }

        const idsToProcess = Array.from(priorityIds);
        console.log(`\n总共发现 ${idsToProcess.length} 个首页优先展示对象需要翻译。`);

        if (idsToProcess.length === 0) {
            console.log('首页优先对象已全部翻译完成！');
            return;
        }

        // Process in parallel with limit
        const CONCURRENCY = 20;
        let processed = 0;

        for (let i = 0; i < idsToProcess.length; i += CONCURRENCY) {
            const batchIds = idsToProcess.slice(i, i + CONCURRENCY);
            await Promise.all(batchIds.map(async (id) => {
                const doc = await ObjectModel.findById(id);
                if (!doc) return;

                const fieldsToTranslate: Record<string, string> = {};
                if (!doc.title_zh && doc.title) fieldsToTranslate['title'] = doc.title;
                if (!doc.medium_zh && doc.medium) fieldsToTranslate['medium'] = doc.medium;
                if (!doc.attribution_zh && doc.attribution) fieldsToTranslate['attribution'] = doc.attribution;
                if (!doc.classification_zh && doc.classification) fieldsToTranslate['classification'] = doc.classification;
                if (!doc.department_zh && doc.department) fieldsToTranslate['department'] = doc.department;

                if (Object.keys(fieldsToTranslate).length > 0) {
                     // 串行翻译字段，避免并发过高
                     const translated: Record<string, string> = {};
                     
                     for (const [key, val] of Object.entries(fieldsToTranslate)) {
                         const trans = await translateText(val);
                         if (trans && trans !== val) {
                             translated[key] = trans;
                         }
                     }
                     
                     // Update document
                     if (translated['title']) doc.title_zh = translated['title'];
                     if (translated['medium']) doc.medium_zh = translated['medium'];
                     if (translated['attribution']) doc.attribution_zh = translated['attribution'];
                     if (translated['classification']) doc.classification_zh = translated['classification'];
                     if (translated['department']) doc.department_zh = translated['department'];
                     
                     await doc.save();
                }
                processed++;
                process.stdout.write(`\r进度: ${processed}/${idsToProcess.length}`);
            }));
        }
        
        console.log('\n✅ 首页优先翻译完成！');

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

translateHomepagePriority();