import mongoose from 'mongoose';
import { config } from '../src/config';
import { ObjectModel } from '../src/models/schemas';

async function resetSpecificObject() {
    await mongoose.connect(config.database.uri);
    console.log('✅ 连接数据库...');

    // 针对 ID 4908 进行强制重置
    const specificResult = await ObjectModel.updateOne(
        { object_id: "4908" },
        { $unset: { title_zh: "", medium_zh: "", attribution_zh: "" } }
    );
    console.log(`✅ 强制重置 ID 4908: ${specificResult.modifiedCount} 条`);

    await mongoose.disconnect();
    console.log('\n🎉 重置完成，请运行 translate-ultimate.ts 重新翻译。');
}

resetSpecificObject();