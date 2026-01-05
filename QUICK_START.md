# 快速启动指南

## 当前状态

✅ 项目结构已创建
✅ 测试数据已生成（100条记录）
✅ 前端和后端服务已配置

## 快速测试（无需数据库）

前端服务已运行在 http://localhost:3000

由于使用IIIF API，图片可以实时从NGA服务器加载，无需本地下载。

## 完整测试（需要数据库）

### 1. 启动PostgreSQL数据库

```bash
# 使用Docker（推荐）
docker run -d \
  --name nga-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=nga_museum \
  -p 5432:5432 \
  postgres:15-alpine
```

### 2. 创建数据库表

```bash
psql -h localhost -U postgres -d nga_museum -f database/init.sql
```

### 3. 导入测试数据

```bash
cd backend
export DB_PASSWORD=postgres
node scripts/import-test-data.js
```

### 4. 启动服务

```bash
# 后端（如果还没启动）
cd backend && npm run dev

# 前端（如果还没启动）
cd frontend && npm run dev
```

### 5. 访问

- 前端: http://localhost:3000
- 后端API: http://localhost:3001
- API健康检查: http://localhost:3001/health

## 测试数据说明

测试数据包含：
- 100件藏品
- 200位艺术家
- 97张图片链接（使用IIIF API）

所有图片都通过IIIF API实时加载，无需本地存储。

## 问题排查

### 数据库连接失败

检查PostgreSQL是否运行：
```bash
docker ps | grep postgres
# 或
psql -h localhost -U postgres -c "SELECT 1"
```

### API返回空数据

确保已导入测试数据到数据库。

### 图片不显示

图片通过IIIF API加载，需要网络连接。检查浏览器控制台是否有错误。

