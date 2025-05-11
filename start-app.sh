#!/bin/bash

echo "MKV字幕提取工具 - 启动脚本"
echo "========================="

# 检查node是否安装
if ! command -v node &> /dev/null; then
    echo "错误: 未安装Node.js! 请安装Node.js后再运行此脚本。"
    echo "下载地址: https://nodejs.org/"
    exit 1
fi

# 检查ffmpeg是否安装
if ! command -v ffmpeg &> /dev/null || ! command -v ffprobe &> /dev/null; then
    echo "警告: 未检测到FFmpeg或FFprobe。应用可能无法正常工作。"
    echo "请确保FFmpeg已安装并添加到系统PATH。"
    echo "继续运行? 按Enter键继续，Ctrl+C退出..."
    read
fi

echo
echo "步骤1: 安装依赖"
echo "-----------------"
npm install
if [ $? -ne 0 ]; then
    echo "错误: 依赖安装失败!"
    exit 1
fi

echo
echo "步骤2: 构建前端代码"
echo "-----------------"
npm run build
if [ $? -ne 0 ]; then
    echo "错误: 构建前端代码失败!"
    exit 1
fi

echo
echo "步骤3: 启动服务器"
echo "-----------------"
echo "服务器正在启动，请在浏览器中访问 http://localhost:3000"
echo "按Ctrl+C可停止服务器"
echo

# 启动服务器
node server.js

# 如果服务器异常退出
echo
echo "服务器已停止运行。"