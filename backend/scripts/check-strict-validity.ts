import mongoose from 'mongoose';
import { config } from '../src/config';
import { ObjectModel } from '../src/models/schemas';

const CANDIDATE_ARTISTS = [
    'Van Gogh', 'Monet', 'Picasso', 'Da Vinci', 'Rembrandt', 'Vermeer', 
    'Renoir', 'Degas', 'Gauguin', 'Manet', 'Matisse', 'Dali', 'Warhol', 'Klimt',
    'Munch', 'O\'Keeffe', 'Pollock', 'Rothko', 'Hopper', 'Whistler',
    'Sargent', 'Homer', 'Eakins', 'Cassatt', 'Rodin', 'Michelangelo', 'Raphael',
    'Dürer', 'Goya', 'Velázquez', 'El Greco', 'Rubens', 'Bosch', 'Bruegel',
    'Caravaggio', 'Bernini', 'Titian', 'Botticelli', 'Modigliani',
    'Chagall', 'Kandinsky', 'Miró', 'Magritte', 'Seurat',
    'Signac', 'Pissarro', 'Sisley', 'Morisot', 'Courbet', 'Millet', 'Rousseau',
    'Delacroix', 'Ingres', 'David', 'Turner', 'Constable', 'Blake', 'Friedrich',
    'Kuniyoshi', 'Hockney', 
    'Lichtenstein', 'Hirst', 'Sherman', 'Holzer', 'Kruger',
    'Bourgeois', 'Nevelson', 'Frankenthaler', 'Mitchell', 'Martin', 'Ryman',
    'Stella', 'Kelly', 'LeWitt', 'Judd', 'Andre', 'Flavin', 'Turrell'
];

async function checkStrictCounts() {
    try {
        await mongoose.connect(config.database.uri);
        console.log('✅ Connected to DB');

        const validArtists = [];
        const invalidArtists = [];

        console.log('Checking artist counts (strict matching)...');
        for (const artist of CANDIDATE_ARTISTS) {
            // Escape special regex chars like '
            const safeName = artist.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            
            // Construct regex: strict word boundaries
            // But handle cases like "O'Keeffe" where ' might be a boundary or part of word depending on engine.
            // For safety, we use: (^|[^a-zA-Z0-9])${name}([^a-zA-Z0-9]|$) logic roughly
            // In Mongo regex, \b usually works well for standard latin names.
            const regex = new RegExp(`\\b${safeName}\\b`, 'i');
            
            const count = await ObjectModel.countDocuments({ attribution: { $regex: regex } });
            
            if (count > 0) {
                validArtists.push({ name: artist, count });
            } else {
                // Try fuzzy check for Dali -> Dalí
                if (artist === 'Dali') {
                     const countAccent = await ObjectModel.countDocuments({ attribution: { $regex: /Dal[íi]/i } });
                     console.log(`Dali strict: ${count}, Dali fuzzy: ${countAccent}`);
                }
                invalidArtists.push(artist);
            }
        }

        console.log('\n❌ Invalid Artists (0 strict matches):');
        console.log(JSON.stringify(invalidArtists, null, 2));

        console.log('\n✅ Valid Artists (sorted by count):');
        validArtists.sort((a, b) => b.count - a.count);
        console.log(JSON.stringify(validArtists.map(a => `${a.name}: ${a.count}`), null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

checkStrictCounts();