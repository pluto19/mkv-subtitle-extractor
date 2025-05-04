// js/file-handler.js
import { appState } from './app.js';
import { identifySubtitleTracks } from './ffmpeg-core.js';
import { updateSubtitleTrackList } from './ui.js';

// 初始化文件处理
export function initFileHandler() {
  const fileInput = document.getElementById('file-input');
  const dropZone = document.getElementById('drop-zone');
  
  // 文件选择事件
  fileInput.addEventListener('change', handleFileSelect);
  
  // 文件拖放事件
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });
  
  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });
  
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    
    if (e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  });
  
  // 点击区域触发文件选择
  dropZone.addEventListener('click', () => {
    fileInput.click();
  });
}

// 处理文件选择事件
function handleFileSelect(e) {
  if (e.target.files.length > 0) {
    handleFile(e.target.files[0]);
  }
}

// 处理选择的文件
export async function handleFile(file) {
  // 检查文件类型
  if (!file.name.toLowerCase().endsWith('.mkv')) {
    showError('请选择MKV格式的文件');
    return;
  }
  
  appState.currentFile = file;
  
  // 显示文件信息
  document.getElementById('file-info').textContent = `文件: ${file.name} (${formatFileSize(file.size)})`;
  document.getElementById('file-info-container').style.display = 'block';
  
  // 显示加载指示器
  document.getElementById('loading-indicator').style.display = 'block';
  
  // 识别字幕轨道和附件
  try {
    const { tracks, attachments } = await identifySubtitleTracks(file);
    appState.subtitleTracks = tracks;
    appState.subtitleAttachments = attachments;
    
    // 合并轨道和附件列表
    const allSubtitleItems = [...tracks, ...attachments];
    
    // 更新UI
    updateSubtitleTrackList(allSubtitleItems);
    
    // 隐藏加载指示器
    document.getElementById('loading-indicator').style.display = 'none';
    
    // 显示字幕轨道列表
    if (allSubtitleItems.length > 0) {
      document.getElementById('subtitle-tracks-container').style.display = 'block';
    } else {
      showError('未在文件中找到字幕轨道或附件');
    }
  } catch (error) {
    console.error('处理文件出错:', error);
    showError('处理文件时出错，请重试');
    document.getElementById('loading-indicator').style.display = 'none';
  }
}

// 显示错误信息
function showError(message) {
  const errorElement = document.getElementById('error-message');
  errorElement.textContent = message;
  document.getElementById('error-container').style.display = 'block';
  
  // 3秒后自动隐藏
  setTimeout(() => {
    document.getElementById('error-container').style.display = 'none';
  }, 3000);
}

// 格式化文件大小
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}