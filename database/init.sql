-- NGA博物馆数据库初始化脚本（测试数据）
-- 用于快速创建数据库结构和导入测试数据

-- 创建数据库（如果不存在，需要在外部执行）
-- CREATE DATABASE nga_museum;

-- 创建表结构
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
  object_id INTEGER,
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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (object_id) REFERENCES objects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS objects_constituents (
  object_id INTEGER,
  constituent_id VARCHAR(50),
  PRIMARY KEY (object_id, constituent_id),
  FOREIGN KEY (object_id) REFERENCES objects(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_objects_id ON objects(object_id);
CREATE INDEX IF NOT EXISTS idx_objects_classification ON objects(classification);
CREATE INDEX IF NOT EXISTS idx_objects_year ON objects(begin_year, end_year);
CREATE INDEX IF NOT EXISTS idx_objects_department ON objects(department);
CREATE INDEX IF NOT EXISTS idx_constituents_id ON constituents(constituent_id);
CREATE INDEX IF NOT EXISTS idx_images_object_id ON images(object_id);
CREATE INDEX IF NOT EXISTS idx_images_uuid ON images(uuid);

-- 注意：测试数据需要通过脚本导入，这里只创建表结构
