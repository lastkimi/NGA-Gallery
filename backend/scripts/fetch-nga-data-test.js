#!/usr/bin/env node
/**
 * NGA开放数据测试脚本 - 只处理少量数据用于测试
 * 功能：下载和处理少量NGA开放数据
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

// 配置
const CONFIG = {
  DATA_DIR: path.join(__dirname, '../../data/raw/opendata/data'),
  PROCESSED_DIR: path.join(__dirname, '../../data/processed'),
  TEST_LIMIT: 100, // 只处理前100条记录用于测试
};

// 初始化目录
function initDirectories() {
  if (!fs.existsSync(CONFIG.PROCESSED_DIR)) {
    fs.mkdirSync(CONFIG.PROCESSED_DIR, { recursive: true });
    console.log(`Created directory: ${CONFIG.PROCESSED_DIR}`);
  }
}

// 读取CSV文件（限制数量）
function readCSV(filename, limit = null) {
  const filePath = path.join(CONFIG.DATA_DIR, filename);
  
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return [];
  }
  
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
  
  const result = limit ? records.slice(0, limit) : records;
  console.log(`Read ${result.length} records from ${filename}${limit ? ` (limited from ${records.length})` : ''}`);
  return result;
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
function processImages(records, objectIds) {
  // 只处理与我们的测试对象相关的图片
  const objectIdSet = new Set(objectIds.map(id => id.toString()));
  return records
    .filter(record => record.depictstmsobjectid && objectIdSet.has(record.depictstmsobjectid))
    .map(record => ({
      uuid: record.uuid,
      iiif_url: record.iiifurl,
      iiif_thumb_url: record.iiifthumburl,
      view_type: record.viewtype,
      sequence: record.sequence ? parseInt(record.sequence) : 0,
      width: record.width ? parseInt(record.width) : null,
      height: record.height ? parseInt(record.height) : null,
      max_pixels: record.maxpixels ? parseInt(record.maxpixels) : null,
      object_id: record.depictstmsobjectid ? parseInt(record.depictstmsobjectid) : null,
      assistive_text: record.assistivetext,
    }));
}

// 保存处理后的数据为JSON（用于测试）
function saveProcessedData(data, filename) {
  const filepath = path.join(CONFIG.PROCESSED_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`Saved ${data.length} records to ${filename}`);
}

// 生成统计信息
function generateStatistics(objects, constituents, images) {
  const stats = {
    totalObjects: objects.length,
    totalConstituents: constituents.length,
    totalImages: images.length,
    objectsWithImages: new Set(images.map(img => img.object_id)).size,
    classifications: [...new Set(objects.map(obj => obj.classification).filter(Boolean))],
    departments: [...new Set(objects.map(obj => obj.department).filter(Boolean))],
    dateRange: {
      earliest: Math.min(...objects.map(obj => obj.begin_year).filter(y => y && y > 0)),
      latest: Math.max(...objects.map(obj => obj.end_year).filter(y => y && y > 0)),
    },
  };
  
  return stats;
}

// 主函数
async function main() {
  console.log('=== NGA数据测试脚本 ===\n');
  console.log(`处理限制: ${CONFIG.TEST_LIMIT} 条记录\n`);
  
  // 初始化目录
  initDirectories();
  
  try {
    // 1. 读取CSV数据（限制数量）
    console.log('1. 读取CSV数据...');
    const objectsRaw = readCSV('objects.csv', CONFIG.TEST_LIMIT);
    const imagesRaw = readCSV('published_images.csv'); // 图片数据不限制，但会过滤
    const constituentsRaw = readCSV('constituents.csv', CONFIG.TEST_LIMIT * 2); // 艺术家数据多一点
    
    if (objectsRaw.length === 0) {
      console.error('未找到objects.csv数据文件！');
      process.exit(1);
    }
    
    // 2. 处理数据
    console.log('\n2. 处理数据...');
    const objects = processObjects(objectsRaw);
    const objectIds = objects.map(obj => obj.object_id);
    const constituents = processConstituents(constituentsRaw);
    const images = processImages(imagesRaw, objectIds);
    
    // 3. 保存处理后的数据
    console.log('\n3. 保存处理后的数据...');
    saveProcessedData(objects, 'test_objects.json');
    saveProcessedData(constituents, 'test_constituents.json');
    saveProcessedData(images, 'test_images.json');
    
    // 4. 生成统计信息
    console.log('\n4. 生成统计信息...');
    const stats = generateStatistics(objects, constituents, images);
    saveProcessedData(stats, 'test_statistics.json');
    
    console.log('\n=== 测试数据统计 ===');
    console.log(`藏品数量: ${stats.totalObjects}`);
    console.log(`艺术家数量: ${stats.totalConstituents}`);
    console.log(`图片数量: ${stats.totalImages}`);
    console.log(`有图片的藏品: ${stats.objectsWithImages}`);
    console.log(`分类数量: ${stats.classifications.length}`);
    console.log(`部门数量: ${stats.departments.length}`);
    console.log(`年份范围: ${stats.dateRange.earliest} - ${stats.dateRange.latest}`);
    console.log('\n=== 完成 ===');
    console.log(`测试数据已保存到: ${CONFIG.PROCESSED_DIR}`);
    console.log('\n提示: 这些测试数据可以用于前端开发和API测试');
    
  } catch (error) {
    console.error('\n错误:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// 运行
main();
