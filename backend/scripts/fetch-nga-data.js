#!/usr/bin/env node
/**
 * NGA开放数据获取脚本
 * 功能：下载和处理NGA开放数据，包括CSV解析和图片下载
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { parse } = require('csv-parse/sync');
const sharp = require('sharp');
const { Pool } = require('pg');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

// 配置
const CONFIG = {
  DATA_DIR: path.join(__dirname, '../data/raw/opendata/data'),
  PROCESSED_DIR: path.join(__dirname, '../data/processed'),
  IMAGES_DIR: path.join(__dirname, '../data/images'),
  THUMB_DIR: path.join(__dirname, '../data/images/thumb'),
  PREVIEW_DIR: path.join(__dirname, '../data/images/preview'),
  CONCURRENT_DOWNLOADS: 10,
  MAX_RETRIES: 3,
  BATCH_SIZE: 1000,
};

// 数据库配置（需要根据实际情况修改）
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'nga_museum',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
};

// 初始化目录
function initDirectories() {
  const dirs = [
    CONFIG.PROCESSED_DIR,
    CONFIG.IMAGES_DIR,
    CONFIG.THUMB_DIR,
    CONFIG.PREVIEW_DIR,
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  });
}

// 读取CSV文件
function readCSV(filename) {
  const filePath = path.join(CONFIG.DATA_DIR, filename);
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
  console.log(`Read ${records.length} records from ${filename}`);
  return records;
}

// 处理objects数据
function processObjects(records) {
  return records.map(record => ({
    object_id: record.objectid,
    accession_number: record.accessionnum,
    title: record.title || 'Untitled',
    display_date: record.displaydate,
    begin_year: record.beginyear ? parseInt(record.beginyear) : null,
    end_year: record.endyear ? parseInt(record.endyear) : null,
    timespan: record.visualbrowsertimespan,
    medium: record.medium,
    dimensions: record.dimensions,
    attribution_inverted: record.attributioninverted,
    attribution: record.attribution,
    provenance: record.provenancetext,
    credit_line: record.creditline,
    classification: record.classification,
    sub_classification: record.subclassification,
    visual_classification: record.visualbrowserclassification,
    department: record.departmentabbr,
    wikidata_id: record.wikidataid,
    custom_print_url: record.customprinturl,
  }));
}

// 处理constituents数据（艺术家）
function processConstituents(records) {
  return records.map(record => ({
    constituent_id: record.constituentid,
    ulan_id: record.ulanid,
    preferred_name: record.preferreddisplayname,
    forward_name: record.forwarddisplayname,
    last_name: record.lastname,
    display_date: record.displaydate,
    is_artist: record.artistofngaobject === '1',
    begin_year: record.beginyear ? parseInt(record.beginyear) : null,
    end_year: record.endyear ? parseInt(record.endyear) : null,
    nationality: record.nationality,
    visual_nationality: record.visualbrowsernationality,
    constituent_type: record.constituenttype,
    wikidata_id: record.wikidataid,
  }));
}

// 处理images数据
function processImages(records) {
  return records.map(record => ({
    uuid: record.uuid,
    iiif_url: record.iiifurl,
    iiif_thumb_url: record.iiifthumburl,
    view_type: record.viewtype,
    sequence: record.sequence,
    width: record.width ? parseInt(record.width) : null,
    height: record.height ? parseInt(record.height) : null,
    max_pixels: record.maxpixels,
    object_id: record.depictstmsobjectid ? parseInt(record.depictstmsobjectid) : null,
    assistive_text: record.assistivetext,
  }));
}

// 下载图片
async function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve(filepath);
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

// 生成缩略图
async function generateThumbnail(sourcePath, thumbPath, size = 300) {
  await sharp(sourcePath)
    .resize(size, size, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toFile(thumbPath);
}

// 生成预览图
async function generatePreview(sourcePath, previewPath, maxWidth = 1200) {
  await sharp(sourcePath)
    .resize(maxWidth, null, { withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toFile(previewPath);
}

// 处理单个图片
async function processImage(imageRecord, index, total) {
  if (!imageRecord.iiif_url || !imageRecord.object_id) {
    return null;
  }
  
  const filename = `${imageRecord.uuid}.jpg`;
  const fullPath = path.join(CONFIG.IMAGES_DIR, 'full', filename);
  const thumbPath = path.join(CONFIG.THUMB_DIR, filename);
  const previewPath = path.join(CONFIG.PREVIEW_DIR, filename);
  
  try {
    // 下载原始图片（只下载一次）
    if (!fs.existsSync(fullPath)) {
      console.log(`Downloading ${index}/${total}: ${imageRecord.uuid}`);
      await downloadImage(imageRecord.iiif_url, fullPath);
    }
    
    // 生成缩略图
    if (!fs.existsSync(thumbPath)) {
      await generateThumbnail(fullPath, thumbPath);
    }
    
    // 生成预览图
    if (!fs.existsSync(previewPath)) {
      await generatePreview(fullPath, previewPath);
    }
    
    return {
      uuid: imageRecord.uuid,
      object_id: imageRecord.object_id,
      full_path: fullPath,
      thumb_path: thumbPath,
      preview_path: previewPath,
      width: imageRecord.width,
      height: imageRecord.height,
    };
  } catch (error) {
    console.error(`Error processing image ${imageRecord.uuid}:`, error.message);
    return null;
  }
}

// 批量处理图片（带并发限制）
async function processImagesBatch(images, totalProcessed = 0) {
  const results = [];
  const queue = [...images];
  
  while (queue.length > 0) {
    const batch = queue.splice(0, CONFIG.CONCURRENT_DOWNLOADS);
    const batchResults = await Promise.allSettled(
      batch.map((img, idx) => processImage(img, totalProcessed + idx + 1, images.length))
    );
    
    results.push(...batchResults.map(r => r.status === 'fulfilled' ? r.value : null));
    totalProcessed += batch.length;
    
    console.log(`Progress: ${totalProcessed}/${images.length}`);
    
    // 避免请求过快
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return results.filter(r => r !== null);
}

// 保存处理后的数据为CSV
function saveProcessedData(data, filename) {
  const filepath = path.join(CONFIG.PROCESSED_DIR, filename);
  const csvWriter = createCsvWriter({
    path: filepath,
    header: Object.keys(data[0]).map(key => ({ id: key, title: key })),
  });
  
  csvWriter.writeRecords(data)
    .then(() => console.log(`Saved ${data.length} records to ${filename}`))
    .catch(err => console.error(`Error saving ${filename}:`, err));
}

// 保存图片元数据
function saveImageMetadata(imageMetadata) {
  const filepath = path.join(CONFIG.PROCESSED_DIR, 'image_metadata.csv');
  const csvWriter = createCsvWriter({
    path: filepath,
    header: [
      { id: 'uuid', title: 'uuid' },
      { id: 'object_id', title: 'object_id' },
      { id: 'full_path', title: 'full_path' },
      { id: 'thumb_path', title: 'thumb_path' },
      { id: 'preview_path', title: 'preview_path' },
      { id: 'width', title: 'width' },
      { id: 'height', title: 'height' },
    ],
  });
  
  csvWriter.writeRecords(imageMetadata)
    .then(() => console.log(`Saved image metadata for ${imageMetadata.length} images`))
    .catch(err => console.error('Error saving image metadata:', err));
}

// 导入数据到数据库
async function importToDatabase(objects, constituents, images) {
  const pool = new Pool(DB_CONFIG);
  
  try {
    console.log('Connecting to database...');
    await pool.connect();
    
    // 创建表（如果不存在）
    await pool.query(`
      CREATE TABLE IF NOT EXISTS objects (
        id SERIAL PRIMARY KEY,
        object_id VARCHAR(50) UNIQUE NOT NULL,
        accession_number VARCHAR(100),
        title TEXT,
        display_date VARCHAR(100),
        begin_year INTEGER,
        end_year INTEGER,
        timespan VARCHAR(100),
        medium TEXT,
        dimensions TEXT,
        attribution_inverted TEXT,
        attribution TEXT,
        provenance TEXT,
        credit_line TEXT,
        classification VARCHAR(100),
        sub_classification VARCHAR(100),
        visual_classification VARCHAR(100),
        department VARCHAR(50),
        wikidata_id VARCHAR(50),
        custom_print_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS constituents (
        id SERIAL PRIMARY KEY,
        constituent_id VARCHAR(50) UNIQUE NOT NULL,
        ulan_id VARCHAR(50),
        preferred_name TEXT,
        forward_name TEXT,
        last_name VARCHAR(100),
        display_date VARCHAR(100),
        is_artist BOOLEAN DEFAULT FALSE,
        begin_year INTEGER,
        end_year INTEGER,
        nationality VARCHAR(100),
        visual_nationality VARCHAR(100),
        constituent_type VARCHAR(50),
        wikidata_id VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS images (
        id SERIAL PRIMARY KEY,
        uuid VARCHAR(50) UNIQUE NOT NULL,
        object_id INTEGER REFERENCES objects(id),
        iiif_url TEXT,
        iiif_thumb_url TEXT,
        view_type VARCHAR(20),
        sequence INTEGER,
        width INTEGER,
        height INTEGER,
        max_pixels INTEGER,
        full_path TEXT,
        thumb_path TEXT,
        preview_path TEXT,
        assistive_text TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_objects_id ON objects(object_id);
      CREATE INDEX IF NOT EXISTS idx_objects_classification ON objects(classification);
      CREATE INDEX IF NOT EXISTS idx_objects_year ON objects(begin_year, end_year);
      CREATE INDEX IF NOT EXISTS idx_constituents_id ON constituents(constituent_id);
      CREATE INDEX IF NOT EXISTS idx_images_object_id ON images(object_id);
    `);
    
    console.log('Tables created/verified');
    
    // 导入objects
    console.log('Importing objects...');
    for (const obj of objects) {
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
    }
    
    console.log(`Imported ${objects.length} objects`);
    
    // 导入constituents
    console.log('Importing constituents...');
    for (const constituent of constituents) {
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
    }
    
    console.log(`Imported ${constituents.length} constituents`);
    
    // 导入images（分批处理）
    console.log('Importing images...');
    const batchSize = 100;
    for (let i = 0; i < images.length; i += batchSize) {
      const batch = images.slice(i, i + batchSize);
      
      for (const img of batch) {
        if (img) {
          await pool.query(`
            INSERT INTO images (
              uuid, object_id, iiif_url, iiif_thumb_url, view_type, sequence,
              width, height, max_pixels, full_path, thumb_path, preview_path, assistive_text
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT (uuid) DO NOTHING
          `, [
            img.uuid, img.object_id, img.iiif_url, img.iiif_thumb_url,
            img.view_type, img.sequence, img.width, img.height, img.max_pixels,
            img.full_path, img.thumb_path, img.preview_path, img.assistive_text
          ]);
        }
      }
      
      console.log(`Imported ${Math.min(i + batchSize, images.length)}/${images.length} images`);
    }
    
    console.log('Database import completed successfully');
    
  } catch (error) {
    console.error('Database import error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// 主函数
async function main() {
  console.log('=== NGA数据获取脚本 ===\n');
  
  // 初始化目录
  initDirectories();
  
  try {
    // 1. 读取CSV数据
    console.log('1. 读取CSV数据...');
    const objectsRaw = readCSV('objects.csv');
    const constituentsRaw = readCSV('constituents.csv');
    const imagesRaw = readCSV('published_images.csv');
    
    // 2. 处理数据
    console.log('\n2. 处理数据...');
    const objects = processObjects(objectsRaw);
    const constituents = processConstituents(constituentsRaw);
    const images = processImages(imagesRaw);
    
    // 保存处理后的CSV
    saveProcessedData(objects, 'processed_objects.csv');
    saveProcessedData(constituents, 'processed_constituents.csv');
    
    // 3. 下载图片（仅下载有IIIF URL的图片）
    console.log('\n3. 下载图片...');
    const imagesWithIIIF = images.filter(img => img.iiif_url && img.object_id);
    console.log(`Found ${imagesWithIIIF.length} images with IIIF URLs`);
    
    const imageMetadata = await processImagesBatch(imagesWithIIIF);
    saveImageMetadata(imageMetadata);
    
    // 4. 导入数据库（可选）
    console.log('\n4. 导入数据库...');
    const shouldImportDB = process.argv.includes('--import-db');
    if (shouldImportDB) {
      await importToDatabase(objects, constituents, imageMetadata);
    } else {
      console.log('Skipping database import (use --import-db to enable)');
    }
    
    console.log('\n=== 完成 ===');
    console.log(`处理了 ${objects.length} 件藏品`);
    console.log(`处理了 ${constituents.length} 位艺术家`);
    console.log(`处理了 ${imageMetadata.length} 张图片`);
    
  } catch (error) {
    console.error('\n错误:', error);
    process.exit(1);
  }
}

// 运行
main();
