#!/usr/bin/env node
/**
 * 修复数据库表结构 - 增加字段长度
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

async function fixSchema() {
  const pool = new Pool(DB_CONFIG);
  
  try {
    console.log('连接数据库...');
    await pool.query('SELECT 1');
    console.log('数据库连接成功\n');
    
    console.log('修复表结构...');
    
    // 修改objects表
    await pool.query(`
      ALTER TABLE objects 
      ALTER COLUMN object_id TYPE VARCHAR(100),
      ALTER COLUMN accession_number TYPE VARCHAR(200),
      ALTER COLUMN display_date TYPE VARCHAR(200),
      ALTER COLUMN timespan TYPE VARCHAR(200),
      ALTER COLUMN classification TYPE VARCHAR(200),
      ALTER COLUMN sub_classification TYPE VARCHAR(200),
      ALTER COLUMN visual_classification TYPE VARCHAR(200),
      ALTER COLUMN department TYPE VARCHAR(100),
      ALTER COLUMN wikidata_id TYPE VARCHAR(100);
    `);
    console.log('✓ objects表已修复');
    
    // 修改constituents表
    await pool.query(`
      ALTER TABLE constituents 
      ALTER COLUMN constituent_id TYPE VARCHAR(100),
      ALTER COLUMN ulan_id TYPE VARCHAR(100),
      ALTER COLUMN last_name TYPE VARCHAR(200),
      ALTER COLUMN display_date TYPE VARCHAR(200),
      ALTER COLUMN nationality TYPE VARCHAR(200),
      ALTER COLUMN visual_nationality TYPE VARCHAR(200),
      ALTER COLUMN constituent_type TYPE VARCHAR(100),
      ALTER COLUMN wikidata_id TYPE VARCHAR(100);
    `);
    console.log('✓ constituents表已修复');
    
    // 修改images表
    await pool.query(`
      ALTER TABLE images 
      ALTER COLUMN uuid TYPE VARCHAR(100),
      ALTER COLUMN view_type TYPE VARCHAR(50);
    `);
    console.log('✓ images表已修复');
    
    console.log('\n=== 修复完成 ===');
    
  } catch (error) {
    console.error('修复错误:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

fixSchema().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
