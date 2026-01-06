#!/usr/bin/env node
/**
 * 快速创建测试数据并导入数据库
 * 创建少量测试数据用于开发测试
 */

const { Pool } = require('pg');

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'nga_museum',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
};

// 测试数据
const testObjects = [
  {
    object_id: '1983.1.1',
    accession_number: '1983.1.1',
    title: 'The Starry Night',
    display_date: '1889',
    begin_year: 1889,
    end_year: 1889,
    medium: 'Oil on canvas',
    dimensions: '73.7 x 92.1 cm',
    attribution: 'Vincent van Gogh',
    classification: 'Painting',
    department: 'CIS-R',
  },
  {
    object_id: '1983.1.2',
    accession_number: '1983.1.2',
    title: 'Water Lilies',
    display_date: '1919',
    begin_year: 1919,
    end_year: 1919,
    medium: 'Oil on canvas',
    dimensions: '100.5 x 201 cm',
    attribution: 'Claude Monet',
    classification: 'Painting',
    department: 'CIS-R',
  },
  {
    object_id: '1983.1.3',
    accession_number: '1983.1.3',
    title: 'The Persistence of Memory',
    display_date: '1931',
    begin_year: 1931,
    end_year: 1931,
    medium: 'Oil on canvas',
    dimensions: '24 x 33 cm',
    attribution: 'Salvador Dalí',
    classification: 'Painting',
    department: 'CIS-R',
  },
  {
    object_id: '1983.1.4',
    accession_number: '1983.1.4',
    title: 'Guernica',
    display_date: '1937',
    begin_year: 1937,
    end_year: 1937,
    medium: 'Oil on canvas',
    dimensions: '349.3 x 776.6 cm',
    attribution: 'Pablo Picasso',
    classification: 'Painting',
    department: 'CIS-R',
  },
  {
    object_id: '1983.1.5',
    accession_number: '1983.1.5',
    title: 'The Scream',
    display_date: '1893',
    begin_year: 1893,
    end_year: 1893,
    medium: 'Tempera and pastel on cardboard',
    dimensions: '91 x 73.5 cm',
    attribution: 'Edvard Munch',
    classification: 'Painting',
    department: 'CIS-R',
  },
];

async function importTestData() {
  const pool = new Pool(DB_CONFIG);
  
  try {
    console.log('连接数据库...');
    await pool.query('SELECT 1');
    console.log('数据库连接成功\n');
    
    console.log('导入测试藏品数据...');
    let imported = 0;
    for (const obj of testObjects) {
      try {
        await pool.query(`
          INSERT INTO objects (
            object_id, accession_number, title, display_date, begin_year, end_year,
            medium, dimensions, attribution, classification, department
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (object_id) DO UPDATE SET
            title = EXCLUDED.title,
            updated_at = CURRENT_TIMESTAMP
        `, [
          obj.object_id, obj.accession_number, obj.title, obj.display_date,
          obj.begin_year, obj.end_year, obj.medium, obj.dimensions,
          obj.attribution, obj.classification, obj.department
        ]);
        imported++;
      } catch (err) {
        console.error(`Error importing ${obj.object_id}:`, err.message);
      }
    }
    console.log(`成功导入 ${imported}/${testObjects.length} 件藏品\n`);
    
    // 统计
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT classification) as classifications,
        COUNT(DISTINCT department) as departments,
        MIN(begin_year) as earliest,
        MAX(begin_year) as latest
      FROM objects
      WHERE begin_year IS NOT NULL
    `);
    
    console.log('=== 导入完成 ===');
    console.log(`数据库统计:`);
    console.log(`  藏品总数: ${stats.rows[0].total}`);
    console.log(`  分类数: ${stats.rows[0].classifications}`);
    console.log(`  部门数: ${stats.rows[0].departments}`);
    console.log(`  年份范围: ${stats.rows[0].earliest} - ${stats.rows[0].latest}`);
    
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
