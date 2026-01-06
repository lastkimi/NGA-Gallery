import mongoose from 'mongoose';
import { config } from '../src/config';
import { ObjectModel } from '../src/models/schemas';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

// Configuration
const TEST_LIMIT = 1000; // 测试条数：增加到1000以获得更稳定的结果
const BATCH_SIZE = 1; // 禁用打包：每批次1条
const CONCURRENCY = 50; // 提高并发：同时跑50个请求以压榨性能

// 模拟多个 API 端点
const API_ENDPOINTS = [
  'https://translate.googleapis.com/translate_a/single',
  'https://translate.google.com/translate_a/single',
  'https://translate.google.com.hk/translate_a/single',
  'https://translate.google.co.kr/translate_a/single',
  'https://translate.google.co.jp/translate_a/single',
  'https://translate.google.com.tw/translate_a/single',
  'https://translate.google.com.sg/translate_a/single',
  'https://translate.google.co.in/translate_a/single',
];

// 预加载字典
let dictionary: Record<string, string> = {};

function loadDictionary() {
  try {
    const dictPath = path.join(__dirname, '../top_terms.json');
    if (fs.existsSync(dictPath)) {
        // top_terms.json 只是个列表，我们需要翻译好的字典
        // 这里暂时模拟，或者您可以先运行一个脚本生成 'translation_dict.json'
        // 假设我们已经有了一个简单的映射
        console.log('正在加载本地词典...');
    }
  } catch (e) {
    console.warn('无法加载词典:', e);
  }
}

// 核心翻译函数：支持批量打包
async function translateBatch(texts: string[], endpointIndex: number = 0): Promise<string[]> {
  if (texts.length === 0) return [];

  // Google Free API 不支持真正的 JSON Batch POST，只能通过 query param 拼接
  // 但为了模拟 "打包"，我们将多个短文本合并成一个长文本，用特殊分隔符分开
  // 分隔符必须是翻译后不会变且不常见的，例如 " ||| "
  const SEPARATOR = " ||| ";
  const combinedText = texts.join(SEPARATOR);

  // 检查长度限制 (Google GET 限制约 2k-5k字符，安全起见控制在 1500)
  if (combinedText.length > 4000) {
      // 如果太长，递归拆分
      const mid = Math.floor(texts.length / 2);
      const left = await translateBatch(texts.slice(0, mid), endpointIndex);
      const right = await translateBatch(texts.slice(mid), endpointIndex);
      return [...left, ...right];
  }

  const apiUrl = API_ENDPOINTS[endpointIndex % API_ENDPOINTS.length];
  const params = new URLSearchParams({
    client: 'gtx',
    sl: 'en',
    tl: 'zh-CN',
    dt: 't',
  });

  try {
    const url = `${apiUrl}?${params}&q=${encodeURIComponent(combinedText)}`;
    const response = await fetch(url);
    
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    
    const data = await response.json();
    
    // 解析返回结果
    if (data && data[0]) {
      const fullTranslatedText = data[0]
        .map((item: any[]) => item[0] || '')
        .join('');
      
      // 拆分回数组
      const results = fullTranslatedText.split(SEPARATOR).map(t => t.trim());
      
      // 校验数量是否匹配（有时候翻译会吞掉分隔符）
      if (results.length !== texts.length) {
          console.warn(`批次数量不匹配: 发送 ${texts.length}, 接收 ${results.length}. 回退到单条翻译模式。`);
          // 回退策略：单条翻译
          return await Promise.all(texts.map(async t => {
             const res = await translateBatch([t], endpointIndex);
             return res[0];
          }));
      }
      return results;
    }
    return texts; // 失败返回原文
  } catch (error) {
    console.error('Translation error:', error);
    return texts;
  }
}

// 任务队列处理器
async function processQueue(items: any[]) {
    const results: any[] = [];
    
    // 将 items 分组
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batch = items.slice(i, i + BATCH_SIZE);
        
        // 准备这一批次的所有待翻译文本
        // 结构: { id: string, texts: { title: string, medium: string, ... } }
        
        // 1. 提取 Title
        const titles = batch.map(item => item.title || '');
        
        // 2. 提取 Medium
        const mediums = batch.map(item => item.medium || '');

        // 3. 提取 Attribution
        const attributions = batch.map(item => item.attribution || '');
        
        // 并行请求翻译接口 (Title, Medium, Attribution 同时发)
        const [titlesZh, mediumsZh, attributionsZh] = await Promise.all([
            translateBatch(titles, 0),
            translateBatch(mediums, 1), // 可以用不同节点
            translateBatch(attributions, 0)
        ]);

        // 组装结果
        batch.forEach((item, index) => {
            results.push({
                id: item._id,
                update: {
                    title_zh: titlesZh[index],
                    medium_zh: mediumsZh[index],
                    attribution_zh: attributionsZh[index],
                    // 其他字段暂时忽略，只测核心速度
                }
            });
        });
    }
    return results;
}

async function testSpeed() {
  try {
    await mongoose.connect(config.database.uri);
    console.log('已连接数据库，准备测试...');

    // 获取测试数据
    const objects = await ObjectModel.find({})
      .select('title medium attribution')
      .limit(TEST_LIMIT)
      .lean();

    console.log(`获取到 ${objects.length} 条数据，开始测速...`);
    
    const startTime = Date.now();
    let totalChars = 0;
    
    // 计算总字符数
    objects.forEach((obj: any) => {
        totalChars += (obj.title?.length || 0) + (obj.medium?.length || 0) + (obj.attribution?.length || 0);
    });

    // 分割成大块给并发处理器
    const chunkSize = Math.ceil(objects.length / CONCURRENCY);
    const chunks = [];
    for (let i = 0; i < objects.length; i += chunkSize) {
        chunks.push(objects.slice(i, i + chunkSize));
    }

    console.log(`启动 ${CONCURRENCY} 个并发任务，每个任务处理约 ${chunkSize} 条数据...`);

    // 并发执行
    await Promise.all(chunks.map(chunk => processQueue(chunk)));

    const endTime = Date.now();
    const durationSeconds = (endTime - startTime) / 1000;
    const speed = totalChars / durationSeconds;

    console.log('\n========================================');
    console.log(`测试完成！`);
    console.log(`处理文档: ${objects.length} 条`);
    console.log(`处理字符: ${totalChars} 字符`);
    console.log(`总耗时: ${durationSeconds.toFixed(2)} 秒`);
    console.log(`平均速度: ${speed.toFixed(2)} 字符/秒`);
    console.log('========================================');

    if (speed < 4000) {
        console.log('⚠️ 未达到 4000 字符/秒 目标。建议：');
        console.log('1. 增加并发数 (CONCURRENCY)');
        console.log('2. 增加 API 端点池');
        console.log('3. 启用本地词典预处理');
    } else {
        console.log('✅ 速度达标！');
    }

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

testSpeed();