import mongoose from 'mongoose';
import { config } from '../src/config';
import { ObjectModel } from '../src/models/schemas';
import fetch from 'node-fetch';

// Configuration
const BATCH_SIZE = 10;
const DELAY_MS = 1000;

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

function enhanceTranslation(text: string): string {
  if (!text) return text;
  
  let translated = text;
  
  for (const [eng, chn] of Object.entries(ART_TERMS_DICTIONARY)) {
    const regex = new RegExp(`\\b${eng}\\b`, 'gi');
    translated = translated.replace(regex, chn);
  }
  
  translated = translated.replace(/\s+/g, ' ').trim();
  
  return translated;
}

async function translateText(text: string): Promise<string> {
  if (!text || text.trim().length === 0) return text;
  
  try {
    const results = await translateWithGoogle([text]);
    let translated = results[0] || text;
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
      // 翻译为 field_zh
      translations[`${field}_zh`] = await translateText(artwork[field]);
    }
  }

  return translations;
}

async function processBatch(objects: any[]) {
  const updates = await Promise.all(objects.map(async (obj) => {
    try {
      console.log(`  Translating artwork ${obj.object_id} (${obj.title})...`);
      const translations = await translateArtwork(obj);
      
      // 更新文档，设置 _zh 字段
      return {
        id: obj._id,
        update: {
          $set: {
            ...translations,
            updated_at: new Date(),
          },
        },
        translations: translations // 为了返回给用户看
      };
    } catch (error) {
      console.error(`Error processing artwork ${obj.object_id}:`, error);
      return { id: obj._id, error };
    }
  }));

  const resultsInfo: any[] = [];
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
      resultsInfo.push({
        id: result.id,
        original_title: result.update.$set.title, // Note: title might not be in $set if not updated, but we want to log it
        translations: result.translations
      });
    } catch (error) {
      console.error(`Error updating artwork ${result.id}:`, error);
      errorCount++;
    }
  }
  
  return { success: successCount, errors: errorCount, details: resultsInfo };
}

async function testTranslation() {
  try {
    await mongoose.connect(config.database.uri);
    console.log('已连接到 MongoDB');

    // 获取10个没有中文翻译的作品
    const objects = await ObjectModel.find({
      title_zh: { $exists: false }
    })
    .limit(10); // 限制10条

    if (objects.length === 0) {
      console.log('没有找到待翻译的作品（所有作品可能已包含中文翻译）。');
      return;
    }

    console.log(`\n处理测试批次 (${objects.length} 项)...`);
    
    const result = await processBatch(objects);

    console.log(`\n✅ 测试翻译完成！`);
    console.log(`   成功: ${result.success}`);
    console.log(`   失败: ${result.errors}`);

    console.log('\n=== 翻译详情 (前10条) ===');
    // 重新查询以获取最新状态并展示详细信息
    for (const obj of objects) {
      const updatedObj = await ObjectModel.findById(obj._id);
      if (updatedObj) {
        console.log(`\nID: ${updatedObj.object_id}`);
        console.log(`Title (En): ${updatedObj.title}`);
        console.log(`Title (Zh): ${updatedObj.title_zh}`);
        console.log(`Medium (En): ${updatedObj.medium}`);
        console.log(`Medium (Zh): ${updatedObj.medium_zh}`);
        console.log(`-----------------------------------`);
      }
    }

  } catch (error) {
    console.error('❌ 测试翻译失败:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('已断开 MongoDB 连接');
  }
}

// 运行测试
testTranslation().catch(console.error);