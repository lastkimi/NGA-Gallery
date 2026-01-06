import mongoose from 'mongoose';
import { config } from '../src/config';
import { ObjectModel } from '../src/models/schemas';

async function debugArtistMatches() {
    try {
        await mongoose.connect(config.database.uri);
        console.log('✅ Connected to DB');

        const artistsToCheck = ['Dali', 'Manet', 'Kelly', 'Stella', 'Robert', 'David', 'Cole']; // Names that might be substrings

        for (const artist of artistsToCheck) {
            console.log(`\n--- Checking matches for "${artist}" ---`);
            const results = await ObjectModel.find({ 
                attribution: { $regex: artist, $options: 'i' } 
            }).limit(20).select('attribution title').lean();

            results.forEach(r => {
                const isSuspicious = !r.attribution?.toLowerCase().includes(artist.toLowerCase()); // Simple check, but regex matched it so it must contain it.
                // We want to see what it actually matched.
                console.log(`[${artist}] Attribution: "${r.attribution}"`);
            });
        }

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

debugArtistMatches();