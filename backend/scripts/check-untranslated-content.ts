import mongoose from 'mongoose';
import { config } from '../src/config';
import { ObjectModel } from '../src/models/schemas';

async function checkUntranslatedZhFields() {
    await mongoose.connect(config.database.uri);
    console.log('✅ 连接数据库...');

    // 检查 title_zh 等于 title 的情况
    const sameTitleCount = await ObjectModel.countDocuments({
        $expr: { $eq: ["$title", "$title_zh"] },
        title: { $ne: "" },
        title_zh: { $exists: true }
    });
    console.log(`title_zh 等于 title 的记录数: ${sameTitleCount}`);

    // 检查 medium_zh 等于 medium 的情况
    const sameMediumCount = await ObjectModel.countDocuments({
        $expr: { $eq: ["$medium", "$medium_zh"] },
        medium: { $ne: "" },
        medium_zh: { $exists: true }
    });
    console.log(`medium_zh 等于 medium 的记录数: ${sameMediumCount}`);

    // 检查 attribution_zh 等于 attribution 的情况
    const sameAttributionCount = await ObjectModel.countDocuments({
        $expr: { $eq: ["$attribution", "$attribution_zh"] },
        attribution: { $ne: "" },
        attribution_zh: { $exists: true }
    });
    console.log(`attribution_zh 等于 attribution 的记录数: ${sameAttributionCount}`);

    // 抽样检查 title_zh 等于 title 的记录
    if (sameTitleCount > 0) {
        const samples = await ObjectModel.find({
            $expr: { $eq: ["$title", "$title_zh"] },
            title: { $ne: "" }
        }).limit(5).lean();
        
        console.log('\n📋 样本 (title == title_zh):');
        samples.forEach((doc: any) => {
            console.log(`ID: ${doc.object_id}, Title: "${doc.title}"`);
        });
    }

    await mongoose.disconnect();
}

checkUntranslatedZhFields();