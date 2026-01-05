# NGA在线博物馆 - 部署指南

## 项目概述

本项目是一个基于美国国家美术馆(NGA)开放数据的在线博物馆网站，提供62,307+件藏品的浏览、搜索和学习分析功能。

## 技术栈

### 前端
- **框架**: React 18 + TypeScript
- **UI库**: Material-UI v6
- **图表**: Recharts
- **构建工具**: Vite
- **路由**: React Router v6

### 后端
- **框架**: Node.js + Express
- **数据库**: PostgreSQL
- **ORM**: 原生pg
- **认证**: JWT

## 快速开始

### 1. 环境准备

```bash
# 克隆项目
git clone <repository-url>
cd openart

# 安装前端依赖
cd frontend && npm install

# 安装后端依赖
cd ../backend && npm install
```

### 2. 配置环境变量

```bash
# 前端
cp frontend/.env.example frontend/.env
# 编辑 .env 文件（通常不需要修改）

# 后端
cp backend/.env.example backend/.env
# 编辑 backend/.env，设置数据库密码等
```

### 3. 数据库设置

```bash
# 使用Docker启动PostgreSQL
docker-compose up -d postgres

# 或者手动安装PostgreSQL并创建数据库
createdb nga_museum
```

### 4. 数据导入

```bash
# 方式1: 运行数据获取脚本（需要数据库）
cd backend
npm run fetch-data:db

# 方式2: 只下载和处理数据（不导入数据库）
npm run fetch-data
```

### 5. 启动开发服务器

```bash
# 终端1: 启动后端
cd backend
npm run dev

# 终端2: 启动前端
cd frontend
npm run dev
```

访问 http://localhost:5173

## Docker部署

### 使用Docker Compose

```bash
# 构建并启动所有服务
docker-compose up -d --build

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 服务说明

- **前端**: http://localhost:80 (Nginx静态服务)
- **后端**: http://localhost:3001
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## 生产环境部署

### 1. 服务器要求

- **CPU**: 4核心以上
- **内存**: 8GB以上
- **存储**: 500GB SSD以上（用于存储图片）
- **带宽**: 10Mbps以上

### 2. 安装Docker

```bash
# Ubuntu
sudo apt-get update
sudo apt-get install docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker
```

### 3. 部署步骤

```bash
# 1. 上传项目到服务器
scp -r /path/to/openart user@server:/path/

# 2. 配置环境变量
cp backend/.env.example backend/.env
vim backend/.env

# 3. 构建并启动
cd openart
docker-compose up -d --build

# 4. 初始化数据库（首次运行）
docker-compose exec backend npm run fetch-data:db
```

### 4. 配置Nginx（如果不用Docker）

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # 前端静态文件
    root /var/www/openart/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API代理
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 图片存储

### 本地存储

图片默认存储在 `data/images/` 目录：
- `full/`: 原始高清图片
- `thumb/`: 缩略图(300x300)
- `preview/`: 预览图(最大1200px)

### 云存储（推荐生产环境）

如需使用云存储，修改 `backend/.env`：

```env
# AWS S3示例
S3_BUCKET=your-bucket
S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
```

## 监控和维护

### 日志查看

```bash
# Docker日志
docker-compose logs -f backend

# 本地日志
tail -f backend/logs/combined.log
```

### 数据库备份

```bash
# 备份
pg_dump -U postgres nga_museum > backup.sql

# 恢复
psql -U postgres nga_museum < backup.sql
```

### 健康检查

```bash
# API健康检查
curl http://localhost:3001/health

# 就绪检查
curl http://localhost:3001/health/ready
```

## 性能优化

### 1. 图片优化

- 使用CDN分发静态资源
- 启用Gzip压缩
- 配置浏览器缓存

### 2. 数据库优化

```sql
-- 常用索引
CREATE INDEX idx_objects_classification ON objects(classification);
CREATE INDEX idx_objects_year ON objects(begin_year, end_year);
CREATE INDEX idx_images_object_id ON images(object_id);
```

### 3. 缓存配置

Redis缓存配置在 `backend/.env`：

```env
REDIS_HOST=localhost
REDIS_PORT=6379
```

## 故障排除

### 1. 数据库连接失败

```bash
# 检查PostgreSQL状态
docker-compose logs postgres

# 检查连接
psql -h localhost -U postgres -d nga_museum
```

### 2. 前端构建失败

```bash
# 清除缓存并重试
cd frontend
rm -rf node_modules dist
npm install
npm run build
```

### 3. API返回500错误

```bash
# 查看后端日志
docker-compose logs backend
```

## 更新部署

```bash
# 拉取最新代码
git pull

# 重新构建
docker-compose up -d --build

# 清理旧镜像
docker image prune -f
```

## 许可证

本项目使用MIT许可证。
