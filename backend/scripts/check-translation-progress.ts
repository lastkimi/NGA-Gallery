import mongoose from 'mongoose';
import { config } from '../src/config';
import { ObjectModel } from '../src/models/schemas';

async function checkTranslationProgress() {
  try {
    await mongoose.connect(config.database.uri);
    console.log('已连接到数据库\n');

    const totalDocs = await ObjectModel.countDocuments({});
    
    // 检查待翻译的记录（使用与 translate-ultimate.ts 相同的查询条件）
    const query = {
        $or: [
            { title_zh: { $exists: false } },
            { title_zh: null },
            { title_zh: "" },
            
            { medium_zh: { $exists: false } },
            { medium_zh: null },
            { medium_zh: "" },
            
            { attribution_zh: { $exists: false } },
            { attribution_zh: null },
            { attribution_zh: "" }
        ]
    };
    
    const countToProcess = await ObjectModel.countDocuments(query);
    
    // 检查最近24小时更新的记录
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentUpdates = await ObjectModel.countDocuments({
        $or: [
            { title_zh: { $exists: true, $ne: null, $ne: "" } },
            { attribution_zh: { $exists: true, $ne: null, $ne: "" } },
            { medium_zh: { $exists: true, $ne: null, $ne: "" } }
        ],
        updated_at: { $gte: oneDayAgo }
    });

    // 检查最近更新的记录详情
    const latestUpdated = await ObjectModel.findOne(
        { updated_at: { $exists: true } },
        { object_id: 1, title: 1, title_zh: 1, updated_at: 1 },
        { sort: { updated_at: -1 } }
    );

    console.log('=== 翻译进度检查 ===');
    console.log(`总记录数: ${totalDocs.toLocaleString()}`);
    console.log(`待翻译记录: ${countToProcess.toLocaleString()} (${((countToProcess / totalDocs) * 100).toFixed(2)}%)`);
    console.log(`已完成记录: ${(totalDocs - countToProcess).toLocaleString()} (${(((totalDocs - countToProcess) / totalDocs) * 100).toFixed(2)}%)`);
    console.log(`\n最近24小时更新: ${recentUpdates.toLocaleString()} 条记录`);
    
    if (latestUpdated && latestUpdated.updated_at) {
        const lastUpdateTime = new Date(latestUpdated.updated_at);
        const hoursAgo = (Date.now() - lastUpdateTime.getTime()) / (1000 * 60 * 60);
        console.log(`\n最近更新记录:`);
        console.log(`  ID: ${latestUpdated.object_id}`);
        console.log(`  标题: ${latestUpdated.title}`);
        console.log(`  标题(中): ${latestUpdated.title_zh || '(未翻译)'}`);
        console.log(`  更新时间: ${lastUpdateTime.toLocaleString('zh-CN')}`);
        console.log(`  距离现在: ${hoursAgo.toFixed(1)} 小时前`);
    } else {
        console.log('\n未找到最近更新的记录');
    }

    // 估算完成时间（基于之前的翻译速度）
    // 假设速度为 25-30 文档/秒
    const avgSpeed = 27.5; // 文档/秒
    const estimatedSeconds = countToProcess / avgSpeed;
    const estimatedHours = estimatedSeconds / 3600;
    const estimatedDays = estimatedHours / 24;

    console.log(`\n=== 估算完成时间 ===`);
    console.log(`假设速度: ${avgSpeed} 文档/秒`);
    console.log(`预计需要: ${estimatedHours.toFixed(1)} 小时 (${estimatedDays.toFixed(2)} 天)`);

    await mongoose.disconnect();
    console.log('\n检查完成');
  } catch (error) {
    console.error('错误:', error);
    process.exit(1);
  }
}

checkTranslationProgress();
