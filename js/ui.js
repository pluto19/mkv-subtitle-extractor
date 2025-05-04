// js/ui.js
import { appState } from './app.js';
import { extractSubtitle } from './ffmpeg-core.js';
import { parseSubtitle, renderSubtitlePreview } from './subtitle-parser.js';

// 设置UI事件处理
export function setupUI() {
  // 预览按钮
  document.getElementById('preview-button').addEventListener('click', handlePreviewClick);
  
  // 提取下载按钮
  document.getElementById('extract-button').addEventListener('click', handleExtractClick);
}

// 更新字幕轨道列表
export function updateSubtitleTrackList(tracks) {
  const trackList = document.getElementById('subtitle-track-list');
  trackList.innerHTML = '';
  
  tracks.forEach((track, index) => {
    const trackItem = document.createElement('div');
    trackItem.classList.add('track-item');
    
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'subtitle-track';
    radio.id = `track-${index}`;
    radio.value = index;
    
    if (index === 0) {
      radio.checked = true;
      appState.selectedTrack = track;
    }
    
    radio.addEventListener('change', () => {
      appState.selectedTrack = track;
      
      // 清空预览
      document.getElementById('subtitle-preview').innerHTML = '';
      document.getElementById('subtitle-preview-container').style.display = 'none';
    });
    
    const label = document.createElement('label');
    label.htmlFor = `track-${index}`;
    label.textContent = `轨道 ${track.index + 1}: ${track.language} (${track.format})`;
    
    trackItem.appendChild(radio);
    trackItem.appendChild(label);
    trackList.appendChild(trackItem);
  });
  
  // 默认选择第一个轨道
  if (tracks.length > 0) {
    appState.selectedTrack = tracks[0];
  }
}

// 处理预览按钮点击
async function handlePreviewClick() {
  if (!appState.currentFile || !appState.selectedTrack) {
    return;
  }
  
  // 显示加载指示器
  document.getElementById('loading-indicator').style.display = 'block';
  document.getElementById('subtitle-preview-container').style.display = 'none';
  
  try {
    // 提取字幕内容
    const format = appState.selectedTrack.format.toLowerCase();
    const preferredFormat = (format === 'ass' || format === 'ssa') ? 'ass' : 'srt';
    
    const subtitleContent = await extractSubtitle(
      appState.currentFile,
      appState.selectedTrack.index,
      preferredFormat
    );
    
    if (!subtitleContent) {
      throw new Error('无法提取字幕内容');
    }
    
    // 解析字幕
    const parsedSubtitle = parseSubtitle(subtitleContent, preferredFormat);
    
    // 显示预览
    renderSubtitlePreview(parsedSubtitle);
    
    // 显示预览容器
    document.getElementById('subtitle-preview-container').style.display = 'block';
  } catch (error) {
    console.error('预览字幕出错:', error);
    showError('预览字幕时出错，请重试');
  } finally {
    // 隐藏加载指示器
    document.getElementById('loading-indicator').style.display = 'none';
  }
}

// 处理提取并下载按钮点击
async function handleExtractClick() {
  if (!appState.currentFile || !appState.selectedTrack) {
    return;
  }
  
  // 显示加载指示器
  document.getElementById('loading-indicator').style.display = 'block';
  
  try {
    // 提取字幕内容
    const format = appState.selectedTrack.format.toLowerCase();
    const preferredFormat = (format === 'ass' || format === 'ssa') ? 'ass' : 'srt';
    
    const subtitleContent = await extractSubtitle(
      appState.currentFile,
      appState.selectedTrack.index,
      preferredFormat
    );
    
    if (!subtitleContent) {
      throw new Error('无法提取字幕内容');
    }
    
    // 创建下载链接
    const fileName = appState.currentFile.name.replace('.mkv', '') + 
                     `_${appState.selectedTrack.language}.${preferredFormat}`;
    
    const blob = new Blob([subtitleContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    
    // 释放URL对象
    setTimeout(() => URL.revokeObjectURL(url), 100);
  } catch (error) {
    console.error('提取字幕出错:', error);
    showError('提取字幕时出错，请重试');
  } finally {
    // 隐藏加载指示器
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