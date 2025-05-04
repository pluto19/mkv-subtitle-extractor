// workers/ffmpeg-worker.js
importScripts('../node_modules/@ffmpeg/ffmpeg/dist/ffmpeg.min.js');
importScripts('../node_modules/@ffmpeg/util/dist/util.min.js');

let ffmpeg = null;

// 初始化FFmpeg
async function initFFmpeg() {
  if (ffmpeg) return true;
  
  try {
    ffmpeg = new FFmpeg.FFmpeg();
    
    // 设置进度回调
    ffmpeg.on('progress', ({ progress }) => {
      // 向主线程报告进度
      self.postMessage({
        type: 'progress',
        progress: progress * 100
      });
    });
    
    await ffmpeg.load();
    return true;
  } catch (error) {
    self.postMessage({ type: 'error', message: error.message });
    return false;
  }
}

// 处理消息
self.onmessage = async function(e) {
  const { type, file, trackIndex, format } = e.data;
  
  if (type === 'extract') {
    try {
      const initialized = await initFFmpeg();
      if (!initialized) return;
      
      // 读取文件
      const buffer = await file.arrayBuffer();
      
      // 写入FFmpeg
      await ffmpeg.writeFile('input.mkv', await FFmpegUtil.fetchFile(buffer));
      
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
      const decoder = new TextDecoder();
      const subtitleText = decoder.decode(data);
      
      // 发送结果
      self.postMessage({
        type: 'complete',
        subtitle: subtitleText
      });
    } catch (error) {
      self.postMessage({ 
        type: 'error', 
        message: error.message 
      });
    }
  }
};