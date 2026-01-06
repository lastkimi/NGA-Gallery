#!/bin/bash

LOG_FILE="/Users/brucelieu/Desktop/openart/backend/translation_progress.log"

if [ ! -f "$LOG_FILE" ]; then
    echo "日志文件不存在，等待脚本启动..."
    exit 1
fi

# 获取最新进度
LATEST=$(tail -1 "$LOG_FILE")

# 提取数字
PROCESSED=$(echo "$LATEST" | grep -oE '已处理: [0-9]+' | grep -oE '[0-9]+' | head -1)
SPEED=$(echo "$LATEST" | grep -oE '速度: [0-9.]+' | grep -oE '[0-9.]+' | head -1)

if [ -z "$PROCESSED" ]; then
    echo "等待进度信息..."
    tail -5 "$LOG_FILE"
    exit 0
fi

TOTAL=94507
REMAINING=$((TOTAL - PROCESSED))
PROGRESS=$(echo "scale=2; $PROCESSED * 100 / $TOTAL" | bc)

echo "=== 翻译进度 ==="
echo "总待处理: $TOTAL"
echo "已处理: $PROCESSED"
echo "剩余: $REMAINING"
echo "完成度: ${PROGRESS}%"
echo "当前速度: $SPEED 文档/秒"

if [ ! -z "$SPEED" ] && [ "$SPEED" != "0" ]; then
    ESTIMATED=$(echo "scale=1; $REMAINING / $SPEED" | bc)
    ESTIMATED_MIN=$(echo "scale=1; $ESTIMATED / 60" | bc)
    echo "预计剩余时间: ${ESTIMATED_MIN} 分钟"
fi

echo ""
echo "--- 最新日志 ---"
tail -3 "$LOG_FILE"
