# 快速测试指南（Mock API模式）

## ✅ Mock API服务器已启动

现在您可以使用Mock API服务器进行快速测试，**无需数据库**！

## 当前运行的服务

- **Mock API服务器**: http://localhost:3001
  - 使用测试数据JSON文件
  - 100件藏品数据
  - 97张图片（通过IIIF API加载）
  - 所有API端点已实现

- **前端服务**: http://localhost:3000
  - React应用
  - 已配置连接到API

## 访问方式

直接在浏览器打开：**http://localhost:3000**

## 可用功能

✅ 首页浏览  
✅ 藏品列表（100件测试藏品）  
✅ 搜索功能  
✅ 筛选功能  
✅ 藏品详情  
✅ 图片查看（通过IIIF API实时加载）  
✅ 数据分析  
✅ 时间线可视化  

## 测试数据

- **藏品数量**: 100件
- **艺术家数量**: 200位
- **图片数量**: 97张
- **年份范围**: 1310-1992年
- **分类**: 绘画、版画、雕塑、素描等

## API测试

```bash
# 健康检查
curl http://localhost:3001/health

# 获取藏品列表
curl 'http://localhost:3001/api/objects?limit=5'

# 搜索
curl 'http://localhost:3001/api/search?q=painting'

# 获取统计
curl http://localhost:3001/api/analysis/statistics
```

## 注意事项

1. **图片加载**: 所有图片通过NGA的IIIF API实时加载，需要网络连接
2. **数据限制**: 当前只有100条测试数据
3. **性能**: Mock服务器适合开发测试，生产环境建议使用数据库

## 停止服务

如果需要停止Mock API服务器：

```bash
# 查找进程
lsof -ti:3001

# 停止进程（替换PID）
kill <PID>
```

## 切换到真实数据库模式

如果后续需要测试数据库功能：

1. 启动PostgreSQL数据库
2. 运行 `database/init.sql` 创建表
3. 运行 `backend/scripts/import-test-data.js` 导入数据
4. 停止Mock服务器，启动真实后端服务器：`cd backend && npm run dev`
