import mongoose from 'mongoose';
import { config } from '../src/config';
import { ObjectModel } from '../src/models/schemas';

async function investigateDali() {
    try {
        await mongoose.connect(config.database.uri);
        console.log('✅ Connected to DB');

        console.log('\n--- Checking "Dali" matches ---');
        // Search for anything matching 'Dali'
        const daliMatches = await ObjectModel.find({ 
            attribution: { $regex: 'Dali', $options: 'i' } 
        }).limit(20).select('attribution title classification medium').lean();

        console.log(`Found ${daliMatches.length} records matching "Dali":`);
        daliMatches.forEach(r => {
            console.log(`- Attrib: "${r.attribution}" | Title: "${r.title}" | Class: "${r.classification}" | Medium: "${r.medium}"`);
        });

        console.log('\n--- Checking specific "Salvador Dali" matches ---');
        const salvadorMatches = await ObjectModel.find({ 
            attribution: { $regex: 'Salvador Dalí', $options: 'i' } 
        }).limit(20).select('attribution title').lean();
        
        console.log(`Found ${salvadorMatches.length} records matching "Salvador Dalí":`);
        salvadorMatches.forEach(r => console.log(`- "${r.attribution}" - "${r.title}"`));

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

investigateDali();