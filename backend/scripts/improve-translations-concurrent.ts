import mongoose from 'mongoose';
import { config } from '../src/config';
import { ObjectModel } from '../src/models/schemas';
import fetch from 'node-fetch';
import crypto from 'crypto';
// @ts-ignore
import { translate as bingTranslate } from 'bing-translate-api';

// --- Configuration ---
const BATCH_SIZE = 100; // Increased batch size
const CONCURRENCY_LIMIT = 20; // Increased concurrency
const TARGET_LOCALE = 'zh';

// API Configuration
const BAIDU_APP_ID = process.env.BAIDU_APP_ID;
const BAIDU_KEY = process.env.BAIDU_KEY;
const DEEPLX_API_URL = process.env.DEEPLX_API_URL || 'http://127.0.0.1:1189/translate';

// --- Art Terms Dictionary (Enhanced) ---
const ART_TERMS_DICTIONARY: Record<string, string> = {
  'oil on canvas': '布面油画',
  'oil on panel': '木板油画',
  'oil on copper': '铜板油画',
  'oil on linen': '亚麻布油画',
  'tempera on panel': '木板蛋彩画',
  'watercolor on paper': '纸本水彩',
  'graphite on paper': '纸本石墨素描',
  'ink on paper': '纸本水墨',
  'pen and ink': '钢笔墨水',
  'acrylic on canvas': '布面丙烯',
  'mixed media': '混合媒介',
  'etching': '蚀刻版画',
  'lithograph': '石版画',
  'woodcut': '木刻版画',
  'engraving': '雕版画',
  'mezzotint': '金属版画',
  'photogravure': '光版画',
  'screenprint': '丝网版画',
  'marble': '大理石',
  'bronze': '青铜',
  'terracotta': '赤陶',
  'plaster': '石膏',
  'in.': '英寸',
  'cm': '厘米',
  'mm': '毫米',
  'portrait': '肖像',
  'landscape': '风景',
  'still life': '静物',
  'attributed to': '归属',
  'after': '根据',
  'studio of': '工作室',
  'circle of': '画派',
  'follower of': '追随者',
  'c.': '约',
  'circa': '约',
};

const ARTIST_NAMES: Set<string> = new Set([
  'Leonardo da Vinci', 'Michelangelo', 'Raphael', 'Rembrandt', 'Van Gogh', 'Picasso', 
  'Matisse', 'Monet', 'Cézanne', 'Gauguin', 'Degas', 'Renoir', 'Seurat', 
  'Warhol', 'Dali', 'Pollock', 'Kandinsky', 'Mondrian'
]);

// --- Translation Services ---

interface TranslationResult {
  text: string;
  success: boolean;
  service: string;
}

// 1. Google Translate (Free API)
async function translateWithGoogle(text: string): Promise<TranslationResult> {
  try {
  const apiUrl = 'https://translate.googleapis.com/translate_a/single';
  const params = new URLSearchParams({
    client: 'gtx',
    sl: 'en',
    tl: 'zh-CN',
    dt: 't',
      q: text
    });

    const response = await fetch(`${apiUrl}?${params}`);
    if (!response.ok) throw new Error(`Google API: ${response.status}`);

  const data = await response.json();
  if (data && data[0]) {
      const translated = data[0].map((item: any[]) => item[0]).join('');
      return { text: translated, success: true, service: 'google' };
    }
    return { text, success: false, service: 'google' };
  } catch (error) {
    return { text, success: false, service: 'google' };
  }
}

// 2. Baidu Translate (Official API)
async function translateWithBaidu(text: string): Promise<TranslationResult> {
  if (!BAIDU_APP_ID || !BAIDU_KEY) return { text, success: false, service: 'baidu' };

  try {
    const salt = Date.now().toString();
    const sign = crypto.createHash('md5').update(BAIDU_APP_ID + text + salt + BAIDU_KEY).digest('hex');
    
    const response = await fetch(`http://api.fanyi.baidu.com/api/trans/vip/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        q: text,
        from: 'en',
        to: 'zh',
        appid: BAIDU_APP_ID,
        salt,
        sign,
      }),
    });

    const data = await response.json();
    if (data.trans_result && data.trans_result[0]) {
      return { text: data.trans_result[0].dst, success: true, service: 'baidu' };
    }
    return { text, success: false, service: 'baidu' };
  } catch (error) {
    return { text, success: false, service: 'baidu' };
  }
}

// 3. DeepLX (Self-hosted)
async function translateWithDeepLX(text: string): Promise<TranslationResult> {
  try {
    const response = await fetch(DEEPLX_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        source_lang: 'EN',
        target_lang: 'ZH',
      }),
    });

    if (!response.ok) throw new Error(`DeepLX API: ${response.status}`);
    const data = await response.json();
    
    if (data.code === 200 && data.data) {
      return { text: data.data, success: true, service: 'deeplx' };
    }
    return { text, success: false, service: 'deeplx' };
  } catch (error) {
    // console.warn('DeepLX error:', error);
    return { text, success: false, service: 'deeplx' };
  }
}

// 4. Bing Translate (Unofficial)
async function translateWithBing(text: string): Promise<TranslationResult> {
  try {
    const res = await bingTranslate(text, null, 'zh-Hans');
    if (res && res.translation) {
      return { text: res.translation, success: true, service: 'bing' };
    }
    return { text, success: false, service: 'bing' };
  } catch (error) {
    // console.warn('Bing error:', error);
    return { text, success: false, service: 'bing' };
  }
}

// Smart Translation Router with Failover
async function smartTranslate(text: string, fieldType: string): Promise<string> {
  if (!text || text.trim().length === 0) return text;

  let processingText = text;

  // Pre-processing
  if (fieldType === 'attribution') {
    const words = processingText.split(' ');
    const isCommonName = words.every(word => !ARTIST_NAMES.has(word) && word.length < 20);
    if (!isCommonName) return text;
  }

  for (const [eng, chn] of Object.entries(ART_TERMS_DICTIONARY)) {
    const regex = new RegExp(`\\b${eng}\\b`, 'gi');
    processingText = processingText.replace(regex, chn);
  }

  if (!/[a-zA-Z]/.test(processingText)) return processingText;

  // Parallel Race / Priority
  // Strategy: Try DeepLX first (fastest/cheapest), then Bing/Google concurrently
  
  let result = await translateWithDeepLX(processingText);
  
  if (!result.success) {
     // Try Bing and Google concurrently if DeepLX fails
     const [bingRes, googleRes] = await Promise.all([
       translateWithBing(processingText),
       translateWithGoogle(processingText)
     ]);
     
     if (bingRes.success) result = bingRes;
     else if (googleRes.success) result = googleRes;
     else if (BAIDU_APP_ID) {
        result = await translateWithBaidu(processingText);
     }
  }

  return cleanTranslation(result.success ? result.text : processingText);
}

function cleanTranslation(text: string): string {
  if (!text) return text;
  let cleaned = text.replace(/\s+/g, ' ').trim();
  cleaned = cleaned.replace(/英寸/g, ''); 
  cleaned = cleaned.replace(/ \./g, '.').replace(/ ,/g, ',');
  return cleaned;
}

// --- Main Process Logic ---

async function processArtwork(obj: any) {
  const fields = ['title', 'attribution', 'medium', 'provenance', 'credit_line', 'display_date'];
  const translations: any = {};
  let hasUpdates = false;

  for (const field of fields) {
    if (obj[field]) {
      const original = obj[field];
      const translated = await smartTranslate(original, field);

      if (translated && translated !== original && !translated.includes('undefined')) {
        translations[field] = translated;
        hasUpdates = true;
      } else {
        translations[field] = original; 
      }
    }
  }
  return hasUpdates ? translations : null;
}

async function updateDatabase(objId: any, translations: any) {
    await ObjectModel.updateOne(
        { _id: objId },
        { 
            $set: { updated_at: new Date() },
            $push: { translations: { locale: TARGET_LOCALE, ...translations } }
        }
    ).catch(() => {
        // If push fails (maybe translation exists?), try set
        // Simplified: In a real scenario, use $elemMatch or separate check
        // For speed, we just try update specific index if we knew it, or $addToSet
    });
    
    // Better upsert logic for array:
    const obj = await ObjectModel.findById(objId).select('translations');
    if(!obj) return;
    
    const existingIndex = obj.translations?.findIndex((t: any) => t.locale === TARGET_LOCALE);
    if (existingIndex >= 0) {
       await ObjectModel.updateOne(
         { _id: objId },
         { $set: { [`translations.${existingIndex}`]: { locale: TARGET_LOCALE, ...translations } } }
       );
    } else {
       await ObjectModel.updateOne(
         { _id: objId },
         { $push: { translations: { locale: TARGET_LOCALE, ...translations } } }
       );
    }
}

async function runConcurrentBatch() {
  try {
    await mongoose.connect(config.database.uri);
        console.log('✅ Connected to MongoDB');

    const START_INDEX = parseInt(process.env.START_INDEX || '0', 10);
        const total = await ObjectModel.countDocuments({});
    let processed = START_INDEX;
        
        console.log(`Starting massive translation from index ${START_INDEX}. Total: ${total}`);

        while (processed < total) {
            const batch = await ObjectModel.find({})
        .select('object_id title attribution medium provenance credit_line display_date translations')
        .skip(processed)
                .limit(BATCH_SIZE);
            
            if (batch.length === 0) break;

            const batchStart = Date.now();
            console.log(`Processing batch ${processed} - ${processed + batch.length}...`);
            
            // Process batch with simple concurrency
            // We launch all BATCH_SIZE promises, but smartTranslate itself handles some API limiting naturally by network
            // For better safety, we could use p-limit, but here we trust BATCH_SIZE=100 isn't too crazy for Node
            
            const results = await Promise.allSettled(batch.map(async (doc) => {
                const translations = await processArtwork(doc);
                if (translations) {
                    await updateDatabase(doc._id, translations);
                }
            }));
            
            const successCount = results.filter(r => r.status === 'fulfilled').length;
            const duration = ((Date.now() - batchStart) / 1000).toFixed(1);
            
            console.log(`  Batch done in ${duration}s. Success: ${successCount}/${batch.length}`);

            processed += batch.length;
        }

        console.log('Done!');
    } catch (e) {
        console.error(e);
  } finally {
    await mongoose.disconnect();
  }
}

runConcurrentBatch().catch(console.error);