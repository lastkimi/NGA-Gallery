#!/bin/bash

LOG_FILE="/Users/brucelieu/Desktop/openart/backend/translation_progress.log"
CHECK_INTERVAL=5

echo "开始监控翻译进度..."
echo "日志文件: $LOG_FILE"
echo "检查间隔: ${CHECK_INTERVAL}秒"
echo "按 Ctrl+C 停止监控"
echo ""

while true; do
    clear
    echo "=== 翻译进度监控 ==="
    echo "时间: $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""
    
    if [ -f "$LOG_FILE" ]; then
        echo "--- 最新日志 (最后20行) ---"
        tail -20 "$LOG_FILE"
        echo ""
        echo "--- 统计信息 ---"
        
        # 提取已处理数量
        PROCESSED=$(tail -1 "$LOG_FILE" | grep -oP '已处理: \K\d+' | head -1)
        SPEED=$(tail -1 "$LOG_FILE" | grep -oP '速度: \K[\d.]+' | head -1)
        
        if [ ! -z "$PROCESSED" ]; then
            echo "已处理: $PROCESSED"
            if [ ! -z "$SPEED" ]; then
                echo "当前速度: $SPEED 文档/秒"
                
                # 计算剩余时间和预计完成时间
                REMAINING=$((94507 - PROCESSED))
                if [ "$REMAINING" -gt 0 ] && [ ! -z "$SPEED" ]; then
                    ESTIMATED_SECONDS=$(echo "$REMAINING / $SPEED" | bc -l 2>/dev/null || echo "0")
                    ESTIMATED_MINUTES=$(echo "$ESTIMATED_SECONDS / 60" | bc -l 2>/dev/null || echo "0")
                    echo "剩余记录: $REMAINING"
                    if [ ! -z "$ESTIMATED_MINUTES" ] && [ "$ESTIMATED_MINUTES" != "0" ]; then
                        echo "预计剩余时间: $(printf "%.1f" $ESTIMATED_MINUTES) 分钟"
                    fi
                fi
            fi
        fi
    else
        echo "日志文件尚未生成，等待脚本启动..."
    fi
    
    echo ""
    echo "下次更新: ${CHECK_INTERVAL}秒后..."
    sleep $CHECK_INTERVAL
done
