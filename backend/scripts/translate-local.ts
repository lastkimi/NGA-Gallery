import mongoose from 'mongoose';
import { config } from '../src/config';
import { ObjectModel } from '../src/models/schemas';
import { pipeline, env } from '@xenova/transformers';

// Configuration
const TARGET_LOCALE = 'zh';
const BATCH_SIZE = 1; // 极小批次测试
// 第一次运行时会自动下载模型（约 300MB）
const MODEL_NAME = 'Xenova/opus-mt-en-zh';

// 禁用本地模型下载的缓存路径警告
env.cacheDir = './.cache';

// 艺术术语词典
const ART_TERMS_DICTIONARY: Record<string, string> = {
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
  'etching': '蚀刻版画',
  'lithograph': '石版画',
  'woodcut': '木刻版画',
  'engraving': '雕版版画',
  'mezzotint': '金属版画',
  'drypoint': '干刻版画',
  'marble': '大理石',
  'bronze': '青铜',
  'terracotta': '陶土',
  'plaster': '石膏',
  'gilded': '镀金',
  'cast iron': '铸铁',
  'steel': '钢铁',
  'wood': '木质',
  'in.': '英寸',
  'cm.': '厘米',
  'mm.': '毫米',
  'Painting': '绘画',
  'Sculpture': '雕塑',
  'Drawing': '素描',
  'Print': '版画',
  'Photograph': '摄影',
  'Decorative Arts': '装饰艺术',
  'Architecture': '建筑',
};

function enhanceTranslation(text: string): string {
  if (!text) return text;
  let translated = text;
  // 简单的字典替换
  for (const [eng, chn] of Object.entries(ART_TERMS_DICTIONARY)) {
    // 使用正则确保单词匹配，避免部分替换
    const regex = new RegExp(`\\b${eng}\\b`, 'gi');
    translated = translated.replace(regex, chn);
  }
  return translated;
}

async function translateAllArtworks() {
  let translator: any;

  try {
    console.log('📦 正在加载本地翻译模型 (第一次运行需要下载 ~300MB)...');
    // 初始化 pipeline
    translator = await pipeline('translation', MODEL_NAME);
    console.log('✅ 模型加载完成！');

    await mongoose.connect(config.database.uri);
    console.log('已连接到 MongoDB');

    const query = {
        'translations.locale': { $ne: TARGET_LOCALE }
    };
    
    const countToProcess = await ObjectModel.countDocuments(query);
    console.log(`\n📚 剩余任务: ${countToProcess} 作品`);
    console.log(`⚡️ 模式: 本地 CPU/GPU 加速翻译 (Batch: ${BATCH_SIZE})`);

    let processed = 0;
    let totalSuccess = 0;

    // 字段列表
    const fieldsToTranslate = ['title', 'attribution', 'medium', 'provenance', 'credit_line', 'display_date'];

    while (processed < countToProcess) {
      const objects = await ObjectModel.find(query)
        .select('object_id title attribution medium provenance credit_line display_date translations')
        .limit(BATCH_SIZE);

      if (objects.length === 0) break;

      const startTime = Date.now();
      
      const textMap: { objIndex: number, field: string, original: string }[] = [];
      const flatTexts: string[] = [];

      objects.forEach((obj, idx) => {
          fieldsToTranslate.forEach(field => {
              const val = obj[field];
              if (val && typeof val === 'string' && val.trim().length > 0) {
                  flatTexts.push(val.trim());
                  textMap.push({ objIndex: idx, field, original: val.trim() });
              }
          });
      });

      if (flatTexts.length > 0) {
          try {
             const results = await translator(flatTexts);
             
             // 3. 处理结果并构建更新
             const objUpdates: Record<number, any> = {};

             results.forEach((res: any, idx: number) => {
                 let translatedText = '';
                 if (typeof res === 'string') translatedText = res;
                 else if (res.translation_text) translatedText = res.translation_text;
                 else if (Array.isArray(res) && res[0]?.translation_text) translatedText = res[0].translation_text;
                 
                 // 应用字典增强
                 translatedText = enhanceTranslation(translatedText);

                 const mapping = textMap[idx];
                 if (!objUpdates[mapping.objIndex]) objUpdates[mapping.objIndex] = {};
                 objUpdates[mapping.objIndex][mapping.field] = translatedText;
             });

             // 4. 执行数据库更新
             // 并行写入数据库
            const updatePromises = Object.entries(objUpdates).map(async ([objIdx, transObj]) => {
                const index = parseInt(objIdx);
                const obj = objects[index];
                
                const existingIndex = obj.translations?.findIndex((t: any) => t.locale === TARGET_LOCALE);
                let updateOp;

                if (existingIndex !== undefined && existingIndex >= 0) {
                    const setFields: any = { updated_at: new Date() };
                    for(const [k, v] of Object.entries(transObj)) {
                        setFields[`translations.${existingIndex}.${k}`] = v;
                    }
                    setFields[`translations.${existingIndex}.locale`] = TARGET_LOCALE;
                    updateOp = { $set: setFields };
                } else {
                    updateOp = {
                        $push: {
                            translations: {
                                locale: TARGET_LOCALE,
                                ...transObj
                            }
                        },
                        $set: { updated_at: new Date() }
                    };
                }
                
                await ObjectModel.updateOne({ _id: obj._id }, updateOp);
            });

            await Promise.all(updatePromises);
            totalSuccess += Object.keys(objUpdates).length;

          } catch (err) {
              console.error('Inference error:', err);
          }
      }
      
      processed += objects.length;
      const duration = Date.now() - startTime;
      const rate = (objects.length / (duration / 1000)).toFixed(1);
      
      process.stdout.write(`Rate: ${rate}/s | Progress: ${processed}/${countToProcess} | Total Success: ${totalSuccess}\n`);
    }

    console.log(`\n🎉 本地翻译全部完成！`);

  } catch (error) {
    console.error('❌ 脚本错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('已断开 MongoDB 连接');
  }
}

translateAllArtworks().catch(console.error);
