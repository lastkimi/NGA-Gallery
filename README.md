# OpenArt | 全球艺术典藏

一个基于美国国家美术馆（National Gallery of Art）开放数据的在线艺术典藏网站，提供 143,000+ 艺术品的浏览、搜索和分析功能，支持中英文双语。

## 功能特性

- 🖼️ **艺术品浏览** - 浏览超过 143,000 件来自 NGA 的艺术珍品
- 🔍 **高级搜索** - 支持按标题、艺术家、分类、部门等多维度搜索
- 📅 **时间线筛选** - 交互式时间线滑块，按年份范围筛选作品
- 🌐 **SEO 友好 URL** - 使用标题和艺术家名称生成友好的 URL 路径
- 🌓 **深色模式** - 支持浅色/深色主题切换
- 🌍 **多语言支持** - 完整的中英文双语界面和内容翻译
- 📱 **响应式设计** - 完美适配桌面、平板和移动设备
- 🎨 **精美 UI** - 现代化的设计风格，优雅的用户体验

## 技术栈

### 前端
- React 18 + TypeScript
- Vite (构建工具)
- React Router v6
- Zustand (状态管理)
- Tailwind CSS (样式)
- react-i18next (国际化)
- OpenSeadragon (图片查看器)

### 后端
- Node.js + Express
- TypeScript
- MongoDB (数据库)
- Mongoose (ODM)
- 多翻译 API 支持 (Google Translate, SiliconFlow 等)

### 数据源
- [NGA Open Data](https://github.com/NationalGalleryOfArt/opendata)
- [NGA IIIF API](https://api.nga.gov/iiif/)
- 所有图片使用 CC0 公共领域许可

## 快速开始

### 前置要求
- Node.js 18+
- MongoDB 4.4+ (本地或远程)
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

### 配置环境变量

在 `backend` 目录下创建 `.env` 文件：

```env
# MongoDB 连接（默认端口 27019，避免与其他项目冲突）
MONGO_URI=mongodb://localhost:27019/openart

# 服务器端口
PORT=3001

# CORS 配置
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
```

### 开发模式

```bash
# 启动 MongoDB（使用自定义端口避免冲突）
mongod --dbpath ./mongo-data --port 27019

# 启动后端服务器（新终端）
cd backend
npm run dev

# 启动前端开发服务器（新终端）
cd frontend
npm run dev
```

访问 http://localhost:3000

### 数据导入

如果需要导入 NGA 数据：

```bash
cd backend
npm run fetch-data
```

### 翻译数据

项目包含完整的中文翻译。如果需要重新翻译或更新翻译：

```bash
cd backend
npx tsx scripts/translate-ultimate.ts
```

## 项目结构

```
openart/
├── frontend/              # React 前端应用
│   ├── src/
│   │   ├── components/    # React 组件
│   │   ├── pages/         # 页面组件
│   │   ├── services/      # API 服务
│   │   ├── store/         # 状态管理
│   │   ├── hooks/         # 自定义 Hooks
│   │   ├── utils/         # 工具函数（包括 SEO URL 生成）
│   │   ├── locales/       # 国际化文件
│   │   └── types/         # TypeScript 类型定义
│   ├── public/            # 静态资源（Logo、Favicon）
│   └── vite.config.ts
├── backend/               # Node.js 后端
│   ├── src/
│   │   ├── config/         # 配置文件
│   │   ├── controllers/    # 控制器
│   │   ├── models/         # 数据模型（Mongoose）
│   │   ├── routes/         # API 路由
│   │   ├── services/       # 业务逻辑
│   │   └── middleware/     # 中间件
│   ├── scripts/            # 数据获取和处理脚本
│   │   ├── translate-ultimate.ts  # 翻译脚本
│   │   ├── fetch-nga-data.ts      # 数据获取脚本
│   │   └── backup-database.ts     # 数据库备份脚本
│   └── data/               # 数据文件
├── database/              # 数据库相关文件
│   └── backup/             # 数据库备份（Git 跟踪）
└── README.md
```

## API 端点

### 藏品相关
- `GET /api/objects` - 获取藏品列表（支持筛选和分页）
- `GET /api/objects/:id` - 获取单个藏品详情
- `GET /api/objects/:id/details` - 获取完整藏品信息
- `GET /api/objects/classifications` - 获取所有分类
- `GET /api/objects/departments` - 获取所有部门
- `GET /api/objects/statistics` - 获取统计信息

### 图片相关
- `GET /api/images` - 获取图片列表
- `GET /api/images/:uuid` - 获取图片详情
- `GET /api/images/:uuid/thumbnail` - 获取缩略图
- `GET /api/images/:uuid/preview` - 获取预览图

### 搜索相关
- `GET /api/search?q=...` - 全文搜索
- `GET /api/search/suggestions?q=...` - 搜索建议

### 分析相关
- `GET /api/analysis/statistics` - 获取统计信息
- `GET /api/analysis/timeline` - 获取时间线数据
- `GET /api/analysis/artist-network` - 获取艺术家关系网络

## 数据说明

- **总藏品数**: 143,846 件
- **已翻译**: 142,603 件 (99.14%)
- **高清图片**: 100,000+ 张
- **许可**: CC0 公共领域
- **数据来源**: [National Gallery of Art Open Data](https://github.com/NationalGalleryOfArt/opendata)

所有艺术品图片通过 NGA 的 IIIF API 实时加载，支持多分辨率查看。

## 数据库备份

项目包含数据库备份脚本，可以定期备份 MongoDB 数据：

```bash
cd backend
npx tsx scripts/backup-database.ts
```

备份文件保存在 `database/backup/` 目录，已配置 Git 跟踪（仅备份元数据和统计信息，不包含完整数据文件）。

## 部署

### 本地多项目数据库隔离

为了避免本地多个项目使用 MongoDB 时的端口冲突，本项目默认使用端口 **27019**。如果您的其他项目使用默认端口 27017，它们可以同时运行而不会冲突。

### 生产环境部署

#### 方案一：独立数据库实例（推荐）

为每个项目创建独立的 MongoDB 实例或使用云数据库服务（如 MongoDB Atlas）：

```env
MONGO_URI=mongodb://your-connection-string/openart
```

#### 方案二：同一实例，不同数据库名

在同一 MongoDB 实例上为不同项目使用不同的数据库名：

```env
# 项目 A
MONGO_URI=mongodb://localhost:27017/project_a

# 项目 B (OpenArt)
MONGO_URI=mongodb://localhost:27017/openart
```

#### 方案三：Docker 容器化部署

使用 Docker Compose，为每个项目定义独立的数据库服务：

```yaml
services:
  db:
    image: mongo:7
    ports:
      - "27019:27017"
    volumes:
      - ./mongo-data:/data/db
```

### 使用 Docker Compose（推荐）

```bash
docker-compose up -d
```

### 手动部署

1. 构建前端：`cd frontend && npm run build`
2. 构建后端：`cd backend && npm run build`
3. 使用 PM2 管理后端进程：`pm2 start backend/dist/index.js`
4. 配置 Nginx 反向代理

## SEO 优化

项目实现了 SEO 友好的 URL 结构：

- 旧格式：`/object/12345`
- 新格式：`/object/starry-night-vincent-van-gogh-12345`

URL 中包含作品标题和艺术家名称，提升搜索引擎友好性和用户体验。

## 开发指南

### 添加新功能
1. 前端功能在 `frontend/src/` 目录下开发
2. 后端 API 在 `backend/src/routes/` 目录下添加
3. 使用 TypeScript 确保类型安全

### 代码规范
- 使用 ESLint 进行代码检查
- 遵循 TypeScript 严格模式
- 组件使用函数式组件和 Hooks

### 翻译工作流
1. 运行翻译脚本：`npx tsx scripts/translate-ultimate.ts`
2. 检查翻译质量：`npx tsx scripts/check-quality.ts`
3. 修复翻译问题：`npx tsx scripts/fix-mixed-language.ts`

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

本项目使用 MIT 许可证。艺术品图片使用 CC0 公共领域许可。

## 致谢

- [National Gallery of Art](https://www.nga.gov/) - 数据来源
- [Städel Museum](https://sammlung.staedelmuseum.de/) - UI 设计灵感

## 相关链接

- [NGA 开放数据 GitHub](https://github.com/NationalGalleryOfArt/opendata)
- [NGA IIIF API 文档](https://www.nga.gov/artworks/free-images-and-open-access)
- [项目 GitHub](https://github.com/lastkimi/NGA-Gallery)
