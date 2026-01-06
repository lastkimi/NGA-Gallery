const mongoose = require('mongoose');

// 简单的模式定义用于检查
const TranslationSchema = new mongoose.Schema({
  locale: String,
  title: String,
  attribution: String,
  medium: String,
  provenance: String,
  credit_line: String,
  display_date: String,
});

const ObjectSchema = new mongoose.Schema({
  object_id: Number,
  translations: [TranslationSchema],
  updated_at: Date,
});

const ObjectModel = mongoose.model('Object', ObjectSchema, 'objects');

async function checkProgress() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/openart');
    console.log('已连接到 MongoDB');

    const total = await ObjectModel.countDocuments({});
    const translatedCount = await ObjectModel.countDocuments({
      'translations.locale': 'zh'
    });

    // 检查最近24小时更新的作品数量
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentUpdates = await ObjectModel.countDocuments({
      'translations.locale': 'zh',
      updated_at: { $gte: oneDayAgo }
    });

    console.log('翻译改进进度:');
    console.log(`  总作品数: ${total.toLocaleString()}`);
    console.log(`  已有翻译数: ${translatedCount.toLocaleString()}`);
    console.log(`  今日更新的翻译: ${recentUpdates.toLocaleString()}`);
    console.log(`  进度: ${((translatedCount / total) * 100).toFixed(2)}%`);

    await mongoose.disconnect();
  } catch (error) {
    console.error('检查进度失败:', error);
  }
}

checkProgress();