# 测试数据使用指南

## 已生成的测试数据

已成功处理了100条藏品记录用于测试，数据保存在 `data/processed/` 目录：

- `test_objects.json` - 100件藏品数据
- `test_constituents.json` - 200位艺术家数据  
- `test_images.json` - 97张图片数据
- `test_statistics.json` - 统计信息

## 测试数据统计

- **藏品数量**: 100件
- **艺术家数量**: 200位
- **图片数量**: 97张
- **有图片的藏品**: 94件
- **分类**: 5种（Painting, Print, Sculpture, Drawing, Index of American Design）
- **部门**: 9个
- **年份范围**: 1310 - 1992年

## 使用测试数据

### 方式1: 导入到数据库（推荐用于后端测试）

1. **确保PostgreSQL已安装并运行**

```bash
# 使用Docker启动PostgreSQL
docker run -d \
  --name nga-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=nga_museum \
  -p 5432:5432 \
  postgres:15-alpine

# 或者使用现有的PostgreSQL服务
```

2. **创建数据库表结构**

```bash
cd /Users/brucelieu/Desktop/openart
psql -U postgres -d nga_museum -f database/init.sql

# 或者使用环境变量
export DB_PASSWORD=your_password
psql -h localhost -U postgres -d nga_museum -f database/init.sql
```

3. **导入测试数据**

```bash
cd backend
export DB_PASSWORD=postgres  # 或您的数据库密码
node scripts/import-test-data.js
```

### 方式2: 使用JSON文件进行前端Mock测试

测试数据JSON文件可以直接用于前端开发：

```javascript
// 在测试中使用
import testObjects from '../../data/processed/test_objects.json';
import testImages from '../../data/processed/test_images.json';
```

### 方式3: 扩大测试数据量

如果想处理更多数据用于测试：

```bash
# 修改 scripts/fetch-nga-data-test.js 中的 TEST_LIMIT
# 例如改为 1000 条记录
const TEST_LIMIT = 1000;

# 重新运行
node scripts/fetch-nga-data-test.js
```

## 验证数据导入

```sql
-- 连接到数据库
psql -U postgres -d nga_museum

-- 检查数据
SELECT COUNT(*) FROM objects;
SELECT COUNT(*) FROM constituents;
SELECT COUNT(*) FROM images;

-- 查看示例数据
SELECT title, attribution, display_date FROM objects LIMIT 5;
```

## 下一步

1. ✅ 测试数据已生成
2. ⏭️ 导入数据库（如果需要后端API测试）
3. ⏭️ 启动前端和后端服务进行测试
4. ⏭️ 下载部分图片进行可视化测试
