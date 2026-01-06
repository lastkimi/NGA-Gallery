import mongoose from 'mongoose';
import { config } from '../src/config';
import { ObjectModel } from '../src/models/schemas';
import { spawn } from 'child_process';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const TARGET_LOCALE = 'zh';
const BATCH_SIZE = 16; // 增加并发到 16 (Python bridge 可以排队处理)
const PYTHON_PATH = path.join(__dirname, '../venv/bin/python3');
const BRIDGE_SCRIPT = path.join(__dirname, 'python_bridge.py');

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

// 智能缓存（Smart Dictionary）
const MEMORY_CACHE = new Map<string, string>();

// 预热缓存
for (const [key, value] of Object.entries(ART_TERMS_DICTIONARY)) {
    MEMORY_CACHE.set(key.toLowerCase(), value);
}

function enhanceTranslation(text: string): string {
  if (!text) return text;
  let translated = text;
  for (const [eng, chn] of Object.entries(ART_TERMS_DICTIONARY)) {
    const regex = new RegExp(`\\b${eng}\\b`, 'gi');
    translated = translated.replace(regex, chn);
  }
  return translated;
}

// Python Process Wrapper
class TranslationEngine {
    private process: any;
    private rl: any;
    private pending: { resolve: Function, reject: Function }[] = [];
    private ready = false;

    constructor() {
        console.log('🚀 启动 Python CTranslate2 引擎...');
        this.process = spawn(PYTHON_PATH, [BRIDGE_SCRIPT]);
        
        this.process.stderr.on('data', (data: any) => {
            const msg = data.toString();
            if (!msg.includes('FutureWarning')) { // 忽略一些 Python 警告
                console.error(`[Python] ${msg.trim()}`);
            }
        });

        this.rl = readline.createInterface({
            input: this.process.stdout,
            terminal: false
        });

        this.rl.on('line', (line: string) => {
            try {
                const data = JSON.parse(line);
                if (data.status === 'downloading_model') {
                    console.log('📦 正在下载翻译模型 (Argos Translate)... (可能需要几分钟)');
                } else if (data.status === 'ready') {
                    console.log('✅ 翻译引擎就绪！');
                    this.ready = true;
                } else if (this.pending.length > 0) {
                    const task = this.pending.shift();
                    if (data.error) {
                        task?.reject(new Error(data.error));
                    } else {
                        task?.resolve(data.text);
                    }
                }
            } catch (e) {
                console.error('JSON Parse Error:', e);
            }
        });
    }

    async translate(text: string): Promise<string> {
        if (!this.ready) {
            await new Promise(r => setTimeout(r, 1000));
            if (!this.ready) return await this.translate(text);
        }

        return new Promise((resolve, reject) => {
            this.pending.push({ resolve, reject });
            this.process.stdin.write(JSON.stringify({ text }) + '\n');
        });
    }

    close() {
        if (this.process) this.process.kill();
    }
}

async function translateAllArtworks() {
  const engine = new TranslationEngine();

  try {
    await mongoose.connect(config.database.uri);
    console.log('已连接到 MongoDB');

    const query = {
        'translations.locale': { $ne: TARGET_LOCALE }
    };
    
    const countToProcess = await ObjectModel.countDocuments(query);
    console.log(`\n📚 剩余任务: ${countToProcess} 作品`);
    console.log(`⚡️ 模式: 极速本地 Python CT2 + 智能字典缓存`);

    let processed = 0;
    let totalSuccess = 0;
    let cacheHits = 0;

    const fieldsToTranslate = ['title', 'attribution', 'medium', 'provenance', 'credit_line', 'display_date'];

    while (processed < countToProcess) {
      const objects = await ObjectModel.find(query)
        .select('object_id title attribution medium provenance credit_line display_date translations')
        .limit(BATCH_SIZE);

      if (objects.length === 0) break;

      const startTime = Date.now();
      
      const tasks = objects.map(async (obj) => {
          const translations: any = {};
          let hasTranslation = false;

          for (const field of fieldsToTranslate) {
              const val = obj[field];
              if (val && typeof val === 'string' && val.trim().length > 0) {
                  const cleanVal = val.trim();
                  const cacheKey = cleanVal.toLowerCase();

                  // 1. 查缓存
                  if (MEMORY_CACHE.has(cacheKey)) {
                      translations[field] = MEMORY_CACHE.get(cacheKey);
                      cacheHits++;
                      hasTranslation = true;
                      continue;
                  }

                  // 2. 本地 AI 翻译
                  try {
                      const res = await engine.translate(cleanVal);
                      const finalRes = enhanceTranslation(res);
                      
                      // 3. 写入缓存 (只存短句)
                      if (cleanVal.length < 100) {
                          MEMORY_CACHE.set(cacheKey, finalRes);
                      }
                      
                      translations[field] = finalRes;
                      hasTranslation = true;
                  } catch (e) {
                      console.error(`Error translating ${obj.object_id} field ${field}:`, e);
                  }
              }
          }

          if (hasTranslation) {
              // Update DB
                const existingIndex = obj.translations?.findIndex((t: any) => t.locale === TARGET_LOCALE);
                let updateOp;

                if (existingIndex !== undefined && existingIndex >= 0) {
                    const setFields: any = { updated_at: new Date() };
                    for(const [k, v] of Object.entries(translations)) {
                        setFields[`translations.${existingIndex}.${k}`] = v;
                    }
                    setFields[`translations.${existingIndex}.locale`] = TARGET_LOCALE;
                    updateOp = { $set: setFields };
                } else {
                    updateOp = {
                        $push: {
                            translations: {
                                locale: TARGET_LOCALE,
                                ...translations
                            }
                        },
                        $set: { updated_at: new Date() }
                    };
                }
                
                await ObjectModel.updateOne({ _id: obj._id }, updateOp);
                return true;
          }
          return false;
      });

      const results = await Promise.all(tasks);
      const successCount = results.filter(Boolean).length;
      totalSuccess += successCount;
      processed += objects.length;

      const duration = Date.now() - startTime;
      const rate = (objects.length / (duration / 1000)).toFixed(1);
      
      process.stdout.write(`Rate: ${rate}/s | Progress: ${processed}/${countToProcess} | Cache Hits: ${cacheHits}\n`);
    }

    console.log(`\n🎉 极速本地翻译完成！`);

  } catch (error) {
    console.error('❌ 脚本错误:', error);
  } finally {
    engine.close();
    await mongoose.disconnect();
    console.log('已断开 MongoDB 连接');
  }
}

translateAllArtworks().catch(console.error);
