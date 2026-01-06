#!/usr/bin/env node
/**
 * 添加测试图片数据
 */

const { Pool } = require('pg');

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'nga_museum',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
};

// 测试图片数据（使用占位图片服务）
const testImages = [
  {
    object_id: '1983.1.1',
    uuid: 'test-image-1',
    iiif_url: 'https://images.nga.gov/iiif/public/objects/1983.1.1',
    iiif_thumb_url: 'https://images.nga.gov/iiif/public/objects/1983.1.1/full/!400,400/0/default.jpg',
    view_type: 'primary',
    sequence: 1,
    width: 1200,
    height: 900,
    max_pixels: 1200000,
    assistive_text: 'The Starry Night by Vincent van Gogh',
  },
  {
    object_id: '1983.1.2',
    uuid: 'test-image-2',
    iiif_url: 'https://images.nga.gov/iiif/public/objects/1983.1.2',
    iiif_thumb_url: 'https://images.nga.gov/iiif/public/objects/1983.1.2/full/!400,400/0/default.jpg',
    view_type: 'primary',
    sequence: 1,
    width: 1200,
    height: 800,
    max_pixels: 960000,
    assistive_text: 'Water Lilies by Claude Monet',
  },
  {
    object_id: '1983.1.3',
    uuid: 'test-image-3',
    iiif_url: 'https://images.nga.gov/iiif/public/objects/1983.1.3',
    iiif_thumb_url: 'https://images.nga.gov/iiif/public/objects/1983.1.3/full/!400,400/0/default.jpg',
    view_type: 'primary',
    sequence: 1,
    width: 1000,
    height: 800,
    max_pixels: 800000,
    assistive_text: 'The Persistence of Memory by Salvador Dalí',
  },
  {
    object_id: '1983.1.4',
    uuid: 'test-image-4',
    iiif_url: 'https://images.nga.gov/iiif/public/objects/1983.1.4',
    iiif_thumb_url: 'https://images.nga.gov/iiif/public/objects/1983.1.4/full/!400,400/0/default.jpg',
    view_type: 'primary',
    sequence: 1,
    width: 1500,
    height: 600,
    max_pixels: 900000,
    assistive_text: 'Guernica by Pablo Picasso',
  },
  {
    object_id: '1983.1.5',
    uuid: 'test-image-5',
    iiif_url: 'https://images.nga.gov/iiif/public/objects/1983.1.5',
    iiif_thumb_url: 'https://images.nga.gov/iiif/public/objects/1983.1.5/full/!400,400/0/default.jpg',
    view_type: 'primary',
    sequence: 1,
    width: 1100,
    height: 900,
    max_pixels: 990000,
    assistive_text: 'The Scream by Edvard Munch',
  },
];

async function addTestImages() {
  const pool = new Pool(DB_CONFIG);
  
  try {
    console.log('连接数据库...');
    await pool.query('SELECT 1');
    console.log('数据库连接成功\n');
    
    // 获取object_id到id的映射
    const objectMap = new Map();
    const objectsResult = await pool.query('SELECT id, object_id FROM objects');
    objectsResult.rows.forEach(row => {
      objectMap.set(row.object_id, row.id);
    });
    
    console.log('添加测试图片数据...');
    let added = 0;
    for (const img of testImages) {
      const objectDbId = objectMap.get(img.object_id);
      if (!objectDbId) {
        console.warn(`跳过图片 ${img.uuid}: 未找到对应的object_id ${img.object_id}`);
        continue;
      }
      
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
          img.uuid, objectDbId, img.iiif_url, img.iiif_thumb_url,
          img.view_type, img.sequence, img.width, img.height,
          img.max_pixels, img.assistive_text
        ]);
        added++;
      } catch (err) {
        console.error(`Error adding image ${img.uuid}:`, err.message);
      }
    }
    console.log(`成功添加 ${added}/${testImages.length} 张图片\n`);
    
    // 统计
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT object_id) as objects_with_images
      FROM images
    `);
    
    console.log('=== 完成 ===');
    console.log(`图片总数: ${stats.rows[0].total}`);
    console.log(`有图片的藏品: ${stats.rows[0].objects_with_images}`);
    
  } catch (error) {
    console.error('错误:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// 运行
addTestImages().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
