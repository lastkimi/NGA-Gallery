import mongoose from 'mongoose';
import { config } from '../src/config';
import { ObjectModel } from '../src/models/schemas';
import fetch from 'node-fetch';

// Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const TARGET_LOCALE = 'zh'; // Chinese
const BATCH_SIZE = 50;
const DELAY_MS = 200; // Rate limiting

// Simple translation fallback dictionary for common art terms
const ART_TERMS_DICTIONARY: Record<string, string> = {
  'oil on canvas': '布面油画',
  'oil on panel': '木板油画',
  'oil on copper': '铜板油画',
  'tempera on panel': '木板蛋彩画',
  'tempera on wood': '木板蛋彩画',
  'watercolor on paper': '纸本水彩',
  'graphite on paper': '纸本石墨素描',
  'chalk on paper': '纸本粉彩',
  'ink on paper': '纸本水墨',
  'etching': '蚀刻版画',
  'lithograph': '石版画',
  'woodcut': '木刻版画',
  'engraving': '雕版版画',
  'mezzotint': '金属版画',
  'photograph': '摄影作品',
  'marble': '大理石',
  'bronze': '青铜',
  'terracotta': '陶土',
  'plaster': '石膏',
  'gilded': '镀金',
  'mounted': '装裱',
  'framed': '装框',
  'canvas': '画布',
  'panel': '木板',
  'paper': '纸',
  'canvas.': '画布',
  'paper.': '纸',
  'panel.': '木板',
  'in.': '英寸',
  'cm.': '厘米',
  'Painting': '绘画',
  'Sculpture': '雕塑',
  'Drawing': '素描',
  'Print': '版画',
  'Photograph': '摄影',
  'Decorative Arts': '装饰艺术',
};

async function translateWithOpenAI(texts: string[]): Promise<string[]> {
  if (!OPENAI_API_KEY) {
    throw new Error('No OpenAI API key provided');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a professional art translator. Translate the following art terms and descriptions to ${TARGET_LOCALE === 'zh' ? 'Simplified Chinese' : TARGET_LOCALE}. 
          Keep the translation accurate and natural. For artist names, keep them in English or Pinyin if commonly used. 
          For medium descriptions, translate technical terms but keep measurements in original format.
          Return only the translated texts, one per line, in the same order.`
        },
        {
          role: 'user',
          content: texts.join('\n')
        }
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error('No translation received from OpenAI');
  }

  return content.split('\n').map((line: string) => line.trim());
}

async function simpleTranslate(text: string): Promise<string> {
  // Use dictionary for common terms
  let translated = text;
  for (const [eng, chn] of Object.entries(ART_TERMS_DICTIONARY)) {
    const regex = new RegExp(eng, 'gi');
    translated = translated.replace(regex, chn);
  }
  return translated;
}

async function translateText(text: string): Promise<string> {
  if (!text || text.trim().length === 0) return text;
  
  // Try OpenAI first if available
  if (OPENAI_API_KEY) {
    try {
      const results = await translateWithOpenAI([text]);
      return results[0];
    } catch (error) {
      console.warn('OpenAI translation failed, using simple translation:', error);
    }
  }
  
  // Fallback to simple dictionary translation
  return simpleTranslate(text);
}

async function translateArtwork(artwork: any): Promise<any> {
  const fieldsToTranslate = [
    'title',
    'attribution',
    'medium',
    'provenance',
    'credit_line',
    'display_date',
  ];

  const translations: any = {};

  for (const field of fieldsToTranslate) {
    if (artwork[field]) {
      translations[field] = await translateText(artwork[field]);
    }
  }

  return translations;
}

async function processBatch(objects: any[]) {
  const updates = await Promise.all(objects.map(async (obj) => {
    try {
      const translations = await translateArtwork(obj);
      
      // Check if translation is different from original
      const hasTranslation = Object.values(translations).some(v => v && v !== obj.title && v !== obj.attribution);
      
      if (!hasTranslation) {
        return { id: obj._id, skipped: true };
      }

      // Find or create translation entry for target locale
      const existingTranslation = obj.translations?.find((t: any) => t.locale === TARGET_LOCALE) || {};
      
      return {
        id: obj._id,
        update: {
          $push: {
            translations: {
              $each: [{
                locale: TARGET_LOCALE,
                ...translations,
              }],
              $position: 0,
            },
          },
          $set: {
            updated_at: new Date(),
          },
        },
      };
    } catch (error) {
      console.error(`Error processing artwork ${obj.object_id}:`, error);
      return { id: obj._id, error };
    }
  }));

  // Perform updates
  for (const result of updates) {
    if (result.skipped || result.error) continue;
    
    try {
      await ObjectModel.updateOne(
        { _id: result.id },
        result.update
      );
    } catch (error) {
      console.error(`Error updating artwork ${result.id}:`, error);
    }
  }
}

async function translateAllArtworks() {
  try {
    await mongoose.connect(config.database.uri);
    console.log('Connected to MongoDB');

    // Get total count
    const total = await ObjectModel.countDocuments({
      'translations.locale': { $ne: TARGET_LOCALE }
    });
    console.log(`Found ${total} artworks to translate`);

    let processed = 0;
    let skip = 0;

    while (processed < total) {
      const objects = await ObjectModel.find({
        'translations.locale': { $ne: TARGET_LOCALE }
      })
      .select('object_id title attribution medium provenance credit_line display_date translations')
      .skip(processed)
      .limit(BATCH_SIZE);

      if (objects.length === 0) break;

      console.log(`Processing batch ${processed / BATCH_SIZE + 1} (${objects.length} items)...`);
      
      await processBatch(objects);
      
      processed += objects.length;
      skip = 0; // Reset skip counter
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }

    console.log(`\nTranslation complete! Processed ${processed} artworks.`);

  } catch (error) {
    console.error('Translation failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

// Run translation
translateAllArtworks().catch(console.error);
