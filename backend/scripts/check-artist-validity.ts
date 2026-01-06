import mongoose from 'mongoose';
import { config } from '../src/config';
import { ObjectModel } from '../src/models/schemas';

const TOP_ARTISTS_EN = [
    'Van Gogh', 'Monet', 'Picasso', 'Da Vinci', 'Rembrandt', 'Vermeer', 'Cézanne', 
    'Renoir', 'Degas', 'Gauguin', 'Manet', 'Matisse', 'Dali', 'Warhol', 'Klimt',
    'Munch', 'O\'Keeffe', 'Kahlo', 'Pollock', 'Rothko', 'Hopper', 'Whistler',
    'Sargent', 'Homer', 'Eakins', 'Cassatt', 'Rodin', 'Michelangelo', 'Raphael',
    'Dürer', 'Goya', 'Velázquez', 'El Greco', 'Rubens', 'Bosch', 'Bruegel',
    'Caravaggio', 'Bernini', 'Titian', 'Botticelli', 'Giotto', 'Modigliani',
    'Chagall', 'Kandinsky', 'Mondrian', 'Malevich', 'Miró', 'Magritte', 'Seurat',
    'Signac', 'Pissarro', 'Sisley', 'Morisot', 'Courbet', 'Millet', 'Rousseau',
    'Delacroix', 'Ingres', 'David', 'Turner', 'Constable', 'Blake', 'Friedrich',
    'Hokusai', 'Hiroshige', 'Utamaro', 'Kuniyoshi', 'Hockney', 'Basquiat', 'Haring',
    'Kusama', 'Murakami', 'Ai Weiwei', 'Xu Bing', 'Cai Guo-Qiang', 'Zhang Xiaogang',
    'Lichtenstein', 'Koons', 'Hirst', 'Banksy', 'Sherman', 'Holzer', 'Kruger',
    'Bourgeois', 'Nevelson', 'Frankenthaler', 'Mitchell', 'Martin', 'Ryman',
    'Stella', 'Kelly', 'LeWitt', 'Judd', 'Andre', 'Flavin', 'Turrell'
];

async function checkArtistCounts() {
    try {
        await mongoose.connect(config.database.uri);
        console.log('✅ Connected to DB');

        const validArtists = [];
        const invalidArtists = [];

        console.log('Checking artist counts...');
        for (const artist of TOP_ARTISTS_EN) {
            const count = await ObjectModel.countDocuments({ attribution: { $regex: artist, $options: 'i' } });
            if (count > 0) {
                validArtists.push({ name: artist, count });
            } else {
                invalidArtists.push(artist);
            }
        }

        console.log('\n❌ Invalid Artists (0 records):');
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

checkArtistCounts();