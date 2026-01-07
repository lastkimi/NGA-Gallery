import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { ObjectModel, ConstituentModel, ImageModel } from '../src/models/schemas';

const BACKUP_DIR = path.join(__dirname, '../../database/backup');
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27019/openart';

// 确保备份目录存在
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

async function backupDatabase() {
  try {
    console.log('正在连接到数据库...');
    await mongoose.connect(MONGO_URI);
    console.log('数据库连接成功');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `backup-${timestamp}`);

    if (!fs.existsSync(backupPath)) {
      fs.mkdirSync(backupPath, { recursive: true });
    }

    console.log('开始备份数据...');

    // 备份统计信息
    const stats = {
      objects: await ObjectModel.countDocuments(),
      constituents: await ConstituentModel.countDocuments(),
      images: await ImageModel.countDocuments(),
      translated: {
        title: await ObjectModel.countDocuments({ title_zh: { $exists: true, $ne: null } }),
        attribution: await ObjectModel.countDocuments({ attribution_zh: { $exists: true, $ne: null } }),
        medium: await ObjectModel.countDocuments({ medium_zh: { $exists: true, $ne: null } }),
      },
      timestamp: new Date().toISOString(),
    };

    fs.writeFileSync(
      path.join(backupPath, 'statistics.json'),
      JSON.stringify(stats, null, 2),
      'utf-8'
    );

    console.log('统计信息已备份:', stats);

    // 备份分类和部门列表（用于快速恢复）
    const classifications = await ObjectModel.distinct('classification');
    const departments = await ObjectModel.distinct('department');

    fs.writeFileSync(
      path.join(backupPath, 'classifications.json'),
      JSON.stringify(classifications, null, 2),
      'utf-8'
    );

    fs.writeFileSync(
      path.join(backupPath, 'departments.json'),
      JSON.stringify(departments, null, 2),
      'utf-8'
    );

    console.log('分类和部门列表已备份');

    // 备份前 100 条示例数据（用于验证）
    const sampleObjects = await ObjectModel.find()
      .limit(100)
      .select('object_id title title_zh attribution attribution_zh classification')
      .lean();

    fs.writeFileSync(
      path.join(backupPath, 'sample-objects.json'),
      JSON.stringify(sampleObjects, null, 2),
      'utf-8'
    );

    console.log('示例数据已备份');

    // 创建备份清单
    const manifest = {
      timestamp: new Date().toISOString(),
      mongoUri: MONGO_URI.replace(/\/\/.*@/, '//***:***@'), // 隐藏密码
      stats,
      files: [
        'statistics.json',
        'classifications.json',
        'departments.json',
        'sample-objects.json',
      ],
    };

    fs.writeFileSync(
      path.join(backupPath, 'manifest.json'),
      JSON.stringify(manifest, null, 2),
      'utf-8'
    );

    console.log(`✅ 备份完成！备份目录: ${backupPath}`);
    console.log(`📊 统计信息:`);
    console.log(`   - 藏品总数: ${stats.objects}`);
    console.log(`   - 艺术家数: ${stats.constituents}`);
    console.log(`   - 图片数: ${stats.images}`);
    console.log(`   - 已翻译标题: ${stats.translated.title}`);
    console.log(`   - 已翻译艺术家: ${stats.translated.attribution}`);
    console.log(`   - 已翻译媒材: ${stats.translated.medium}`);

  } catch (error) {
    console.error('备份失败:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('数据库连接已关闭');
  }
}

// 运行备份
backupDatabase();
