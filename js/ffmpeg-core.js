// js/ffmpeg-core.js
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { appState } from './app.js';

// 定义支持的字幕格式MIME类型
const SUBTITLE_MIME_TYPES = [
  'application/x-subrip',               // SRT
  'text/x-ssa',                         // SSA/ASS
  'text/plain',                         // 可能是文本格式字幕
  'application/x-truetype-font',        // 字幕可能使用的字体
  'application/vnd.ms-opentype'         // 字体
];

// 创建FFmpeg实例
let ffmpeg = null;

// 延迟加载标志
let isLoading = false;
let isLoaded = false;

// 初始化FFmpeg
export async function initFFmpeg() {
  if (isLoaded) return true;
  if (isLoading) return false;
  
  try {
    isLoading = true;
    document.getElementById('ffmpeg-loading').style.display = 'block';
    
    console.log('加载FFmpeg...');
    ffmpeg = new FFmpeg();
    await ffmpeg.load();
    
    console.log('FFmpeg加载完成');
    isLoaded = true;
    isLoading = false;
    appState.ffmpegLoaded = true;
    
    document.getElementById('ffmpeg-loading').style.display = 'none';
    return true;
  } catch (error) {
    console.error('FFmpeg加载失败:', error);
    document.getElementById('ffmpeg-loading').style.display = 'none';
    document.getElementById('error-message').textContent = '加载处理引擎失败，请刷新页面重试。';
    document.getElementById('error-container').style.display = 'block';
    
    isLoading = false;
    return false;
  }
}

// 识别MKV文件中的字幕轨道和附件
export async function identifySubtitleTracks(file) {
  if (!isLoaded) {
    const loaded = await initFFmpeg();
    if (!loaded) return { tracks: [], attachments: [] };
  }
  
  try {
    // 仅读取文件头部进行分析
    const headerBuffer = await readFileChunk(file, 0, Math.min(10 * 1024 * 1024, file.size));
    
    // 写入FFmpeg
    await ffmpeg.writeFile('input.mkv', await fetchFile(headerBuffer));
    
    // 使用FFmpeg分析文件并捕获输出
    await ffmpeg.exec(['-i', 'input.mkv']);
    
    // 获取命令输出日志
    const logData = await ffmpeg.readStderr();
    
    // 解析字幕轨道和附件
    const tracks = parseSubtitleTracksFromOutput(logData);
    const attachments = parseAttachmentsFromOutput(logData);
    
    // 清理文件
    await ffmpeg.deleteFile('input.mkv');
    
    return { tracks, attachments };
  } catch (error) {
    console.error('识别字幕轨道失败:', error);
    return [];
  }
}

// 提取字幕
export async function extractSubtitle(file, trackIndex, format = 'srt') {
  if (!isLoaded) {
    const loaded = await initFFmpeg();
    if (!loaded) return null;
  }
  
  try {
    // 为大文件创建Web Worker
    if (file.size > 100 * 1024 * 1024) { // 大于100MB
      return extractWithWorker(file, trackIndex, format);
    }
    
    // 读取整个文件
    const buffer = await file.arrayBuffer();
    
    // 写入FFmpeg
    await ffmpeg.writeFile('input.mkv', await fetchFile(buffer));
    
    // 提取字幕
    const outputName = `output.${format}`;
    await ffmpeg.exec([
      '-i', 'input.mkv',
      '-map', `0:s:${trackIndex}`,
      '-c:s', format === 'ass' ? 'ass' : 'srt',
      outputName
    ]);
    
    // 读取输出字幕
    const data = await ffmpeg.readFile(outputName);
    
    // 清理文件
    await ffmpeg.deleteFile('input.mkv');
    await ffmpeg.deleteFile(outputName);
    
    // 转换为文本
    return new TextDecoder().decode(data);
  } catch (error) {
    console.error('提取字幕失败:', error);
    return null;
  }
}

// 使用Worker处理大文件
async function extractWithWorker(file, trackIndex, format) {
  return new Promise((resolve) => {
    const worker = new Worker('workers/ffmpeg-worker.js');
    
    worker.onmessage = (e) => {
      if (e.data.type === 'complete') {
        resolve(e.data.subtitle);
      } else if (e.data.type === 'progress') {
        updateProgressBar(e.data.progress);
      }
    };
    
    worker.postMessage({
      type: 'extract',
      file,
      trackIndex,
      format
    });
  });
}

// 辅助函数：读取文件的特定部分
async function readFileChunk(file, start, end) {
  const slice = file.slice(start, end);
  return await slice.arrayBuffer();
}

// 辅助函数：从FFmpeg输出解析字幕轨道信息
function parseSubtitleTracksFromOutput(output) {
  const tracks = [];
  const lines = output.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 使用正则表达式匹配字幕轨道信息
    const match = line.match(/Stream #\d+:(\d+)(?:\(([^)]+)\))?: Subtitle: ([^,]+)(.*)/);
    if (match) {
      const trackNumber = parseInt(match[1], 10);
      const language = match[2] || '未知';
      const format = match[3];
      
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
function parseAttachmentsFromOutput(output) {
  const attachments = [];
  const lines = output.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 匹配附件信息行
    // 例如: "Attachment: filename.srt, mimetype: application/x-subrip"
    const match = line.match(/\s*Attachment:\s+([^,]+),\s+mimetype:\s+([^,\s]+)/i);
    if (match) {
      const filename = match[1].trim();
      const mimetype = match[2].trim();
      const ext = filename.split('.').pop().toLowerCase();
      
      // 检查是否是字幕或字体文件
      const isSubtitle = ext === 'srt' || ext === 'ass' || ext === 'ssa' || ext === 'vtt';
      const isFont = ext === 'ttf' || ext === 'otf';
      
      if (isSubtitle || isFont || SUBTITLE_MIME_TYPES.includes(mimetype)) {
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

// 从附件中提取字幕或字体
export async function extractAttachment(file, filename) {
  if (!isLoaded) {
    const loaded = await initFFmpeg();
    if (!loaded) return null;
  }
  
  try {
    // 读取整个文件
    const buffer = await file.arrayBuffer();
    
    // 写入FFmpeg
    await ffmpeg.writeFile('input.mkv', await fetchFile(buffer));
    
    // 提取附件
    await ffmpeg.exec([
      '-dump_attachment:t',
      filename,
      '-i', 'input.mkv',
      '-y', filename
    ]);
    
    // 读取提取的附件
    const data = await ffmpeg.readFile(filename);
    
    // 清理文件
    await ffmpeg.deleteFile('input.mkv');
    await ffmpeg.deleteFile(filename);
    
    // 对于文本类型的附件，转换为文本
    const ext = filename.split('.').pop().toLowerCase();
    if (ext === 'srt' || ext === 'ass' || ext === 'ssa' || ext === 'vtt') {
      return new TextDecoder().decode(data);
    }
    
    // 对于二进制文件，直接返回数据
    return data;
  } catch (error) {
    console.error('提取附件失败:', error);
    return null;
  }
}

// 更新进度条
function updateProgressBar(progress) {
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');
  
  if (progressBar && progressText) {
    progressBar.value = progress;
    progressText.textContent = `${Math.round(progress)}%`;
  }
}

// 导出ffmpeg相关函数
export { ffmpeg };