import mongoose from 'mongoose';
import { config } from '../src/config';
import { ObjectModel } from '../src/models/schemas';

async function verifyDali() {
    try {
        await mongoose.connect(config.database.uri);
        console.log('✅ Connected to DB');

        // Check explicit Salvador Dali
        const salvador = await ObjectModel.countDocuments({ attribution: { $regex: 'Salvador Dali', $options: 'i' } });
        console.log(`Found ${salvador} 'Salvador Dali' records`);

        // Check word boundary Dali
        // Regex: \bDali\b case insensitive
        // In Mongo regex: use \\b
        const boundaried = await ObjectModel.find({ 
            attribution: { $regex: '\\bDali\\b', $options: 'i' } 
        }).select('attribution title').limit(20).lean();

        console.log(`\nFound ${boundaried.length} '\\bDali\\b' records. Examples:`);
        boundaried.forEach(r => console.log(`- "${r.attribution}"`));

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

verifyDali();