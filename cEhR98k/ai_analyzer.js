import { CONFIG } from './config.js';

class AIAnalyzer {
    async analyzeArtwork(artwork) {
        const prompt = `As a curator at the National Gallery of Art, provide a brief (3-4 sentences) art historical analysis of the following work:
        Title: ${artwork.title}
        Artist: ${artwork.artist}
        Date: ${artwork.date}
        Medium: ${artwork.medium}
        
        Focus on the significance of the work and its stylistic characteristics.`;

        try {
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${CONFIG.OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "model": "deepseek/deepseek-chat-v3-0324:free",
                    "messages": [
                        { "role": "user", "content": prompt }
                    ]
                })
            });

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            return "This masterpiece represents a significant contribution to the National Gallery's collection, demonstrating the artist's unique technical mastery and historical relevance during the " + artwork.date + " period.";
        }
    }
}

export const aiAnalyzer = new AIAnalyzer();
