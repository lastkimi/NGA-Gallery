# NGA Online Museum - 美国国家美术馆线上博物馆

![NGA Logo](frontend/public/favicon.svg)

基于美国国家美术馆(National Gallery of Art)开放数据构建的在线博物馆网站，提供62,307+件艺术品的浏览、搜索和学习分析功能。

## 特性

- **丰富藏品浏览**: 支持网格/列表视图，无限滚动加载
- **高级搜索**: 按艺术家、时期、风格、媒材等多维度筛选
- **高清图片查看**: 支持缩放和细节查看
- **数据分析工具**: 
  - 分类分布统计
  - 时间线可视化
  - 艺术家关系网络
  - 作品分布分析
- **响应式设计**: 完美适配桌面和移动设备
- **开源数据**: 所有数据来自NGA开放获取资源(CC0许可)

## 数据来源

- [NGA Open Data](https://github.com/NationalGalleryOfArt/opendata) - 150,000+件艺术品元数据
- [Wikimedia Commons](https://commons.wikimedia.org/wiki/Commons:NGA) - 53,000+张高清图片
- [Wikidata](https://www.wikidata.org/) - 结构化链接数据

## 技术栈

### 前端
- React 18 + TypeScript
- Material-UI v6
- Recharts (数据可视化)
- React Router v6
- Zustand (状态管理)
- Vite (构建工具)

### 后端
- Node.js + Express
- PostgreSQL
- Sharp (图片处理)
- JWT (认证)

## 快速开始

### 环境要求
- Node.js 18+
- PostgreSQL 14+
- Git

### 安装

```bash
# 克隆项目
git clone https://github.com/your-username/openart.git
cd openart

# 安装前端依赖
cd frontend && npm install

# 安装后端依赖
cd ../backend && npm install
```

### 配置

```bash
# 前端配置
cp frontend/.env.example frontend/.env

# 后端配置
cp backend/.env.example backend/.env
# 编辑 backend/.env 设置数据库密码
```

### 数据导入

```bash
cd backend

# 下载并处理数据
npm run fetch-data

# 导入数据库（需要PostgreSQL）
npm run fetch-data:db
```

### 启动

```bash
# 启动后端 (端口 3001)
cd backend && npm run dev

# 启动前端 (端口 5173)
cd frontend && npm run dev
```

访问 http://localhost:5173

## Docker部署

```bash
# 构建并启动所有服务
docker-compose up -d --build

# 查看日志
docker-compose logs -f

# 停止
docker-compose down
```

## 项目结构

```
openart/
├── frontend/                 # React前端项目
│   ├── public/              # 静态资源
│   ├── src/
│   │   ├── components/      # React组件
│   │   │   ├── common/      # 通用组件
│   │   │   ├── collection/  # 藏品相关
│   │   │   └── search/      # 搜索组件
│   │   ├── pages/           # 页面
│   │   ├── services/        # API服务
│   │   ├── hooks/           # 自定义Hooks
│   │   ├── store/           # 状态管理
│   │   ├── types/           # TypeScript类型
│   │   └── utils/           # 工具函数
│   └── dist/                # 构建输出
│
├── backend/                  # Node.js后端
│   ├── src/
│   │   ├── controllers/     # 控制器
│   │   ├── models/          # 数据模型
│   │   ├── routes/          # API路由
│   │   ├── services/        # 业务逻辑
│   │   ├── middleware/      # 中间件
│   │   └── config/          # 配置
│   ├── scripts/             # 数据处理脚本
│   └── dist/                # 构建输出
│
├── data/                     # 数据文件
│   ├── raw/                 # 原始数据
│   ├── processed/           # 处理后数据
│   └── images/              # 图片存储
│       ├── full/            # 原始高清图
│       ├── thumb/           # 缩略图
│       └── preview/         # 预览图
│
├── docker/                   # Docker配置
├── docker-compose.yml        # Docker Compose配置
├── DEPLOYMENT.md            # 部署文档
└── README.md                # 本文件
```

## API端点

### 藏品
- `GET /api/objects` - 获取藏品列表
- `GET /api/objects/:id` - 获取单品详情
- `GET /api/objects/statistics` - 获取统计数据
- `GET /api/objects/classifications` - 获取分类列表
- `GET /api/objects/departments` - 获取部门列表

### 图片
- `GET /api/images` - 获取精选图片
- `GET /api/images/:uuid` - 获取图片信息
- `GET /api/images/:uuid/thumbnail` - 获取缩略图
- `GET /api/images/:uuid/preview` - 获取预览图
- `GET /api/images/:uuid/full` - 获取原图

### 搜索
- `GET /api/search?q=xxx` - 搜索藏品
- `GET /api/search/suggestions?q=xxx` - 获取搜索建议

### 分析
- `GET /api/analysis/statistics` - 获取统计数据
- `GET /api/analysis/timeline` - 获取时间线数据
- `GET /api/analysis/artist-network` - 获取艺术家关系网络
- `GET /api/analysis/color-distribution` - 获取颜色分布

## 主要页面

1. **首页** (`/`) - 精选展示和功能导航
2. **藏品列表** (`/collection`) - 藏品浏览和筛选
3. **搜索页** (`/search?q=xxx`) - 搜索结果
4. **藏品详情** (`/object/:id`) - 单品详情和高清查看
5. **时间线** (`/timeline`) - 艺术史时间线
6. **分析** (`/analysis`) - 数据统计和可视化
7. **关于** (`/about`) - 项目介绍

## 许可证

本项目采用MIT许可证开源。

图片和数据来源: [National Gallery of Art Open Access](https://www.nga.gov/open-access-images.html)，采用CC0公共领域许可。

## 贡献

欢迎提交Issue和Pull Request！

## 联系方式

- 项目地址: https://github.com/your-username/openart
- 数据来源: https://www.nga.gov/
