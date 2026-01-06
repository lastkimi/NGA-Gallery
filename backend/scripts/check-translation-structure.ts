import mongoose from 'mongoose';
import { config } from '../src/config';
import { ObjectModel } from '../src/models/schemas';

async function checkTranslationStructure() {
  try {
    await mongoose.connect(config.database.uri);
    console.log('已连接到 MongoDB');

    // Check specific object 115581
    const obj = await ObjectModel.findOne({ object_id: '115581' });

    if (obj) {
      console.log('作品ID:', obj.object_id);
      console.log('英文标题:', obj.title);
      console.log('翻译数组:');
      // console.log(JSON.stringify(obj.translations, null, 2));

      // 检查翻译结构
      const zhTranslation = obj.translations.find((t: any) => t.locale === 'zh');
      if (zhTranslation) {
        console.log('\n中文翻译字段:');
        console.log('标题:', zhTranslation.title);
        console.log('艺术家:', zhTranslation.attribution);
        console.log('媒介:', zhTranslation.medium);
        console.log('创作日期:', zhTranslation.display_date);
        console.log('收藏信息:', zhTranslation.credit_line);
        console.log('来源:', zhTranslation.provenance);
      }
    } else {
      console.log('未找到作品 115581');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('检查失败:', error);
    throw error;
  }
}

checkTranslationStructure().catch(console.error);