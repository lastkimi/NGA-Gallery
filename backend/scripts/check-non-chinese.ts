import mongoose from 'mongoose';
import { config } from '../src/config';
import { ObjectModel } from '../src/models/schemas';

async function checkNonChineseTranslations() {
    await mongoose.connect(config.database.uri);
    console.log('✅ 连接数据库...');

    console.log('正在扫描无中文的翻译...');
    
    // 使用游标遍历，在应用层检查
    const cursor = ObjectModel.find({
        $or: [
            { title_zh: { $exists: true, $ne: '' } },
            { medium_zh: { $exists: true, $ne: '' } },
            { attribution_zh: { $exists: true, $ne: '' } }
        ]
    }).cursor();

    let noChineseTitle = 0;
    let noChineseMedium = 0;
    let noChineseAttribution = 0;
    let totalScanned = 0;
    const chineseRegex = /[\u4e00-\u9fa5]/;

    const idsToFix: any[] = [];

    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
        totalScanned++;
        let needsFix = false;

        if (doc.title_zh && !chineseRegex.test(doc.title_zh)) {
            noChineseTitle++;
            needsFix = true;
        }
        if (doc.medium_zh && !chineseRegex.test(doc.medium_zh)) {
            noChineseMedium++;
            needsFix = true;
        }
        if (doc.attribution_zh && !chineseRegex.test(doc.attribution_zh)) {
            noChineseAttribution++;
            needsFix = true;
        }

        if (needsFix) {
            idsToFix.push(doc._id);
        }

        if (totalScanned % 10000 === 0) {
            process.stdout.write(`\r已扫描: ${totalScanned}`);
        }
    }

    console.log(`\n\n=== 扫描结果 ===`);
    console.log(`标题无中文: ${noChineseTitle}`);
    console.log(`材质无中文: ${noChineseMedium}`);
    console.log(`作者无中文: ${noChineseAttribution}`);
    console.log(`需要修复的记录总数: ${idsToFix.length}`);

    if (idsToFix.length > 0) {
        console.log('\n是否要清除这些记录的翻译并重新翻译？(需要修改脚本执行)');
        // 可以在这里执行清除操作，但为了安全先只打印
        // await clearTranslations(idsToFix);
    }

    await mongoose.disconnect();
}

async function clearTranslations(ids: any[]) {
    console.log('正在清除无效翻译...');
    const result = await ObjectModel.updateMany(
        { _id: { $in: ids } },
        { 
            $unset: { 
                title_zh: "", 
                medium_zh: "", 
                attribution_zh: "",
                display_date_zh: "", // 日期可能不需要中文，但如果有问题也一起重置
                dimensions_zh: ""
            } 
        }
    );
    console.log(`已清除 ${result.modifiedCount} 条记录的翻译字段`);
}

checkNonChineseTranslations();