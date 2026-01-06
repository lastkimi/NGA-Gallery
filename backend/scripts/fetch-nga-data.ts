import fs from 'fs';
import path from 'path';
import https from 'https';
import { parse } from 'csv-parse/sync';
import sharp from 'sharp';
import { createObjectCsvWriter as createCsvWriter } from 'csv-writer';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../src/models/database';
import { ObjectModel, ConstituentModel, IImage } from '../src/models/schemas';

// 配置
const CONFIG = {
  DATA_DIR: path.join(__dirname, '../../data/raw/opendata/data'),
  PROCESSED_DIR: path.join(__dirname, '../data/processed'),
  IMAGES_DIR: path.join(__dirname, '../data/images'),
  THUMB_DIR: path.join(__dirname, '../data/images/thumb'),
  PREVIEW_DIR: path.join(__dirname, '../data/images/preview'),
  CONCURRENT_DOWNLOADS: 10,
  MAX_RETRIES: 3,
  BATCH_SIZE: 1000,
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
function readCSV(filename: string) {
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
function processObjects(records: any[]) {
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
function processConstituents(records: any[]) {
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
function processImages(records: any[]) {
  return records.map(record => ({
    uuid: record.uuid,
    iiif_url: record.iiifurl,
    iiif_thumb_url: record.iiifthumburl,
    view_type: record.viewtype,
    sequence: record.sequence ? parseInt(record.sequence) : 1,
    width: record.width ? parseInt(record.width) : null,
    height: record.height ? parseInt(record.height) : null,
    max_pixels: record.maxpixels ? parseInt(record.maxpixels) : null,
    object_id: record.depictstmsobjectid ? String(record.depictstmsobjectid) : null,
    assistive_text: record.assistivetext,
  }));
}

// 保存处理后的数据为CSV
async function saveProcessedData(data: any[], filename: string) {
  const filepath = path.join(CONFIG.PROCESSED_DIR, filename);
  const csvWriter = createCsvWriter({
    path: filepath,
    header: Object.keys(data[0]).map(key => ({ id: key, title: key })),
  });
  
  try {
    await csvWriter.writeRecords(data);
    console.log(`Saved ${data.length} records to ${filename}`);
  } catch (err) {
    console.error(`Error saving ${filename}:`, err);
  }
}

// 导入数据到数据库
async function importToDatabase(objects: any[], constituents: any[], images: any[]) {
  try {
    await connectDatabase();
    
    // Check if data exists
    const objectCount = await ObjectModel.countDocuments();
    const constituentCount = await ConstituentModel.countDocuments();
    
    const forceClear = process.argv.includes('--force');
    
    if (objectCount > 0 || constituentCount > 0) {
      if (!forceClear) {
        console.log(`Database already contains data (${objectCount} objects, ${constituentCount} constituents).`);
        console.log('Skipping import. Use --force to overwrite.');
        return;
      }
      console.log('Force flag detected. Clearing existing data...');
    } else {
        console.log('Database is empty. Starting import...');
    }

    if (forceClear || (objectCount === 0 && constituentCount === 0)) {
        await Promise.all([
        ObjectModel.deleteMany({}),
        ConstituentModel.deleteMany({}),
        ]);
        console.log('Data cleared.');
    } else {
        // Should not happen due to checks above, but safety first
        return; 
    }
    
    // Create map of images by object_id
    console.log('Mapping images to objects...');
    const imagesByObject = new Map<string, IImage[]>();
    for (const img of images) {
      if (!img.object_id) continue;
      if (!imagesByObject.has(img.object_id)) {
        imagesByObject.set(img.object_id, []);
      }
      imagesByObject.get(img.object_id)?.push(img);
    }
    
    // Prepare objects with embedded images
    console.log('Preparing objects...');
    const objectsWithImages = objects.map(obj => {
      const objImages = imagesByObject.get(obj.object_id) || [];
      // Sort images by sequence
      objImages.sort((a, b) => a.sequence - b.sequence);
      return {
        ...obj,
        images: objImages,
      };
    });
    
    // Bulk insert objects
    console.log(`Importing ${objectsWithImages.length} objects...`);
    const batchSize = 1000;
    for (let i = 0; i < objectsWithImages.length; i += batchSize) {
      const batch = objectsWithImages.slice(i, i + batchSize);
      await ObjectModel.insertMany(batch, { ordered: false });
      if ((i + batchSize) % 10000 === 0) {
        console.log(`Imported ${i + batchSize} objects`);
      }
    }
    console.log('Objects imported.');
    
    // Bulk insert constituents
    console.log(`Importing ${constituents.length} constituents...`);
    for (let i = 0; i < constituents.length; i += batchSize) {
      const batch = constituents.slice(i, i + batchSize);
      await ConstituentModel.insertMany(batch, { ordered: false });
      if ((i + batchSize) % 10000 === 0) {
        console.log(`Imported ${i + batchSize} constituents`);
      }
    }
    console.log('Constituents imported.');
    
    console.log('Database import completed successfully');
    
  } catch (error) {
    console.error('Database import error:', error);
    throw error;
  } finally {
    await disconnectDatabase();
  }
}

// 主函数
async function main() {
  console.log('=== NGA数据获取脚本 (MongoDB Version) ===\n');
  
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
    
    // 保存处理后的CSV (可选，保持兼容性)
    if (objects.length > 0) saveProcessedData(objects, 'processed_objects.csv');
    if (constituents.length > 0) saveProcessedData(constituents, 'processed_constituents.csv');
    
    // 3. 处理图片元数据
    console.log('\n3. 处理图片元数据...');
    const imagesWithIIIF = images.filter((img: any) => img.iiif_url && img.object_id);
    console.log(`Found ${imagesWithIIIF.length} images with IIIF URLs`);
    
    // 4. 导入数据库
    console.log('\n4. 导入数据库...');
    // Always import if running this script in migration context
    await importToDatabase(objects, constituents, imagesWithIIIF);
    
    console.log('\n=== 完成 ===');
    console.log(`处理了 ${objects.length} 件藏品`);
    console.log(`处理了 ${constituents.length} 位艺术家`);
    console.log(`处理了 ${imagesWithIIIF.length} 张图片`);
    
  } catch (error) {
    console.error('\n错误:', error);
    process.exit(1);
  }
}

// 运行
main();
