// js/app.js
import { setupUI } from './ui.js';
import { initFileHandler } from './file-handler.js';
import { initFFmpeg } from './ffmpeg-core.js';

// 应用初始化
async function initApp() {
  console.log('初始化应用...');
  
  // 设置UI事件监听器
  setupUI();
  
  // 初始化文件处理模块
  initFileHandler();
  
  // 预加载界面就绪
  document.getElementById('app-loading').style.display = 'none';
  document.getElementById('file-select-container').style.display = 'block';
  
  console.log('应用初始化完成，等待用户选择文件...');
}

// 启动应用
document.addEventListener('DOMContentLoaded', initApp);

// 导出应用状态与功能
export const appState = {
  currentFile: null,
  subtitleTracks: [],
  selectedTrack: null,
  ffmpegLoaded: false
};