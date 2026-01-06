import mongoose from 'mongoose';
import { config } from '../src/config';
import { ObjectModel } from '../src/models/schemas';

async function reviewTranslations() {
  try {
    await mongoose.connect(config.database.uri);
    console.log('已连接到 MongoDB');

    // 随机获取一些作品进行审查
    const sampleSize = 10;
    const objects = await ObjectModel.aggregate([
      { $match: { 'translations.locale': 'zh' } },
      { $sample: { size: sampleSize } }
    ]);

    console.log(`\n=== 翻译质量审查 (随机抽样 ${objects.length} 件作品) ===\n`);

    for (const obj of objects) {
      const zhTranslation = obj.translations.find((t: any) => t.locale === 'zh');

      if (zhTranslation) {
        console.log(`作品 ID: ${obj.object_id}`);
        console.log(`标题 (英文): ${obj.title}`);
        console.log(`标题 (中文): ${zhTranslation.title}`);
        console.log(`艺术家 (英文): ${obj.attribution}`);
        console.log(`艺术家 (中文): ${zhTranslation.attribution}`);
        console.log(`媒介 (英文): ${obj.medium}`);
        console.log(`媒介 (中文): ${zhTranslation.medium}`);
        console.log(`创作日期 (英文): ${obj.display_date}`);
        console.log(`创作日期 (中文): ${zhTranslation.display_date}`);
        console.log(`收藏信息 (英文): ${obj.credit_line}`);
        console.log(`收藏信息 (中文): ${zhTranslation.credit_line}`);
        console.log('-'.repeat(80));
      }
    }

    // 统计翻译质量指标
    console.log('\n=== 翻译质量统计 ===');

    const totalObjects = await ObjectModel.countDocuments();
    const translatedObjects = await ObjectModel.countDocuments({
      'translations.locale': 'zh'
    });

    // 检查翻译完整性
    const completeTranslations = await ObjectModel.countDocuments({
      'translations.locale': 'zh',
      'translations.title': { $exists: true, $ne: '' },
      'translations.attribution': { $exists: true, $ne: '' },
      'translations.medium': { $exists: true, $ne: '' }
    });

    console.log(`总作品数: ${totalObjects}`);
    console.log(`有中文翻译的作品数: ${translatedObjects}`);
    console.log(`翻译完整度: ${((translatedObjects / totalObjects) * 100).toFixed(2)}%`);
    console.log(`完整翻译作品数: ${completeTranslations}`);
    console.log(`完整翻译率: ${((completeTranslations / totalObjects) * 100).toFixed(2)}%`);

    // 检查可能的翻译问题
    const potentialIssues = await ObjectModel.countDocuments({
      'translations.locale': 'zh',
      $or: [
        { 'translations.title': { $regex: /\?/ } }, // 包含问号，可能表示翻译失败
        { 'translations.attribution': { $regex: /\?/ } },
        { 'translations.medium': { $regex: /\?/ } }
      ]
    });

    console.log(`可能存在翻译问题的作品数: ${potentialIssues}`);

  } catch (error) {
    console.error('审查失败:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n已断开 MongoDB 连接');
  }
}

// 运行审查
reviewTranslations().catch(console.error);