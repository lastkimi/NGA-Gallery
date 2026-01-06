import mongoose from 'mongoose';
import { config } from '../src/config';
import { ObjectModel } from '../src/models/schemas';

async function fixEmptyFields() {
    await mongoose.connect(config.database.uri);
    console.log('✅ 连接数据库...');

    // 1. 修复 medium 为空的情况
    const mediumResult = await ObjectModel.updateMany(
        { 
            medium: { $in: [null, ""] },
            $or: [
                { medium_zh: { $exists: false } },
                { medium_zh: null }
            ]
        },
        { $set: { medium_zh: "" } }
    );
    console.log(`✅ 修复 medium 为空的记录: ${mediumResult.modifiedCount} 条`);

    // 2. 修复 title 为空的情况
    const titleResult = await ObjectModel.updateMany(
        { 
            title: { $in: [null, ""] },
            $or: [
                { title_zh: { $exists: false } },
                { title_zh: null }
            ]
        },
        { $set: { title_zh: "" } }
    );
    console.log(`✅ 修复 title 为空的记录: ${titleResult.modifiedCount} 条`);

    // 3. 修复 attribution 为空的情况
    const attributionResult = await ObjectModel.updateMany(
        { 
            attribution: { $in: [null, ""] },
            $or: [
                { attribution_zh: { $exists: false } },
                { attribution_zh: null }
            ]
        },
        { $set: { attribution_zh: "" } }
    );
    console.log(`✅ 修复 attribution 为空的记录: ${attributionResult.modifiedCount} 条`);

    await mongoose.disconnect();
    console.log('\n🎉 修复完成！');
}

fixEmptyFields();