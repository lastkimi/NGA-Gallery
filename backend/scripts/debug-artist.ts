import mongoose from 'mongoose';
import { config } from '../src/config';
import { ObjectModel } from '../src/models/schemas';

async function checkHokusai() {
    try {
        await mongoose.connect(config.database.uri);
        console.log('✅ Connected to DB');

        // Check Gogh
        const gogh = await ObjectModel.countDocuments({ attribution: { $regex: 'Gogh', $options: 'i' } });
        console.log(`Found ${gogh} Gogh records`);

        // Check Monet
        const monet = await ObjectModel.countDocuments({ attribution: { $regex: 'Monet', $options: 'i' } });
        console.log(`Found ${monet} Monet records`);

        // Check random 10 attributions
        console.log('\nRandom 10 attributions:');
        const random = await ObjectModel.aggregate([{ $sample: { size: 10 } }, { $project: { attribution: 1 } }]);
        random.forEach(r => console.log(`- "${r.attribution}"`));
        
        // Search for anything starting with 'Katsushika'
        const katsushika = await ObjectModel.find({ attribution: { $regex: 'Katsushika', $options: 'i' } }).limit(5).select('attribution');
        console.log(`\nFound ${katsushika.length} Katsushika records:`);
        katsushika.forEach(r => console.log(`- "${r.attribution}"`));


    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

checkHokusai();