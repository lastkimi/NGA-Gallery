import mongoose from 'mongoose';
import { config } from '../src/config';
import { ObjectModel } from '../src/models/schemas';

async function clearTranslations() {
  try {
    await mongoose.connect(config.database.uri);
    console.log('已连接到 MongoDB');

    const TARGET_LOCALE = 'zh';

    console.log(`正在清除所有 "${TARGET_LOCALE}" 语言的翻译...`);

    // 使用 updateMany 移除 translations 数组中 locale 为 zh 的元素
    const result = await ObjectModel.updateMany(
      {},
      {
        $pull: {
          translations: { locale: TARGET_LOCALE }
        }
      }
    );

    console.log(`清除完成！`);
    console.log(`匹配文档数: ${result.matchedCount}`);
    console.log(`修改文档数: ${result.modifiedCount}`);

  } catch (error) {
    console.error('清除失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('已断开 MongoDB 连接');
  }
}

clearTranslations().catch(console.error);
