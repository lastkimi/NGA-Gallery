# Universal Translator (通用翻译工具)

这是一个基于 TypeScript 的高性能、通用翻译工具，提取自 OpenArt 生产环境的翻译引擎。它旨在解决大规模文本翻译时的速度、成本和质量平衡问题。

## 🌟 核心特性

- **多源并发架构**：
  - **Google Mirrors**: 内置全球 50+ 个 Google 翻译镜像，自动轮询与负载均衡，实现免费、高并发的快速翻译。
  - **SiliconFlow (AI)**: 集成 SiliconFlow API (支持 Qwen/DeepSeek 等模型)，专门处理长难句，保证翻译质量。
- **智能调度**：
  - **长短文路由**: 短文本优先走 Google 镜像，长文本 (>500字符) 自动路由至 AI 模型。
  - **自动降级**: 主线路失败时自动尝试备用线路。
- **双模式支持**：
  - **CLI 模式**: 命令行批量处理 JSON 文件，支持断点续传（通过实时保存）和进度显示。
  - **Server 模式**: 启动本地 HTTP API 服务器，作为其他服务的翻译网关。

## 🚀 快速开始

### 1. 安装依赖

本项目依赖 Node.js 环境。只需安装 `node-fetch` 和 `ts-node` 即可运行。

```bash
# 如果在现有项目中
npm install node-fetch
npm install -g ts-node typescript

# 如果是独立运行
npm install node-fetch@2  # 注意：node-fetch v3+ 是 ESM-only，如遇问题请用 v2 或配置 type: module
npm install -D ts-node typescript @types/node @types/node-fetch
```

### 2. 配置 (可选)

打开 `universal-translator.ts` 文件顶部的 `CONFIG` 对象进行修改：

```typescript
const CONFIG = {
    CONCURRENCY: 200,       // 并发数，建议 50-300
    SAVE_INTERVAL: 100,     // 每处理 100 条保存一次文件
    SILICONFLOW_KEY: 'sk-...', // 你的 SiliconFlow API Key
    LONG_TEXT_THRESHOLD: 500 // 长文阈值
};
```

### 3. CLI 模式：批量翻译文件

准备一个 JSON 文件 (数组或对象均可)，工具会自动查找 `title`, `description`, `content`, `text` 等常用字段进行翻译，并将结果保存为 `_translated` 字段。

```bash
# 格式: ts-node universal-translator.ts file <文件路径> [目标语言代码]
ts-node universal-translator.ts file ./data/articles.json zh-CN
```

运行效果：
```text
🚀 开始处理 5000 条数据，并发数: 200...
✅ 进度: 1500/5000 | 速度: 125.4 ops
```

### 4. Server 模式：启动翻译 API

启动一个轻量级 HTTP 服务器，供其他程序调用。

```bash
# 格式: ts-node universal-translator.ts server [端口号]
ts-node universal-translator.ts server 3000
```

**调用示例**:

```bash
curl -X POST http://localhost:3000/translate \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world, this is a universal translator.", "target_lang": "zh-CN"}'
```

**响应**:
```json
{
  "original": "Hello world, this is a universal translator.",
  "translated": "你好世界，这是一个通用翻译器。",
  "provider": "Fast-Mix"
}
```

## 📊 性能报告

在标准网络环境下 (推荐服务器环境)，性能参考如下：

| 模式 | 并发数 | 平均速度 (条/秒) | 适用场景 |
|------|--------|------------------|----------|
| Google Mirrors | 200 | ~150 - 300 ops | 短文本、标签、标题、UI 界面 |
| SiliconFlow AI | 50 | ~20 - 50 ops | 长文章、博客、技术文档 |
| 混合模式 | 300 | ~200+ ops | 混合内容的数据库清洗 |

## ⚠️ 注意事项

1. **IP 限制与反爬虫**:
   - Google Mirror 虽然使用了大量镜像，但如果在单一 IP 下请求过猛 (如 >500 RPS)，仍可能触发临时封禁（表现为 429 或 503）。
   - **解决方案**: 降低 `CONCURRENCY` 至 50-100，或在不同 IP 的服务器上分片运行。

2. **数据安全**:
   - CLI 模式会直接修改源文件的副本 (生成 `_translated.json`)，请确保源文件已备份。
   - 敏感数据建议使用私有部署的大模型或官方付费 API。

3. **依赖说明**:
   - 脚本使用了 `node-fetch`。在 Node.js 18+ 环境中，你可以移除 `import fetch` 并直接使用原生 `fetch` (需微调代码类型定义)。

## 🛠️ 扩展开发

想要添加新的翻译源（如 DeepL, Baidu）？只需实现 `TranslationProvider` 接口：

```typescript
class DeepLProvider implements TranslationProvider {
    name = 'DeepL';
    async translate(text: string, lang: string): Promise<string | null> {
        // 调用 DeepL API...
    }
}
```

并在 `TranslationScheduler` 中注册即可。
