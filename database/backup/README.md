# 数据库备份目录

此目录用于存储数据库备份文件。

## 备份内容

备份脚本 (`backend/scripts/backup-database.ts`) 会生成以下文件：

- `statistics.json` - 数据库统计信息（总记录数、翻译进度等）
- `classifications.json` - 所有分类列表
- `departments.json` - 所有部门列表
- `sample-objects.json` - 前 100 条示例数据（用于验证）
- `manifest.json` - 备份清单和元数据

## 运行备份

确保 MongoDB 正在运行，然后执行：

```bash
cd backend
npx tsx scripts/backup-database.ts
```

备份文件会保存在 `database/backup/backup-YYYY-MM-DDTHH-MM-SS/` 目录下。

## 注意事项

- 备份文件已配置 Git 跟踪，但仅包含元数据和统计信息
- 完整数据库文件（.wt, .bson）不会提交到 Git（文件过大）
- 如需完整备份，请使用 `mongodump` 命令
