import mongoose from 'mongoose';
import { config } from '../src/config';
import { ObjectModel } from '../src/models/schemas';

async function resetUntranslatedFields() {
    await mongoose.connect(config.database.uri);
    console.log('✅ 连接数据库...');

    // 1. 重置 title_zh 等于 title 的记录
    const titleResult = await ObjectModel.updateMany(
        { 
            $expr: { $eq: ["$title", "$title_zh"] },
            title: { $ne: "" },
            title_zh: { $exists: true }
        },
        { $unset: { title_zh: "" } } // 使用 $unset 删除字段，以便 translate-ultimate.ts 重新捕获
    );
    console.log(`✅ 重置 title_zh 等于 title 的记录: ${titleResult.modifiedCount} 条`);

    // 2. 重置 medium_zh 等于 medium 的记录
    const mediumResult = await ObjectModel.updateMany(
        { 
            $expr: { $eq: ["$medium", "$medium_zh"] },
            medium: { $ne: "" },
            medium_zh: { $exists: true }
        },
        { $unset: { medium_zh: "" } }
    );
    console.log(`✅ 重置 medium_zh 等于 medium 的记录: ${mediumResult.modifiedCount} 条`);

    // 3. 重置 attribution_zh 等于 attribution 的记录
    const attributionResult = await ObjectModel.updateMany(
        { 
            $expr: { $eq: ["$attribution", "$attribution_zh"] },
            attribution: { $ne: "" },
            attribution_zh: { $exists: true }
        },
        { $unset: { attribution_zh: "" } }
    );
    console.log(`✅ 重置 attribution_zh 等于 attribution 的记录: ${attributionResult.modifiedCount} 条`);

    // 针对用户反馈的特定 ID (11499) 进行强制重置
    const specificResult = await ObjectModel.updateOne(
        { object_id: "11499" },
        { $unset: { title_zh: "", medium_zh: "", attribution_zh: "" } }
    );
    console.log(`✅ 强制重置 ID 11499: ${specificResult.modifiedCount} 条`);

    await mongoose.disconnect();
    console.log('\n🎉 重置完成，请运行 translate-ultimate.ts 重新翻译。');
}

resetUntranslatedFields();