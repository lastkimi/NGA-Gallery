# NGA Online Museum

一个基于美国国家美术馆（National Gallery of Art）开放数据的在线博物馆网站，提供62,000+艺术品的浏览、搜索和分析功能。

## 功能特性

- 🖼️ **艺术品浏览** - 浏览超过62,000件来自NGA的艺术珍品
- 🔍 **高级搜索** - 支持按标题、艺术家、分类、部门等多维度搜索
- 📅 **时间线筛选** - 交互式时间线滑块，按年份范围筛选作品
- 🖱️ **科研级图片查看器** - 集成OpenSeadragon，支持高分辨率缩放和平移
- 📱 **响应式设计** - 完美适配桌面、平板和移动设备
- 🎨 **精美UI** - 参考Städel Museum和NGA官网设计风格

## 技术栈

### 前端
- React 18 + TypeScript
- Material-UI v7
- React Router v6
- Zustand (状态管理)
- OpenSeadragon (图片查看器)
- Vite (构建工具)

### 后端
- Node.js + Express
- TypeScript
- PostgreSQL (可选)
- Mock API Server (快速测试)

### 数据源
- [NGA Open Data](https://github.com/NationalGalleryOfArt/opendata)
- [NGA IIIF API](https://api.nga.gov/iiif/)
- 所有图片使用CC0公共领域许可

## 快速开始

### 前置要求
- Node.js 18+
- npm 或 yarn

### 安装依赖

```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

### 开发模式（Mock API - 无需数据库）

```bash
# 启动Mock API服务器
cd backend
npm run mock-api

# 启动前端开发服务器（新终端）
cd frontend
npm run dev
```

访问 http://localhost:3000

### 生产模式（使用数据库）

1. 安装并启动PostgreSQL数据库
2. 创建数据库并运行初始化脚本：
```bash
psql -U your_user -d your_database -f database/init.sql
```

3. 导入数据：
```bash
cd backend
npm run fetch-data:db
```

4. 启动后端服务器：
```bash
npm run dev
```

5. 构建并启动前端：
```bash
cd frontend
npm run build
npm run preview
```

## 项目结构

```
openart/
├── frontend/          # React前端应用
│   ├── src/
│   │   ├── components/   # React组件
│   │   ├── pages/        # 页面组件
│   │   ├── services/     # API服务
│   │   ├── store/        # 状态管理
│   │   └── types/        # TypeScript类型定义
│   └── vite.config.ts
├── backend/           # Node.js后端
│   ├── src/           # 源代码
│   ├── scripts/       # 数据获取和处理脚本
│   └── data/          # 数据文件
└── README.md
```

## API端点

### 藏品相关
- `GET /api/objects` - 获取藏品列表（支持筛选和分页）
- `GET /api/objects/:id` - 获取单个藏品详情
- `GET /api/objects/:id/details` - 获取完整藏品信息
- `GET /api/objects/classifications` - 获取所有分类
- `GET /api/objects/departments` - 获取所有部门

### 分析相关
- `GET /api/analysis/statistics` - 获取统计信息
- `GET /api/analysis/timeline` - 获取时间线数据
- `GET /api/analysis/network` - 获取艺术家关系网络

## 数据说明

- **总藏品数**: 62,307件
- **高清图片**: 53,000+张
- **许可**: CC0 公共领域
- **数据来源**: [National Gallery of Art Open Data](https://github.com/NationalGalleryOfArt/opendata)

所有艺术品图片通过NGA的IIIF API实时加载，支持多分辨率查看。

## 开发指南

### 添加新功能
1. 前端功能在 `frontend/src/` 目录下开发
2. 后端API在 `backend/src/routes/` 目录下添加
3. 使用TypeScript确保类型安全

### 代码规范
- 使用ESLint进行代码检查
- 遵循TypeScript严格模式
- 组件使用函数式组件和Hooks

## 部署

### 使用Docker（推荐）
```bash
docker-compose up -d
```

### 手动部署
1. 构建前端：`cd frontend && npm run build`
2. 使用PM2管理后端进程：`pm2 start backend/dist/index.js`
3. 配置Nginx反向代理

## 贡献

欢迎提交Issue和Pull Request！

## 许可证

本项目使用MIT许可证。艺术品图片使用CC0公共领域许可。

## 致谢

- [National Gallery of Art](https://www.nga.gov/) - 数据来源
- [Städel Museum](https://sammlung.staedelmuseum.de/) - UI设计灵感

## 相关链接

- [NGA开放数据GitHub](https://github.com/NationalGalleryOfArt/opendata)
- [NGA IIIF API文档](https://www.nga.gov/artworks/free-images-and-open-access)
- [项目演示](https://github.com/lastkimi/NGA-Gallery)
