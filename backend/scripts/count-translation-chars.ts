import mongoose from 'mongoose';
import { config } from '../src/config';
import { ObjectModel } from '../src/models/schemas';

async function countTranslationCharacters() {
  try {
    await mongoose.connect(config.database.uri);
    console.log('已连接到 MongoDB');

    // 获取所有艺术品
    const objects = await ObjectModel.find({})
      .select('title attribution medium provenance credit_line display_date translations');

    console.log(`\n正在统计 ${objects.length} 件艺术品的翻译字符数...\n`);

    let totalChars = 0;
    let translatedChars = 0;
    let untranslatedChars = 0;
    
    const fieldStats: Record<string, { total: number; translated: number; untranslated: number }> = {
      title: { total: 0, translated: 0, untranslated: 0 },
      attribution: { total: 0, translated: 0, untranslated: 0 },
      medium: { total: 0, translated: 0, untranslated: 0 },
      provenance: { total: 0, translated: 0, untranslated: 0 },
      credit_line: { total: 0, translated: 0, untranslated: 0 },
      display_date: { total: 0, translated: 0, untranslated: 0 },
    };

    const fieldsToTranslate = ['title', 'attribution', 'medium', 'provenance', 'credit_line', 'display_date'];

    for (const obj of objects) {
      const hasZhTranslation = obj.translations?.some((t: any) => t.locale === 'zh');
      
      for (const field of fieldsToTranslate) {
        const value = obj[field as keyof typeof obj];
        if (value && typeof value === 'string') {
          const charCount = value.length;
          fieldStats[field].total += charCount;
          totalChars += charCount;
          
          if (hasZhTranslation) {
            fieldStats[field].translated += charCount;
            translatedChars += charCount;
          } else {
            fieldStats[field].untranslated += charCount;
            untranslatedChars += charCount;
          }
        }
      }
    }

    // 输出统计结果
    console.log('='.repeat(60));
    console.log('翻译字符数统计结果');
    console.log('='.repeat(60));
    console.log(`\n总作品数: ${objects.length.toLocaleString()}`);
    console.log(`\n总字符数统计:`);
    console.log(`  总计: ${totalChars.toLocaleString()} 字符`);
    console.log(`  已翻译: ${translatedChars.toLocaleString()} 字符`);
    console.log(`  待翻译: ${untranslatedChars.toLocaleString()} 字符`);
    console.log(`  翻译进度: ${((translatedChars / totalChars) * 100).toFixed(2)}%`);
    
    console.log(`\n各字段字符数统计:`);
    console.log('-'.repeat(60));
    for (const [field, stats] of Object.entries(fieldStats)) {
      const progress = stats.total > 0 ? ((stats.translated / stats.total) * 100).toFixed(2) : '0.00';
      console.log(`${field.padEnd(15)}: 总计 ${stats.total.toLocaleString().padStart(10)} | 已翻译 ${stats.translated.toLocaleString().padStart(10)} | 待翻译 ${stats.untranslated.toLocaleString().padStart(10)} | 进度 ${progress.padStart(6)}%`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`\n估算翻译成本（基于字符数）:`);
    console.log(`  待翻译字符数: ${untranslatedChars.toLocaleString()}`);
    console.log(`  估算单词数（约）: ${Math.ceil(untranslatedChars / 5).toLocaleString()} (假设平均5字符=1单词)`);
    console.log(`  估算翻译时间（Google免费API）: 约 ${Math.ceil(untranslatedChars / 1000 / 60)} 分钟 (假设每秒1000字符)`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('统计失败:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n已断开 MongoDB 连接');
  }
}

// 运行统计
countTranslationCharacters().catch(console.error);
