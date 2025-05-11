const express = require('express');
const { exec } = require('child_process');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 3000;

// 配置
const config = {
  // 默认媒体目录，可以在这里设置
  mediaDirectories: [
    'C:\\Users\\Public\\Videos',  // Windows 示例
    'D:\\Videos',                // 示例额外目录
    '/home/user/Videos',          // Linux 示例
    '/Users/user/Movies'          // macOS 示例
  ]
};

// 加载配置文件(如果存在)
const configPath = path.join(__dirname, 'config.json');
if (fs.existsSync(configPath)) {
  try {
    const userConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (userConfig.mediaDirectories && Array.isArray(userConfig.mediaDirectories)) {
      config.mediaDirectories = userConfig.mediaDirectories;
    }
    console.log('已加载配置文件:', configPath);
  } catch (err) {
    console.error('加载配置文件出错:', err);
  }
}

// 允许跨域请求
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// 根路径重定向到index.html
app.get('/', (req, res) => {
  res.redirect('/index.html');
});

// 查找真实文件路径
function findRealFilePath(filename) {
  // 检查每个媒体目录
  for (const dir of config.mediaDirectories) {
    const fullPath = path.join(dir, filename);
    if (fs.existsSync(fullPath)) {
      console.log(`找到文件: ${fullPath}`);
      return fullPath;
    }
  }
  
  // 如果找不到，递归搜索目录(限制深度)
  for (const dir of config.mediaDirectories) {
    if (!fs.existsSync(dir)) continue;
    
    const foundPath = searchFileInDirectory(dir, filename, 2);
    if (foundPath) {
      console.log(`在子目录中找到文件: ${foundPath}`);
      return foundPath;
    }
  }
  
  return null;
}

// 递归搜索目录
function searchFileInDirectory(dir, filename, depth) {
  if (depth <= 0) return null;
  
  try {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const file of files) {
      if (file.isDirectory()) {
        const subdir = path.join(dir, file.name);
        const result = searchFileInDirectory(subdir, filename, depth - 1);
        if (result) return result;
      } else if (file.name === filename) {
        return path.join(dir, file.name);
      }
    }
  } catch (err) {
    // 忽略权限错误等
    console.log(`搜索目录时出错: ${dir}`, err.message);
  }
  
  return null;
}

// 保存媒体目录
app.post('/api/save-media-directory', (req, res) => {
  const { directory } = req.body;
  
  if (!directory) {
    return res.status(400).json({ error: '缺少目录路径' });
  }
  
  // 检查目录是否存在
  if (!fs.existsSync(directory)) {
    return res.status(400).json({ error: '目录不存在' });
  }
  
  // 添加到媒体目录列表
  if (!config.mediaDirectories.includes(directory)) {
    config.mediaDirectories.push(directory);
    
    // 保存到配置文件
    try {
      fs.writeFileSync(configPath, JSON.stringify({ mediaDirectories: config.mediaDirectories }, null, 2));
      console.log('已保存媒体目录到配置文件');
    } catch (err) {
      console.error('保存配置文件出错:', err);
    }
  }
  
  res.json({
    success: true,
    mediaDirectories: config.mediaDirectories
  });
});

// 获取当前媒体目录
app.get('/api/media-directories', (req, res) => {
  res.json({
    success: true,
    mediaDirectories: config.mediaDirectories
  });
});

// 分析MKV文件结构
app.post('/api/analyze-mkv', (req, res) => {
  const { filename } = req.body;
  
  if (!filename) {
    return res.status(400).json({ error: '缺少文件名' });
  }

  // 查找真实文件路径
  const filePath = findRealFilePath(filename);
  
  if (!filePath) {
    return res.status(404).json({
      error: '找不到文件',
      message: `在配置的媒体目录中找不到文件: ${filename}`,
      mediaDirectories: config.mediaDirectories
    });
  }

  console.log(`分析文件: ${filePath}`);
  
  // 使用ffprobe命令分析MKV文件（而不是ffmpeg）
  const cmd = `ffprobe -v verbose -show_streams -show_format -print_format json -i "${filePath}"`;
  
  exec(cmd, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
    // FFmpeg通常会将信息输出到stderr，这不一定表示错误
    const result = {
      stdout: stdout,
      stderr: stderr
    };
    
    // 解析字幕轨道
    const tracks = parseSubtitleTracks(stderr);
    const attachments = parseAttachments(stderr);
    
    res.json({
      success: true,
      tracks,
      attachments,
      output: result
    });
  });
});

// 提取字幕
app.post('/api/extract-subtitle', (req, res) => {
  const { filename, trackIndex, format } = req.body;
  
  console.log(`提取字幕请求: 文件=${filename}, 轨道=${trackIndex}, 格式=${format}`);
  
  if (!filename || trackIndex === undefined) {
    return res.status(400).json({ error: '参数不完整' });
  }
  
  // 查找真实文件路径
  const filePath = findRealFilePath(filename);
  
  if (!filePath) {
    return res.status(404).json({
      error: '找不到文件',
      message: `在配置的媒体目录中找不到文件: ${filename}`
    });
  }

  const outputFormat = format || 'srt';
  const outputFileName = `subtitle_${Date.now()}.${outputFormat}`;
  const outputPath = path.join(__dirname, 'output', outputFileName);
  
  // 确保输出目录存在
  if (!fs.existsSync(path.join(__dirname, 'output'))) {
    fs.mkdirSync(path.join(__dirname, 'output'), { recursive: true });
  }
  
  console.log(`提取字幕轨道 ${trackIndex} 从文件: ${filePath}`);
  console.log(`输出格式: ${outputFormat}, 输出路径: ${outputPath}`);
  
  // 为调试添加详细日志
  console.log('检查输出目录是否存在:', path.join(__dirname, 'output'));
  console.log('文件路径是否存在:', fs.existsSync(filePath));
  
  // 执行FFmpeg命令提取字幕 - 更简单的命令，提高兼容性
  let cmd;
  if (outputFormat === 'ass') {
    // 对ASS格式使用提取模式
    cmd = `ffmpeg -i "${filePath}" -map 0:s:${trackIndex} -c copy "${outputPath}"`;
  } else {
    // 对SRT等格式使用转换模式
    cmd = `ffmpeg -i "${filePath}" -map 0:s:${trackIndex} -f srt "${outputPath}"`;
  }
  
  console.log(`执行命令: ${cmd}`);
  
  exec(cmd, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
    // 即使存在错误，也尝试读取输出文件
    if (error) {
      console.error('FFmpeg命令执行出错:', error.message);
      console.error('FFmpeg输出:', stderr);
      
      // 检查输出文件是否存在，如果存在，仍然尝试读取
      if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
        console.log('尽管命令返回错误，但输出文件存在，继续处理');
      } else {
        return res.status(500).json({
          success: false,
          error: error.message,
          command: cmd,
          stderr
        });
      }
    }
    
    // 读取生成的字幕文件 - 使用二进制模式读取，避免编码问题
    fs.readFile(outputPath, (err, buffer) => {
      if (err) {
        return res.status(500).json({
          success: false,
          error: err.message
        });
      }
      
      // 尝试使用不同的编码解码文件内容
      let data;
      try {
        // 首先尝试UTF-8
        data = buffer.toString('utf8');
        
        // 如果使用UTF-8解码后包含乱码字符，可能需要尝试其他编码
        if (data.includes('�') && outputFormat === 'ass') {
          // 对于ASS文件，尝试使用GBK/GB18030编码
          // 这需要安装iconv-lite库
          // const iconv = require('iconv-lite');
          // data = iconv.decode(buffer, 'gb18030');
          
          // 由于没有iconv-lite，我们先使用UTF-8，但在响应中添加警告
          console.warn('字幕文件可能包含非UTF-8字符，建议安装iconv-lite库来支持其他编码');
        }
      } catch (e) {
        console.error('解码字幕内容出错:', e);
        data = buffer.toString('utf8'); // 回退到UTF-8
      }
      
      // 记录字幕内容前50个字符用于调试
      console.log(`字幕内容预览: ${data.substring(0, 50)}...`);
      
      try {
        res.json({
          success: true,
          subtitle: data,
          outputPath
        });
      } catch (responseError) {
        console.error('发送响应时出错:', responseError);
        // 如果响应已经发送，这里可能会抛出错误，但我们可以忽略它
      }
      
      // 可以选择删除临时文件
      // fs.unlinkSync(outputPath);
    });
  });
});

// 提取附件
app.post('/api/extract-attachment', (req, res) => {
  const { videoFilename, attachmentFilename } = req.body;
  
  if (!videoFilename || !attachmentFilename) {
    return res.status(400).json({ error: '参数不完整' });
  }
  
  // 查找真实文件路径
  const filePath = findRealFilePath(videoFilename);
  
  if (!filePath) {
    return res.status(404).json({
      error: '找不到文件',
      message: `在配置的媒体目录中找不到文件: ${videoFilename}`
    });
  }

  const outputPath = path.join(__dirname, 'output', attachmentFilename);
  
  // 确保输出目录存在
  if (!fs.existsSync(path.join(__dirname, 'output'))) {
    fs.mkdirSync(path.join(__dirname, 'output'), { recursive: true });
  }
  
  console.log(`提取附件 ${attachmentFilename} 从文件: ${filePath}`);
  
  // 执行FFmpeg命令提取附件
  // 注意：dump_attachment参数在不同版本的FFmpeg中可能有所不同
  // 尝试更可靠的命令格式
  const cmd = `ffmpeg -i "${filePath}" -dump_attachment:t:0 "${attachmentFilename}" -y "${outputPath}"`;
  console.log(`执行命令: ${cmd}`);
  
  exec(cmd, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
    if (error) {
      console.error('提取附件错误:', error.message);
      console.error('FFmpeg输出:', stderr);
      
      // 尝试使用替代命令
      console.log('尝试替代提取命令...');
      const altCmd = `ffmpeg -i "${filePath}" -dump_attachment:t "${attachmentFilename}" "${outputPath}"`;
      console.log(`替代命令: ${altCmd}`);
      
      return exec(altCmd, { maxBuffer: 10 * 1024 * 1024 }, (err2, stdout2, stderr2) => {
        if (err2) {
          console.error('替代命令也失败:', err2.message);
          return res.status(500).json({
            success: false,
            error: error.message,
            stderr,
            altError: err2.message,
            altStderr: stderr2,
            command: cmd,
            altCommand: altCmd
          });
        }
        
        // 继续处理，检查文件是否存在
        if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
          return res.status(500).json({
            success: false,
            error: '附件提取成功但文件为空或不存在'
          });
        }
        
        continueWithAttachment();
      });
    }
    
    // 如果没有错误，继续处理
    continueWithAttachment();
    
    // 封装附件处理逻辑，避免代码重复
    function continueWithAttachment() {
    
      // 检查文件是否存在
      if (!fs.existsSync(outputPath)) {
        return res.status(500).json({
          success: false,
          error: '附件文件不存在'
        });
      }
      
      // 检查文件是否是文本文件
      const ext = path.extname(attachmentFilename).toLowerCase();
      const isText = ['.srt', '.ass', '.ssa', '.vtt'].includes(ext);
      
      if (isText) {
        // 读取文本文件
        fs.readFile(outputPath, 'utf8', (err, data) => {
          if (err) {
            return res.status(500).json({
              success: false,
              error: err.message
            });
          }
          
          res.json({
            success: true,
            content: data,
            isText: true,
            outputPath
          });
        });
      } else {
        // 二进制文件只返回路径
        res.json({
          success: true,
          isText: false,
          outputPath
        });
      }
    }
  });
});

// 下载文件
app.get('/api/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'output', filename);
  
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).json({ error: '文件不存在' });
  }
});

// 解析字幕轨道信息
function parseSubtitleTracks(output) {
  const tracks = [];
  const lines = output.split('\n');
  
  // 使用多种模式匹配字幕轨道信息
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 模式1：标准格式
    let match = line.match(/Stream #\d+:(\d+)(?:\(([^)]+)\))?: Subtitle: ([^,]+)(.*)/);
    
    // 模式2：备用格式
    if (!match) {
      match = line.match(/Stream #(\d+:\d+)(?:\(([^)]+)\))?.*?Subtitle:? ([^,]+)(.*)/);
    }
    
    if (match) {
      let trackNumber;
      
      // 处理不同格式的轨道索引
      if (typeof match[1] === 'string' && match[1].includes(':')) {
        trackNumber = parseInt(match[1].split(':')[1], 10);
      } else {
        trackNumber = parseInt(match[1], 10);
      }
      
      const language = match[2] || '未知';
      const format = match[3] || '未知';
      
      tracks.push({
        type: 'track',
        index: trackNumber,
        language,
        format,
        description: `轨道 ${trackNumber + 1}: ${language} (${format})`
      });
    }
  }
  
  return tracks;
}

// 解析附件信息
function parseAttachments(output) {
  const attachments = [];
  const lines = output.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 匹配模式1
    let match = line.match(/\s*Attachment:\s+([^,]+),\s+mimetype:\s+([^,\s]+)/i);
    
    // 匹配模式2
    if (!match) {
      match = line.match(/\s*([^(]+)\s*\([^)]*附件[^)]*,\s*mimetype:\s*([^)]+)\)/i);
    }
    
    if (match) {
      const filename = match[1].trim();
      const mimetype = match[2].trim();
      const ext = path.extname(filename).toLowerCase();
      
      // 检查是否是字幕或字体文件
      const isSubtitle = ['.srt', '.ass', '.ssa', '.vtt'].includes(ext);
      const isFont = ['.ttf', '.otf'].includes(ext);
      
      if (isSubtitle || isFont) {
        attachments.push({
          type: 'attachment',
          filename,
          mimetype,
          isSubtitle,
          isFont,
          description: `附件: ${filename} (${isSubtitle ? '字幕' : isFont ? '字体' : mimetype})`
        });
      }
    }
  }
  
  return attachments;
}

// 启动服务器
app.listen(port, () => {
  console.log(`本地服务器已启动，访问 http://localhost:${port}/index.html`);
  console.log(`请确保直接访问index.html页面，而不是根路径`);
});