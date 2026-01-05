#!/usr/bin/env node
/**
 * 导入测试数据到数据库
 * 使用测试数据JSON文件导入到PostgreSQL数据库
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// 数据库配置
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'nga_museum',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
};

const PROCESSED_DIR = path.join(__dirname, '../../data/processed');

async function importTestData() {
  const pool = new Pool(DB_CONFIG);
  
  try {
    console.log('连接数据库...');
    await pool.query('SELECT 1');
    console.log('数据库连接成功\n');
    
    // 读取测试数据
    console.log('读取测试数据...');
    const objects = JSON.parse(fs.readFileSync(path.join(PROCESSED_DIR, 'test_objects.json'), 'utf-8'));
    const constituents = JSON.parse(fs.readFileSync(path.join(PROCESSED_DIR, 'test_constituents.json'), 'utf-8'));
    const images = JSON.parse(fs.readFileSync(path.join(PROCESSED_DIR, 'test_images.json'), 'utf-8'));
    
    console.log(`读取到 ${objects.length} 件藏品, ${constituents.length} 位艺术家, ${images.length} 张图片\n`);
    
    // 导入objects
    console.log('导入藏品数据...');
    let importedObjects = 0;
    for (const obj of objects) {
      try {
        await pool.query(`
          INSERT INTO objects (
            object_id, accession_number, title, display_date, begin_year, end_year,
            timespan, medium, dimensions, attribution_inverted, attribution,
            provenance, credit_line, classification, sub_classification,
            visual_classification, department, wikidata_id, custom_print_url
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
          ON CONFLICT (object_id) DO UPDATE SET
            title = EXCLUDED.title,
            updated_at = CURRENT_TIMESTAMP
        `, [
          obj.object_id, obj.accession_number, obj.title, obj.display_date,
          obj.begin_year, obj.end_year, obj.timespan, obj.medium, obj.dimensions,
          obj.attribution_inverted, obj.attribution, obj.provenance, obj.credit_line,
          obj.classification, obj.sub_classification, obj.visual_classification,
          obj.department, obj.wikidata_id, obj.custom_print_url
        ]);
        importedObjects++;
      } catch (err) {
        console.error(`Error importing object ${obj.object_id}:`, err.message);
      }
    }
    console.log(`成功导入 ${importedObjects}/${objects.length} 件藏品\n`);
    
    // 导入constituents
    console.log('导入艺术家数据...');
    let importedConstituents = 0;
    for (const constituent of constituents) {
      try {
        await pool.query(`
          INSERT INTO constituents (
            constituent_id, ulan_id, preferred_name, forward_name, last_name,
            display_date, is_artist, begin_year, end_year, nationality,
            visual_nationality, constituent_type, wikidata_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (constituent_id) DO NOTHING
        `, [
          constituent.constituent_id, constituent.ulan_id, constituent.preferred_name,
          constituent.forward_name, constituent.last_name, constituent.display_date,
          constituent.is_artist, constituent.begin_year, constituent.end_year,
          constituent.nationality, constituent.visual_nationality,
          constituent.constituent_type, constituent.wikidata_id
        ]);
        importedConstituents++;
      } catch (err) {
        // 忽略重复错误
      }
    }
    console.log(`成功导入 ${importedConstituents}/${constituents.length} 位艺术家\n`);
    
    // 导入images（需要先获取objects的id）
    console.log('导入图片数据...');
    const objectIdMap = new Map();
    const objectIdResults = await pool.query('SELECT id, object_id FROM objects');
    objectIdResults.rows.forEach(row => {
      objectIdMap.set(row.object_id, row.id);
    });
    
    let importedImages = 0;
    for (const img of images) {
      try {
        const objectDbId = objectIdMap.get(img.object_id?.toString());
        if (!objectDbId) {
          console.warn(`跳过图片 ${img.uuid}: 未找到对应的object_id ${img.object_id}`);
          continue;
        }
        
        await pool.query(`
          INSERT INTO images (
            uuid, object_id, iiif_url, iiif_thumb_url, view_type, sequence,
            width, height, max_pixels, assistive_text
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (uuid) DO NOTHING
        `, [
          img.uuid, objectDbId, img.iiif_url, img.iiif_thumb_url,
          img.view_type, img.sequence, img.width, img.height,
          img.max_pixels, img.assistive_text
        ]);
        importedImages++;
      } catch (err) {
        console.error(`Error importing image ${img.uuid}:`, err.message);
      }
    }
    console.log(`成功导入 ${importedImages}/${images.length} 张图片\n`);
    
    // 统计
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM objects) as objects,
        (SELECT COUNT(*) FROM constituents) as constituents,
        (SELECT COUNT(*) FROM images) as images
    `);
    
    console.log('=== 导入完成 ===');
    console.log(`数据库统计:`);
    console.log(`  藏品: ${stats.rows[0].objects}`);
    console.log(`  艺术家: ${stats.rows[0].constituents}`);
    console.log(`  图片: ${stats.rows[0].images}`);
    
  } catch (error) {
    console.error('导入错误:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// 运行
importTestData().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
