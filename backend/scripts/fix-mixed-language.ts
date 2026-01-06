import mongoose from 'mongoose';
import { config } from '../src/config';
import { ObjectModel } from '../src/models/schemas';

async function fixMixedLanguage() {
    await mongoose.connect(config.database.uri);
    console.log('✅ 连接数据库...');

    // 1. 查找包含英文字母的 title_zh
    // 注意：MongoDB Regex 不支持 \u 语法，我们先查出所有含英文的，再在 JS 中过滤
    const cursor = ObjectModel.find({
        title_zh: { $regex: /[a-zA-Z]/ }
    }).cursor();

    let count = 0;
    let updates = [];
    const BATCH_SIZE = 1000;

    // 正则：包含汉字
    const hasChinese = /[\u4e00-\u9fa5]/;

    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
        const titleZh = doc.title_zh as string;
        
        // 如果包含汉字 且 包含英文
        if (hasChinese.test(titleZh)) {
            // 排除一些特殊情况（如 "C-print", "No. 5" 等可能合法的混合）
            // 这里我们严格一点：只要夹杂了就重置，宁可错杀重新翻译
            
            updates.push(doc._id);
            count++;
            
            if (count <= 10) {
                console.log(`样本 ID: ${doc.object_id}, ZH: "${titleZh}"`);
            }

            if (updates.length >= BATCH_SIZE) {
                await ObjectModel.updateMany(
                    { _id: { $in: updates } },
                    { $unset: { title_zh: "" } }
                );
                console.log(`已重置 ${updates.length} 条记录...`);
                updates = [];
            }
        }
    }

    if (updates.length > 0) {
        await ObjectModel.updateMany(
            { _id: { $in: updates } },
            { $unset: { title_zh: "" } }
        );
        console.log(`已重置 ${updates.length} 条记录...`);
    }

    console.log(`\n📚 总共重置 ${count} 条夹杂记录`);

    // 针对用户反馈的 ID 46505 再次确认
    const specific = await ObjectModel.updateOne(
        { object_id: "46505" },
        { $unset: { title_zh: "" } }
    );
    if (specific.modifiedCount > 0) {
        console.log('✅ 已强制重置 ID 46505');
    }

    await mongoose.disconnect();
    console.log('\n🎉 修复脚本完成，请运行 translate-ultimate.ts 重新翻译。');
}

fixMixedLanguage();