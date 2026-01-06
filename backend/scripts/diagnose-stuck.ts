import mongoose from 'mongoose';
import { config } from '../src/config';
import { ObjectModel } from '../src/models/schemas';

async function diagnoseStuckRecords() {
    await mongoose.connect(config.database.uri);
    console.log('✅ 连接数据库...');

    const query = {
        $or: [
            { title_zh: { $exists: false } },
            { title_zh: null },
            { title_zh: "" },
            
            { medium_zh: { $exists: false } },
            { medium_zh: null },
            { medium_zh: "" },
            
            { attribution_zh: { $exists: false } },
            { attribution_zh: null },
            { attribution_zh: "" }
        ]
    };

    const count = await ObjectModel.countDocuments(query);
    console.log(`\n🔍 剩余待处理记录: ${count}`);

    if (count > 0) {
        // 获取前 5 条样本
        const samples = await ObjectModel.find(query).limit(5).lean();
        
        console.log('\n📋 样本分析 (前 5 条):');
        samples.forEach((doc: any, i) => {
            console.log(`\n--- 样本 ${i + 1} (ID: ${doc.object_id}) ---`);
            console.log(`Title (EN): "${doc.title}"`);
            console.log(`Title (ZH): "${doc.title_zh}" (Type: ${typeof doc.title_zh})`);
            console.log(`Medium (EN): "${doc.medium}"`);
            console.log(`Medium (ZH): "${doc.medium_zh}" (Type: ${typeof doc.medium_zh})`);
            console.log(`Attribution (EN): "${doc.attribution}"`);
            console.log(`Attribution (ZH): "${doc.attribution_zh}" (Type: ${typeof doc.attribution_zh})`);
        });

        // 尝试分析原因
        console.log('\n🤔 可能的原因分析:');
        const emptyTitle = await ObjectModel.countDocuments({ ...query, title: { $in: [null, ""] } });
        const emptyMedium = await ObjectModel.countDocuments({ ...query, medium: { $in: [null, ""] } });
        const emptyAttribution = await ObjectModel.countDocuments({ ...query, attribution: { $in: [null, ""] } });
        
        console.log(`- 原文 Title 为空: ${emptyTitle}`);
        console.log(`- 原文 Medium 为空: ${emptyMedium}`);
        console.log(`- 原文 Attribution 为空: ${emptyAttribution}`);
    }

    await mongoose.disconnect();
}

diagnoseStuckRecords();