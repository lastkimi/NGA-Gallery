import mongoose from 'mongoose';
import { config } from '../src/config';
import { ObjectModel } from '../src/models/schemas';
import fetch from 'node-fetch';

// Configuration
const DEEPLX_API_URL = 'http://127.0.0.1:1189/translate';
const TARGET_LOCALE = 'zh'; // Chinese
const BATCH_SIZE = 50; // DeepLX 本地服务可以处理更高的并发
const DELAY_MS = 100; // 本地服务延迟可以很低

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
};

// 使用本地 DeepLX
async function translateWithDeepLX(text: string): Promise<string> {
  if (!text || text.trim().length === 0) return text;
  
  try {
    const response = await fetch(DEEPLX_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        source_lang: 'EN',
        target_lang: 'ZH',
      }),
    });
    
    if (!response.ok) {
        // 如果出错，尝试稍后重试或回退
        if (response.status === 429) {
            console.warn('DeepLX 429 Too Many Requests, waiting...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            return translateWithDeepLX(text);
        }
        throw new Error(`DeepLX API error: ${response.status}`);
    }
    
    const data = await response.json();
    if (data.code === 200 && data.data) {
        return data.data;
    } else {
        console.warn(`DeepLX returned unexpected format:`, data);
        return text;
    }
    
  } catch (error) {
    console.error('DeepLX translation error:', error);
    // 出错时返回原文，以免中断流程
    return text;
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

async function translateArtwork(artwork: any): Promise<any> {
  const fieldsToTranslate = [
    'title',
    'attribution',
    'medium',
    'provenance',
    'credit_line',
    'display_date',
  ];

  const translations: any = {};

  for (const field of fieldsToTranslate) {
    if (artwork[field]) {
      const translatedText = await translateWithDeepLX(artwork[field]);
      translations[field] = enhanceTranslation(translatedText);
    }
  }

  return translations;
}

async function processBatch(objects: any[]) {
  const updates = await Promise.all(objects.map(async (obj) => {
    try {
      console.log(`  Translating artwork ${obj.object_id}...`);
      const translations = await translateArtwork(obj);
      
      // 检查是否已有该语言的翻译
      const existingIndex = obj.translations?.findIndex((t: any) => t.locale === TARGET_LOCALE);
      
      if (existingIndex !== undefined && existingIndex >= 0) {
        // 更新现有翻译
        return {
          id: obj._id,
          update: {
            $set: {
              [`translations.${existingIndex}`]: {
                locale: TARGET_LOCALE,
                ...translations,
              },
              updated_at: new Date(),
            },
          },
        };
      } else {
        // 添加新翻译
        return {
          id: obj._id,
          update: {
            $push: {
              translations: {
                locale: TARGET_LOCALE,
                ...translations,
              },
            },
            $set: {
              updated_at: new Date(),
            },
          },
        };
      }
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
    console.log(`连接到本地 DeepLX 服务: ${DEEPLX_API_URL}`);

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

    // 跳过已翻译的部分
    // 注意：这里的 skip 逻辑可能不够高效，如果数据量大建议使用游标或 filter
    // 为了简单起见，我们查找所有没有中文翻译的作品
    const query = {
        'translations.locale': { $ne: TARGET_LOCALE }
    };
    
    const countToProcess = await ObjectModel.countDocuments(query);
    console.log(`\n准备处理 ${countToProcess} 个未翻译作品...`);

    while (processed < countToProcess) {
      const objects = await ObjectModel.find(query)
        .select('object_id title attribution medium provenance credit_line display_date translations')
        .limit(BATCH_SIZE); // 每次取一批未翻译的

      if (objects.length === 0) break;

      console.log(`\n处理批次 (${objects.length} 项)... [已完成: ${processed + totalSuccess}]`);
      
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
