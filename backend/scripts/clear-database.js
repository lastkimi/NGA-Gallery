#!/usr/bin/env node
/**
 * 清除数据库中的所有数据
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

async function clearDatabase() {
  const pool = new Pool(DB_CONFIG);
  
  try {
    console.log('连接数据库...');
    await pool.query('SELECT 1');
    console.log('数据库连接成功\n');
    
    console.log('清除数据库中的所有数据...');
    
    // 删除所有数据（按顺序删除，避免外键约束错误）
    console.log('  删除图片数据...');
    await pool.query('DELETE FROM images');
    console.log('  删除完成');
    
    console.log('  删除对象数据...');
    await pool.query('DELETE FROM objects');
    console.log('  删除完成');
    
    console.log('  删除艺术家数据...');
    await pool.query('DELETE FROM constituents');
    console.log('  删除完成');
    
    // 重置序列
    console.log('\n重置序列...');
    await pool.query('ALTER SEQUENCE objects_id_seq RESTART WITH 1');
    await pool.query('ALTER SEQUENCE constituents_id_seq RESTART WITH 1');
    await pool.query('ALTER SEQUENCE images_id_seq RESTART WITH 1');
    console.log('序列重置完成');
    
    // 统计
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM objects) as objects,
        (SELECT COUNT(*) FROM constituents) as constituents,
        (SELECT COUNT(*) FROM images) as images
    `);
    
    console.log('\n=== 清除完成 ===');
    console.log(`剩余数据:`);
    console.log(`  藏品: ${stats.rows[0].objects}`);
    console.log(`  艺术家: ${stats.rows[0].constituents}`);
    console.log(`  图片: ${stats.rows[0].images}`);
    
  } catch (error) {
    console.error('清除错误:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

clearDatabase().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
