#!/usr/bin/env node
/**
 * 导入100条测试数据（包含图片）
 */

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'nga_museum',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
};

// 生成100条测试数据
const artists = [
  'Vincent van Gogh', 'Claude Monet', 'Pablo Picasso', 'Salvador Dalí', 
  'Edvard Munch', 'Leonardo da Vinci', 'Michelangelo', 'Rembrandt',
  'Johannes Vermeer', 'Paul Cézanne', 'Henri Matisse', 'Wassily Kandinsky',
  'Jackson Pollock', 'Andy Warhol', 'Frida Kahlo', 'Georgia O\'Keeffe',
  'Gustav Klimt', 'Edgar Degas', 'Pierre-Auguste Renoir', 'Paul Gauguin'
];

const classifications = ['Painting', 'Sculpture', 'Drawing', 'Print', 'Photograph'];
const departments = ['CIS-R', 'CIS-E', 'CIS-A', 'CIS-S', 'CIS-P'];
const mediums = [
  'Oil on canvas', 'Watercolor on paper', 'Bronze', 'Marble', 
  'Charcoal on paper', 'Ink on paper', 'Photographic print', 'Mixed media'
];

function generateTestObjects(count) {
  const objects = [];
  const startYear = 1500;
  
  for (let i = 1; i <= count; i++) {
    const year = startYear + Math.floor(Math.random() * 500);
    const artist = artists[Math.floor(Math.random() * artists.length)];
    const classification = classifications[Math.floor(Math.random() * classifications.length)];
    const department = departments[Math.floor(Math.random() * departments.length)];
    const medium = mediums[Math.floor(Math.random() * mediums.length)];
    
    objects.push({
      object_id: `TEST.${i.toString().padStart(3, '0')}`,
      accession_number: `TEST.${i.toString().padStart(3, '0')}`,
      title: `Test Artwork ${i}`,
      display_date: year.toString(),
      begin_year: year,
      end_year: year + Math.floor(Math.random() * 5),
      timespan: `${Math.floor(year / 100) * 100}s`,
      medium: medium,
      dimensions: `${Math.floor(Math.random() * 200) + 50} × ${Math.floor(Math.random() * 200) + 50} cm`,
      attribution_inverted: artist.split(' ').reverse().join(', '),
      attribution: artist,
      provenance: 'Test Collection',
      credit_line: 'Test Credit Line',
      classification: classification,
      sub_classification: classification === 'Painting' ? 'Figure' : null,
      visual_classification: classification,
      department: department,
      wikidata_id: null,
      custom_print_url: '',
    });
  }
  
  return objects;
}

async function importTestData() {
  const pool = new Pool(DB_CONFIG);
  
  try {
    console.log('连接数据库...');
    await pool.query('SELECT 1');
    console.log('数据库连接成功\n');
    
    // 清空现有测试数据（可选）
    console.log('清理现有测试数据...');
    await pool.query("DELETE FROM images WHERE uuid LIKE 'test-image-%'");
    await pool.query("DELETE FROM objects WHERE object_id LIKE 'TEST.%'");
    console.log('清理完成\n');
    
    // 生成100条测试对象
    const testObjects = generateTestObjects(100);
    
    console.log('导入测试藏品数据...');
    let importedObjects = 0;
    const objectIdMap = new Map(); // object_id -> database id
    
    for (const obj of testObjects) {
      try {
        const result = await pool.query(`
          INSERT INTO objects (
            object_id, accession_number, title, display_date, begin_year, end_year,
            timespan, medium, dimensions, attribution_inverted, attribution,
            provenance, credit_line, classification, sub_classification,
            visual_classification, department, wikidata_id, custom_print_url
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
          ON CONFLICT (object_id) DO UPDATE SET
            title = EXCLUDED.title,
            updated_at = CURRENT_TIMESTAMP
          RETURNING id
        `, [
          obj.object_id, obj.accession_number, obj.title, obj.display_date,
          obj.begin_year, obj.end_year, obj.timespan, obj.medium, obj.dimensions,
          obj.attribution_inverted, obj.attribution, obj.provenance, obj.credit_line,
          obj.classification, obj.sub_classification, obj.visual_classification,
          obj.department, obj.wikidata_id, obj.custom_print_url
        ]);
        
        const dbId = result.rows[0].id;
        objectIdMap.set(obj.object_id, dbId);
        importedObjects++;
      } catch (err) {
        console.error(`Error importing object ${obj.object_id}:`, err.message);
      }
    }
    console.log(`成功导入 ${importedObjects}/${testObjects.length} 件藏品\n`);
    
    // 为每个对象添加图片
    console.log('添加测试图片数据...');
    let addedImages = 0;
    
    for (const obj of testObjects) {
      const objectDbId = objectIdMap.get(obj.object_id);
      if (!objectDbId) continue;
      
      // 使用占位图片服务（placeholder.com 或类似服务）
      const imageNum = parseInt(obj.object_id.split('.')[1]);
      const imageUrl = `https://picsum.photos/800/600?random=${imageNum}`;
      const thumbUrl = `https://picsum.photos/400/400?random=${imageNum}`;
      
      try {
        await pool.query(`
          INSERT INTO images (
            uuid, object_id, iiif_url, iiif_thumb_url, view_type, sequence,
            width, height, max_pixels, assistive_text
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (uuid) DO UPDATE SET
            iiif_url = EXCLUDED.iiif_url,
            iiif_thumb_url = EXCLUDED.iiif_thumb_url
        `, [
          `test-image-${obj.object_id}`,
          objectDbId,
          imageUrl, // 使用占位图片URL
          thumbUrl,
          'primary',
          1,
          800,
          600,
          480000,
          `${obj.title} by ${obj.attribution}`
        ]);
        addedImages++;
      } catch (err) {
        console.error(`Error adding image for ${obj.object_id}:`, err.message);
      }
    }
    console.log(`成功添加 ${addedImages} 张图片\n`);
    
    // 统计
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM objects) as totalObjects,
        (SELECT COUNT(*) FROM images) as totalImages,
        (SELECT COUNT(DISTINCT object_id) FROM images) as objects_with_images
      FROM objects
      LIMIT 1
    `);
    
    console.log('=== 导入完成 ===');
    console.log(`数据库统计:`);
    console.log(`  藏品总数: ${stats.rows[0].totalobjects}`);
    console.log(`  图片总数: ${stats.rows[0].totalimages}`);
    console.log(`  有图片的藏品: ${stats.rows[0].objects_with_images}`);
    
  } catch (error) {
    console.error('导入错误:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

importTestData().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
