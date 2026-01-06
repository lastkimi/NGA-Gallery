#!/usr/bin/env node
/**
 * 只导入图片数据（对象和艺术家已导入）
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'nga_museum',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
};

const DATA_DIR = path.join(__dirname, '../../data/raw/opendata/data');

function processImages(records) {
  return records.map(record => ({
    uuid: record.uuid,
    iiif_url: record.iiifurl,
    iiif_thumb_url: record.iiifthumburl,
    view_type: record.viewtype || 'primary',
    sequence: record.sequence ? parseInt(record.sequence) : 1,
    width: record.width ? parseInt(record.width) : null,
    height: record.height ? parseInt(record.height) : null,
    max_pixels: record.maxpixels ? parseInt(record.maxpixels) : null,
    object_id: record.depictstmsobjectid ? String(record.depictstmsobjectid) : null,
    assistive_text: record.assistivetext || null,
  }));
}

async function importImages() {
  const pool = new Pool(DB_CONFIG);
  
  try {
    console.log('连接数据库...');
    await pool.query('SELECT 1');
    console.log('数据库连接成功\n');
    
    // 读取图片CSV
    console.log('读取图片CSV...');
    const filePath = path.join(DATA_DIR, 'published_images.csv');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    console.log(`读取到 ${records.length} 条图片记录\n`);
    
    const images = processImages(records);
    const imagesWithObjectId = images.filter(img => img.object_id);
    console.log(`有object_id的图片: ${imagesWithObjectId.length}\n`);
    
    // 获取object_id到id的映射
    console.log('获取object_id映射...');
    const objectIdMap = new Map();
    const objectIds = [...new Set(imagesWithObjectId.map(img => img.object_id))];
    console.log(`需要映射的object_id数量: ${objectIds.length}\n`);
    
    // 分批查询
    const batchSize = 5000;
    for (let i = 0; i < objectIds.length; i += batchSize) {
      const batch = objectIds.slice(i, i + batchSize);
      const placeholders = batch.map((_, idx) => `$${idx + 1}`).join(',');
      const objectResult = await pool.query(
        `SELECT id, object_id FROM objects WHERE object_id IN (${placeholders})`,
        batch
      );
      objectResult.rows.forEach(row => {
        objectIdMap.set(String(row.object_id), row.id);
      });
      console.log(`已映射 ${objectIdMap.size}/${objectIds.length} 个object_id`);
    }
    console.log(`\n总共映射了 ${objectIdMap.size} 个object_id\n`);
    
    // 导入图片
    console.log('导入图片...');
    let importedImages = 0;
    let skippedImages = 0;
    const importBatchSize = 500;
    
    for (let i = 0; i < imagesWithObjectId.length; i += importBatchSize) {
      const batch = imagesWithObjectId.slice(i, i + importBatchSize);
      
      for (const img of batch) {
        const objectDbId = objectIdMap.get(img.object_id);
        if (!objectDbId) {
          skippedImages++;
          continue;
        }
        
        try {
          await pool.query(`
            INSERT INTO images (
              uuid, object_id, iiif_url, iiif_thumb_url, view_type, sequence,
              width, height, max_pixels, full_path, thumb_path, preview_path, assistive_text
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT (uuid) DO NOTHING
          `, [
            img.uuid, objectDbId, img.iiif_url, img.iiif_thumb_url,
            img.view_type, img.sequence, img.width, img.height, img.max_pixels,
            null, null, null, img.assistive_text
          ]);
          importedImages++;
        } catch (err) {
          console.error(`Error importing image ${img.uuid}:`, err.message);
          skippedImages++;
        }
      }
      
      if ((i + importBatchSize) % 5000 === 0 || i + importBatchSize >= imagesWithObjectId.length) {
        console.log(`已处理 ${Math.min(i + importBatchSize, imagesWithObjectId.length)}/${imagesWithObjectId.length} (导入: ${importedImages}, 跳过: ${skippedImages})`);
      }
    }
    
    console.log(`\n=== 导入完成 ===`);
    console.log(`导入: ${importedImages}`);
    console.log(`跳过: ${skippedImages}`);
    
    // 统计
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM images) as total_images,
        (SELECT COUNT(DISTINCT object_id) FROM images) as objects_with_images
    `);
    
    console.log(`\n数据库统计:`);
    console.log(`  图片总数: ${stats.rows[0].total_images}`);
    console.log(`  有图片的对象: ${stats.rows[0].objects_with_images}`);
    
  } catch (error) {
    console.error('导入错误:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

importImages().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
