# MKV字幕提取工具

一个使用本地FFmpeg命令行的MKV字幕提取工具，可以轻松提取和预览MKV文件中的字幕。

## 特点

- **无需加载整个文件**：使用本地FFmpeg直接处理文件，不需要将大文件加载到浏览器内存中
- **支持多种字幕格式**：支持SRT、ASS、SSA等常见字幕格式
- **自动搜索文件**：在配置的媒体目录中自动查找文件，无需手动输入完整路径
- **预览功能**：提取前可以预览字幕内容
- **支持字幕附件**：可以提取MKV文件中作为附件的字幕文件

## 安装

1. 确保已安装Node.js环境
2. 安装必要的依赖：
   ```bash
   npm install express cors
   ```
3. 确保系统已安装FFmpeg和FFprobe，并且可以在命令行中访问

## 配置

编辑`config.json`文件，配置您的媒体目录：

```json
{
  "mediaDirectories": [
    "C:\\Users\\Public\\Videos",
    "D:\\Videos",
    "/home/user/Videos",
    "/Users/user/Movies"
  ]
}
```

添加您实际存放MKV文件的目录路径。

## 使用方法（完整安装）

1. 安装依赖并构建前端代码：
   ```bash
   npm install       # 首次运行时安装依赖
   npm run build     # 构建前端代码
   ```

2. 启动本地服务器：
   ```bash
   node server.js
   ```

3. 在浏览器中访问：
   ```
   http://localhost:3000/index.html
   ```
   或者直接访问 `http://localhost:3000/`（已配置自动重定向到index.html）

## 使用方法（仅服务器）

如果您只想运行服务器部分，不需要修改前端代码，可以使用简化安装：

1. 只安装服务器依赖：
   ```bash
   npm install --production --prefix=./server-only
   ```
   或者手动安装：
   ```bash
   npm install express cors
   ```

2. 启动服务器：
   ```bash
   node server.js
   ```

3. 在浏览器中访问：
   ```
   http://localhost:3000/
   ```

## 快速启动（使用脚本）

### Windows用户
只需双击`start-app.bat`文件，脚本会自动:
1. 安装必要的依赖
2. 构建前端代码
3. 启动服务器

### Linux/macOS用户
```bash
# 首次使用前，使脚本可执行
chmod +x start-app.sh

# 运行脚本
./start-app.sh
```

## 故障排除

### 应用卡在"初始化应用"阶段
- 确保您已经运行了`npm run build`命令构建前端代码
- 检查项目根目录下是否存在`bundle.js`文件
- 如果访问根路径`/`没有自动跳转，请尝试直接访问`/index.html`
- 检查浏览器控制台是否有错误信息
- 尝试清除浏览器缓存后重新加载页面

### 前端和后端分别启动问题
- 本项目是一个集成应用，前端代码需要构建后由后端服务器提供
- 如果您想分离前后端:
  1. 前端可以通过`npm run dev`启动开发服务器
  2. 后端仍然通过`node server.js`启动
  3. 需要修改前端代码中的API URL，指向正确的后端地址

### 找不到文件
- 确保MKV文件位于`config.json`中配置的媒体目录中
- 当应用提示输入目录时，输入文件的实际目录路径
- 目录路径格式正确（Windows使用`\\`或`/`作为分隔符）

### 预览或提取字幕失败
- 检查服务器控制台输出的错误信息
- 确认FFmpeg命令执行正确
- 对于包含多个字幕轨道的文件，尝试选择不同的轨道

## 工作原理

1. 前端应用允许用户选择MKV文件
2. 应用将文件名发送到本地服务器
3. 服务器在配置的媒体目录中查找该文件
4. 服务器使用FFprobe分析文件结构，找出所有字幕轨道
5. 用户选择字幕后，服务器使用FFmpeg提取字幕内容
6. 提取的字幕可以直接预览或下载

## 技术架构

应用使用客户端-服务器架构：
- 前端：纯HTML、CSS和JavaScript
- 后端：Node.js + Express服务器
- 处理引擎：本地FFmpeg和FFprobe命令行工具
- 通信：通过HTTP API进行前后端数据交换

## 依赖项

- Express.js：用于创建本地HTTP服务器
- FFmpeg：用于分析和提取MKV文件中的字幕
- 浏览器端：标准HTML5、CSS3和JavaScript

## 贡献

欢迎提交问题和改进建议！如有任何问题，请在GitHub上提交issue。

## 许可

MIT许可证