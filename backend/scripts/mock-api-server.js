#!/usr/bin/env node
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, '../../data/processed');

let objectsData = [];
let imagesData = [];
let constituentsData = [];
let statisticsData = {};

try {
  objectsData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'test_objects.json'), 'utf-8'));
  imagesData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'test_images.json'), 'utf-8'));
  constituentsData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'test_constituents.json'), 'utf-8'));
  statisticsData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'test_statistics.json'), 'utf-8'));
  console.log(`✅ 加载测试数据: ${objectsData.length}件藏品, ${imagesData.length}张图片`);
} catch (error) {
  console.error('❌ 加载数据失败:', error.message);
  process.exit(1);
}

app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:5173'], credentials: true }));
app.use(express.json());

const imagesByObjectId = {};
imagesData.forEach(img => {
  const objId = img.object_id?.toString();
  if (objId) {
    if (!imagesByObjectId[objId]) imagesByObjectId[objId] = [];
    imagesByObjectId[objId].push(img);
  }
});

const constituentsByObjectId = {};
objectsData.forEach(obj => {
  const objId = obj.object_id?.toString();
  if (obj.constituents && Array.isArray(obj.constituents)) {
    constituentsByObjectId[objId] = obj.constituents.map(cid => 
      constituentsData.find(c => c.constituent_id === cid)
    ).filter(Boolean);
  }
});

function filterObjects(objects, filters) {
  return objects.filter(obj => {
    if (filters.search) {
      const s = filters.search.toLowerCase();
      if (!obj.title?.toLowerCase().includes(s) && !obj.description?.toLowerCase().includes(s)) return false;
    }
    if (filters.classification && obj.classification !== filters.classification) return false;
    if (filters.department && obj.department !== filters.department) return false;
    if (filters.artist) {
      const a = filters.artist.toLowerCase();
      const objId = obj.object_id?.toString();
      if (!constituentsByObjectId[objId]?.some(c => c.name?.toLowerCase().includes(a))) return false;
    }
    if (filters.beginYear) {
      const y = (obj.dated || obj.object_date || '').match(/\d{4}/);
      if (y && parseInt(y[0]) < filters.beginYear) return false;
    }
    if (filters.endYear) {
      const y = (obj.dated || obj.object_date || '').match(/\d{4}/);
      if (y && parseInt(y[0]) > filters.endYear) return false;
    }
    return true;
  });
}

app.get('/health', (req, res) => res.json({ status: 'ok', data: 'mock' }));

app.get('/', (req, res) => res.json({
  name: 'NGA Online Museum API (Mock)',
  version: '1.0.0',
  data: { objects: objectsData.length, images: imagesData.length, constituents: constituentsData.length },
}));

app.get('/api/objects', (req, res) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '20', 10);
    const filters = {
      search: req.query.search || null,
      classification: req.query.classification || null,
      department: req.query.department || null,
      artist: req.query.artist || null,
      beginYear: req.query.beginYear ? parseInt(req.query.beginYear, 10) : null,
      endYear: req.query.endYear ? parseInt(req.query.endYear, 10) : null,
    };
    let filtered = filterObjects(objectsData, filters);
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const data = filtered.slice(start, start + limit).map(obj => ({
      ...obj,
      images: imagesByObjectId[obj.object_id?.toString()] || [],
      constituents: constituentsByObjectId[obj.object_id?.toString()] || [],
    }));
    res.json({ data, pagination: { page, limit, total, totalPages } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/objects/:id', (req, res) => {
  try {
    const obj = objectsData.find(o => o.object_id?.toString() === req.params.id || o.id?.toString() === req.params.id);
    if (!obj) return res.status(404).json({ error: 'Not found' });
    const objId = obj.object_id?.toString();
    res.json({ ...obj, images: imagesByObjectId[objId] || [], constituents: constituentsByObjectId[objId] || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/objects/:id/details', (req, res) => {
  try {
    const obj = objectsData.find(o => o.object_id?.toString() === req.params.id || o.id?.toString() === req.params.id);
    if (!obj) return res.status(404).json({ error: 'Not found' });
    const objId = obj.object_id?.toString();
    res.json({ ...obj, images: imagesByObjectId[objId] || [], constituents: constituentsByObjectId[objId] || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/objects/classifications', (req, res) => {
  try {
    res.json([...new Set(objectsData.map(o => o.classification).filter(Boolean))].sort());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/objects/departments', (req, res) => {
  try {
    res.json([...new Set(objectsData.map(o => o.department).filter(Boolean))].sort());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/search', (req, res) => {
  try {
    const q = req.query.q || '';
    const limit = parseInt(req.query.limit || '20', 10);
    if (!q) return res.json({ data: [], total: 0 });
    const results = objectsData.filter(obj => {
      const s = q.toLowerCase();
      const objId = obj.object_id?.toString();
      return obj.title?.toLowerCase().includes(s) || 
             obj.description?.toLowerCase().includes(s) ||
             constituentsByObjectId[objId]?.some(c => c.name?.toLowerCase().includes(s));
    }).slice(0, limit).map(obj => ({
      ...obj,
      images: imagesByObjectId[obj.object_id?.toString()] || [],
      constituents: constituentsByObjectId[obj.object_id?.toString()] || [],
    }));
    res.json({ data: results, total: results.length, query: q });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/analysis/statistics', (req, res) => {
  try {
    res.json(statisticsData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/analysis/timeline', (req, res) => {
  try {
    const timeline = {};
    objectsData.forEach(obj => {
      const y = (obj.dated || obj.object_date || '').match(/\d{4}/);
      if (y) {
        const decade = Math.floor(parseInt(y[0]) / 10) * 10;
        timeline[decade] = (timeline[decade] || 0) + 1;
      }
    });
    res.json(Object.entries(timeline).map(([y, c]) => ({ year: parseInt(y), count: c })).sort((a, b) => a.year - b.year));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 Mock API服务器已启动`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`📊 ${objectsData.length}件藏品, ${imagesData.length}张图片\n`);
});
