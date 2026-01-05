import { CONFIG } from './config.js';

class DataService {
    constructor() {
        this.allArtworks = [];
        this.filteredArtworks = [];
        this.currentPage = 0;
    }

    async init() {
        try {
            const response = await fetch('mock_data.json');
            const baseData = await response.json();
            

            this.allArtworks = Array.from({ length: 1200 }, (_, i) => {
                const template = baseData[i % baseData.length];
                return {
                    ...template,
                    id: i + 1,
                    title: i >= baseData.length ? `${template.title} (Vol. ${Math.floor(i/baseData.length)})` : template.title
                };
            });
            
            this.filteredArtworks = [...this.allArtworks];
        } catch (error) {
            console.error("Failed to load collection data", error);
        }
    }

    getNextBatch() {
        const start = this.currentPage * CONFIG.MAX_ITEMS_PER_PAGE;
        const end = start + CONFIG.MAX_ITEMS_PER_PAGE;
        const items = this.filteredArtworks.slice(start, end);
        this.currentPage++;
        return items;
    }

    search(query, filters = {}) {
        this.currentPage = 0;
        const q = query.toLowerCase();
        
        this.filteredArtworks = this.allArtworks.filter(art => {
            const matchesQuery = !q || 
                art.title.toLowerCase().includes(q) || 
                art.artist.toLowerCase().includes(q);
            
            const matchesClass = !filters.classification || 
                art.classification === filters.classification;
            
            const matchesPeriod = !filters.period || 
                this.checkPeriod(art.date, filters.period);

            return matchesQuery && matchesClass && matchesPeriod;
        });
        
        return this.getNextBatch();
    }

    getRelatedArtworks(currentArt, limit = 4) {

        return this.allArtworks
            .filter(art => art.id !== currentArt.id)
            .filter(art => art.artist === currentArt.artist || art.classification === currentArt.classification)
            .sort(() => 0.5 - Math.random())
            .slice(0, limit);
    }

    checkPeriod(dateStr, period) {
        if (!period) return true;
        const yearMatch = new RegExp('[0-9]{4}').exec(dateStr);
        if (!yearMatch) return false;
        const year = parseInt(yearMatch[0]);

        switch(period) {
            case 'Renaissance': return year >= 1400 && year < 1600;
            case 'Baroque': return year >= 1600 && year < 1750;
            case 'Modern': return year >= 1850 && year < 1950;
            case 'Contemporary': return year >= 1950;
            default: return true;
        }
    }
}

export const dataService = new DataService();
