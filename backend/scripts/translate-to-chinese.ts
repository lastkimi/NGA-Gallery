import mongoose from 'mongoose';
import { config } from '../src/config';
import { ObjectModel } from '../src/models/schemas';
import fetch from 'node-fetch';

// Configuration
const TARGET_LOCALE = 'zh'; // Chinese
const BATCH_SIZE = 20;
const DELAY_MS = 1000; // Rate limiting for free API

// 艺术术语词典（用于增强翻译质量）
const ART_TERMS_DICTIONARY: Record<string, string> = {
  // 媒介材料
  'oil on canvas': '布面油画',
  'oil on panel': '木板油画',
  'oil on copper': '铜板油画',
  'oil on linen': '亚麻布油画',
  'tempera on panel': '木板蛋彩画',
  'tempera on wood': '木板蛋彩画',
  'watercolor on paper': '纸本水彩',
  'graphite on paper': '纸本石墨素描',
  'chalk on paper': '纸本粉彩',
  'ink on paper': '纸本水墨',
  'pen and ink': '钢笔墨水',
  'acrylic on canvas': '布面丙烯',
  
  // 版画技术
  'etching': '蚀刻版画',
  'lithograph': '石版画',
  'woodcut': '木刻版画',
  'engraving': '雕版版画',
  'mezzotint': '金属版画',
  'drypoint': '干刻版画',
  
  // 雕塑材料
  'marble': '大理石',
  'bronze': '青铜',
  'terracotta': '陶土',
  'plaster': '石膏',
  'gilded': '镀金',
  'cast iron': '铸铁',
  'steel': '钢铁',
  'wood': '木质',
  
  // 尺寸单位
  'in.': '英寸',
  'cm.': '厘米',
  'mm.': '毫米',
  
  // 分类
  'Painting': '绘画',
  'Sculpture': '雕塑',
  'Drawing': '素描',
  'Print': '版画',
  'Photograph': '摄影',
  'Decorative Arts': '装饰艺术',
  'Architecture': '建筑',
  
  // 常见术语
  'portrait': '肖像画',
  'landscape': '风景画',
  'still life': '静物画',
  'genre scene': '风俗场景',
  'religious': '宗教题材',
  'mythological': '神话题材',
  'historical': '历史题材',
  'allegorical': '寓言题材',
  'self-portrait': '自画像',
  'study': '习作',
  'sketch': '草图',
};

// 使用 Google Translate 免费 API
async function translateWithGoogle(texts: string[]): Promise<string[]> {
  if (texts.length === 0) return [];
  
  const apiUrl = 'https://translate.googleapis.com/translate_a/single';
  const params = new URLSearchParams({
    client: 'gtx',
    sl: 'en',
    tl: 'zh-CN',
    dt: 't',
  });

  try {
    const results: string[] = [];
    
    for (const text of texts) {
      if (!text || text.trim().length === 0) {
        results.push(text);
        continue;
      }

      const url = `${apiUrl}?${params}&q=${encodeURIComponent(text)}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Google Translate API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data[0]) {
        const translated = data[0]
          .map((item: any[]) => item[0] || '')
          .join('');
        results.push(translated);
      } else {
        results.push(text);
      }
    }
    
    return results;
  } catch (error) {
    console.error('Google Translate API error:', error);
    throw error;
  }
}

// 增强翻译质量
function enhanceTranslation(text: string): string {
  if (!text) return text;
  
  let translated = text;
  
  // 应用艺术术语词典
  for (const [eng, chn] of Object.entries(ART_TERMS_DICTIONARY)) {
    // 使用单词边界匹配，避免部分匹配
    const regex = new RegExp(`\\b${eng}\\b`, 'gi');
    translated = translated.replace(regex, chn);
  }
  
  // 清理多余空格
  translated = translated.replace(/\s+/g, ' ').trim();
  
  return translated;
}

async function translateText(text: string): Promise<string> {
  if (!text || text.trim().length === 0) return text;
  
  try {
    // 使用 Google Translate
    const results = await translateWithGoogle([text]);
    let translated = results[0] || text;
    
    // 增强翻译质量
    translated = enhanceTranslation(translated);
    
    return translated;
  } catch (error) {
    console.warn('Translation failed, using original text:', error);
    return text;
  }
}

async function translateArtwork(artwork: any): Promise<any> {
  const fieldsToTranslate = [
    'title',
    'attribution',
    'medium',
    'provenance',
    'credit_line',
    'display_date',
    'dimensions',
    'attribution_inverted',
    'classification',
    'sub_classification',
    'visual_classification',
    'department'
  ];

  const translations: any = {};

  for (const field of fieldsToTranslate) {
    if (artwork[field]) {
      // 字段名映射: title -> title_zh
      translations[`${field}_zh`] = await translateText(artwork[field]);
    }
  }

  return translations;
}

async function processBatch(objects: any[]) {
  const updates = await Promise.all(objects.map(async (obj) => {
    try {
      console.log(`  Translating artwork ${obj.object_id}...`);
      const translations = await translateArtwork(obj);
      
      // 直接更新 _zh 字段到根文档，不再推送到 translations 数组
      return {
        id: obj._id,
        update: {
          $set: {
            ...translations,
            updated_at: new Date(),
          },
        },
      };
    } catch (error) {
      console.error(`Error processing artwork ${obj.object_id}:`, error);
      return { id: obj._id, error };
    }
  }));

  // 执行更新
  let successCount = 0;
  let errorCount = 0;
  
  for (const result of updates) {
    if (result.error) {
      errorCount++;
      continue;
    }
    
    try {
      await ObjectModel.updateOne(
        { _id: result.id },
        result.update
      );
      successCount++;
    } catch (error) {
      console.error(`Error updating artwork ${result.id}:`, error);
      errorCount++;
    }
  }
  
  return { success: successCount, errors: errorCount };
}

async function translateAllArtworks() {
  try {
    await mongoose.connect(config.database.uri);
    console.log('已连接到 MongoDB');

    // 获取需要翻译的作品数量
    const total = await ObjectModel.countDocuments({});
    const translatedCount = await ObjectModel.countDocuments({
      'translations.locale': TARGET_LOCALE
    });
    
    console.log(`总作品数: ${total}`);
    console.log(`已翻译数: ${translatedCount}`);
    console.log(`待翻译数: ${total - translatedCount}`);
    
    let processed = 0;
    let totalSuccess = 0;
    let totalErrors = 0;

    while (processed < total) {
      // 获取所有作品（无论是否已翻译）
      const objects = await ObjectModel.find({})
        .select('object_id title attribution medium provenance credit_line display_date translations')
        .skip(processed)
        .limit(BATCH_SIZE);

      if (objects.length === 0) break;

      console.log(`\n处理批次 ${Math.floor(processed / BATCH_SIZE) + 1} (${objects.length} 项)...`);
      
      const result = await processBatch(objects);
      totalSuccess += result.success;
      totalErrors += result.errors;
      
      processed += objects.length;
      
      // 速率限制
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }

    console.log(`\n✅ 中文本地化完成！`);
    console.log(`   成功: ${totalSuccess}`);
    console.log(`   失败: ${totalErrors}`);

  } catch (error) {
    console.error('❌ 翻译失败:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('已断开 MongoDB 连接');
  }
}

// 运行翻译
translateAllArtworks().catch(console.error);
