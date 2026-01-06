import mongoose from 'mongoose';
import { config } from '../src/config';
import { ObjectModel } from '../src/models/schemas';

async function checkProgress() {
    try {
        await mongoose.connect(config.database.uri);
        const total = await ObjectModel.countDocuments({});
        // 统计已翻译的（以 title_zh 为标志）
        const translated = await ObjectModel.countDocuments({ title_zh: { $exists: true, $ne: '' } });
        
        console.log('=== 当前进度 ===');
        console.log(`总文档数: ${total}`);
        console.log(`已翻译: ${translated}`);
        console.log(`剩余: ${total - translated}`);
        console.log(`进度: ${((translated / total) * 100).toFixed(2)}%`);
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

checkProgress();