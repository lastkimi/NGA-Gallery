import mongoose from 'mongoose';
import { config } from '../src/config';
import { ObjectModel } from '../src/models/schemas';

async function checkTranslationStatus() {
  try {
    await mongoose.connect(config.database.uri);
    console.log('已连接到数据库\n');

    // 统计总数
    const totalCount = await ObjectModel.countDocuments();
    console.log(`总记录数: ${totalCount}`);

    // 统计各字段的翻译完成情况
    const fields = [
      'title',
      'attribution',
      'medium',
      'display_date',
      'classification',
      'credit_line',
      'provenance',
    ];

    console.log('\n=== 翻译完成情况 ===');
    for (const field of fields) {
      const zhField = `${field}_zh` as keyof typeof ObjectModel;
      const translatedCount = await ObjectModel.countDocuments({
        [zhField]: { $exists: true, $ne: null, $ne: '' }
      });
      const percentage = ((translatedCount / totalCount) * 100).toFixed(2);
      console.log(`${field.padEnd(15)}: ${translatedCount.toString().padStart(6)} / ${totalCount} (${percentage}%)`);
    }

    // 统计完全翻译的记录数（所有字段都有翻译）
    const fullyTranslated = await ObjectModel.countDocuments({
      title_zh: { $exists: true, $ne: null, $ne: '' },
      attribution_zh: { $exists: true, $ne: null, $ne: '' },
      medium_zh: { $exists: true, $ne: null, $ne: '' },
      display_date_zh: { $exists: true, $ne: null, $ne: '' },
      classification_zh: { $exists: true, $ne: null, $ne: '' },
    });
    const fullyTranslatedPercentage = ((fullyTranslated / totalCount) * 100).toFixed(2);
    console.log(`\n完全翻译记录: ${fullyTranslated} / ${totalCount} (${fullyTranslatedPercentage}%)`);

    // 统计部分翻译的记录数（至少有一个字段有翻译）
    const partiallyTranslated = await ObjectModel.countDocuments({
      $or: [
        { title_zh: { $exists: true, $ne: null, $ne: '' } },
        { attribution_zh: { $exists: true, $ne: null, $ne: '' } },
        { medium_zh: { $exists: true, $ne: null, $ne: '' } },
        { display_date_zh: { $exists: true, $ne: null, $ne: '' } },
        { classification_zh: { $exists: true, $ne: null, $ne: '' } },
      ]
    });
    const partiallyTranslatedPercentage = ((partiallyTranslated / totalCount) * 100).toFixed(2);
    console.log(`部分翻译记录: ${partiallyTranslated} / ${totalCount} (${partiallyTranslatedPercentage}%)`);

    // 统计未翻译的记录数
    const untranslated = await ObjectModel.countDocuments({
      title_zh: { $exists: false },
      attribution_zh: { $exists: false },
      medium_zh: { $exists: false },
      display_date_zh: { $exists: false },
      classification_zh: { $exists: false },
    });
    const untranslatedPercentage = ((untranslated / totalCount) * 100).toFixed(2);
    console.log(`未翻译记录: ${untranslated} / ${totalCount} (${untranslatedPercentage}%)`);

    // 检查缺失字段的情况
    console.log('\n=== 缺失字段统计 ===');
    const missingFields = await ObjectModel.aggregate([
      {
        $project: {
          hasTitle: { $cond: [{ $and: [{ $ne: ['$title_zh', null] }, { $ne: ['$title_zh', ''] }] }, 1, 0] },
          hasAttribution: { $cond: [{ $and: [{ $ne: ['$attribution_zh', null] }, { $ne: ['$attribution_zh', ''] }] }, 1, 0] },
          hasMedium: { $cond: [{ $and: [{ $ne: ['$medium_zh', null] }, { $ne: ['$medium_zh', ''] }] }, 1, 0] },
          hasDisplayDate: { $cond: [{ $and: [{ $ne: ['$display_date_zh', null] }, { $ne: ['$display_date_zh', ''] }] }, 1, 0] },
          hasClassification: { $cond: [{ $and: [{ $ne: ['$classification_zh', null] }, { $ne: ['$classification_zh', ''] }] }, 1, 0] },
        }
      },
      {
        $group: {
          _id: null,
          missingTitle: { $sum: { $cond: ['$hasTitle', 0, 1] } },
          missingAttribution: { $sum: { $cond: ['$hasAttribution', 0, 1] } },
          missingMedium: { $sum: { $cond: ['$hasMedium', 0, 1] } },
          missingDisplayDate: { $sum: { $cond: ['$hasDisplayDate', 0, 1] } },
          missingClassification: { $sum: { $cond: ['$hasClassification', 0, 1] } },
        }
      }
    ]);

    if (missingFields.length > 0) {
      const stats = missingFields[0];
      console.log(`缺失 title_zh: ${stats.missingTitle}`);
      console.log(`缺失 attribution_zh: ${stats.missingAttribution}`);
      console.log(`缺失 medium_zh: ${stats.missingMedium}`);
      console.log(`缺失 display_date_zh: ${stats.missingDisplayDate}`);
      console.log(`缺失 classification_zh: ${stats.missingClassification}`);
    }

    // 随机抽样检查翻译质量
    console.log('\n=== 随机抽样检查（5条记录）===');
    const samples = await ObjectModel.aggregate([
      { $match: { title_zh: { $exists: true, $ne: null, $ne: '' } } },
      { $sample: { size: 5 } },
      { $project: { 
        object_id: 1, 
        title: 1, 
        title_zh: 1, 
        attribution: 1, 
        attribution_zh: 1,
        medium: 1,
        medium_zh: 1,
      } }
    ]);

    samples.forEach((sample, index) => {
      console.log(`\n样本 ${index + 1}:`);
      console.log(`  ID: ${sample.object_id}`);
      console.log(`  标题: ${sample.title}`);
      console.log(`  标题(中): ${sample.title_zh}`);
      console.log(`  作者: ${sample.attribution}`);
      console.log(`  作者(中): ${sample.attribution_zh || '(未翻译)'}`);
      console.log(`  材质: ${sample.medium}`);
      console.log(`  材质(中): ${sample.medium_zh || '(未翻译)'}`);
    });

    await mongoose.disconnect();
    console.log('\n检查完成');
  } catch (error) {
    console.error('错误:', error);
    process.exit(1);
  }
}

checkTranslationStatus();
