import mongoose from 'mongoose';
import { config } from '../src/config';
import { ObjectModel } from '../src/models/schemas';

async function checkTranslationQuality() {
    try {
        await mongoose.connect(config.database.uri);
        
        // 随机获取10条已翻译的数据
        const samples = await ObjectModel.aggregate([
            { $match: { title_zh: { $exists: true, $ne: '' } } },
            { $sample: { size: 10 } },
            { $project: {
                object_id: 1,
                title: 1,
                title_zh: 1,
                medium: 1,
                medium_zh: 1,
                attribution: 1,
                attribution_zh: 1,
                classification: 1,
                classification_zh: 1
            }}
        ]);

        console.log('\n=== 翻译质量抽查 (随机10条) ===');
        samples.forEach((doc, i) => {
            console.log(`\n[${i+1}] ID: ${doc.object_id}`);
            console.log(`Title: ${doc.title} -> ${doc.title_zh}`);
            console.log(`Medium: ${doc.medium} -> ${doc.medium_zh}`);
            console.log(`Attr: ${doc.attribution} -> ${doc.attribution_zh}`);
            console.log(`Class: ${doc.classification} -> ${doc.classification_zh}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

checkTranslationQuality();