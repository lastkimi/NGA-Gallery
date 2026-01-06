import mongoose from 'mongoose';
import { config } from '../src/config';
import { ObjectModel } from '../src/models/schemas';
import fs from 'fs';
import path from 'path';

const CACHE_FILE = path.join(__dirname, '../cache.json');
const TARGET_LOCALE = 'zh';

async function applyCacheToDB() {
  try {
    console.log('📦 Loading cache...');
    if (!fs.existsSync(CACHE_FILE)) {
        console.log('No cache file found.');
        return;
    }
    const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
    const cacheMap = new Map(Object.entries(JSON.parse(raw)));
    console.log(`✅ Loaded ${cacheMap.size} cached terms.`);

    await mongoose.connect(config.database.uri);
    console.log('Connected to MongoDB.');

    // We process all documents that don't have a 'zh' translation yet, OR partial translation
    // Actually, just iterating all is safer to ensure coverage, but slow.
    // Let's iterate those missing translation first.
    const query = { 'translations.locale': { $ne: TARGET_LOCALE } };
    const total = await ObjectModel.countDocuments(query);
    console.log(`Documents pending translation: ${total}`);

    const cursor = ObjectModel.find(query).cursor();
    const bulkOps: any[] = [];
    const BATCH_SIZE = 1000;
    let processed = 0;
    let matched = 0;

    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
        const translations: any = {};
        let hasNewTranslation = false;

        ['title', 'attribution', 'medium', 'provenance', 'credit_line', 'display_date'].forEach(field => {
            const val = doc[field];
            if (val && typeof val === 'string') {
                const cleanVal = val.trim();
                const cacheKey = cleanVal.toLowerCase();
                if (cacheMap.has(cacheKey)) {
                    translations[field] = cacheMap.get(cacheKey);
                    hasNewTranslation = true;
                }
            }
        });

        if (hasNewTranslation) {
            bulkOps.push({
                updateOne: {
                    filter: { _id: doc._id },
                    update: {
                        $push: {
                            translations: {
                                locale: TARGET_LOCALE,
                                ...translations
                            }
                        },
                        $set: { updated_at: new Date() }
                    }
                }
            });
            matched++;
        }

        if (bulkOps.length >= BATCH_SIZE) {
            await ObjectModel.bulkWrite(bulkOps);
            processed += bulkOps.length;
            bulkOps.length = 0;
            process.stdout.write(`\rApplied cache to ${processed} documents...`);
        }
    }

    if (bulkOps.length > 0) {
        await ObjectModel.bulkWrite(bulkOps);
        processed += bulkOps.length;
    }

    console.log(`\n🎉 Finished! Applied translations to ${processed} documents.`);

  } catch (e) {
    console.error(e);
  } finally {
    await mongoose.disconnect();
  }
}

applyCacheToDB();
