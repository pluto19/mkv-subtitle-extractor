// js/ui.js
import { appState } from './app.js';
import { parseSubtitle, renderSubtitlePreview } from './subtitle-parser.js';

// 服务器配置
const SERVER_URL = 'http://localhost:3000';

// 设置UI事件处理
export function setupUI() {
  // 预览按钮
  document.getElementById('preview-button').addEventListener('click', handlePreviewClick);
  
  // 提取下载按钮
  document.getElementById('extract-button').addEventListener('click', handleExtractClick);
}

// 更新字幕轨道列表
export function updateSubtitleTrackList(items) {
  const trackList = document.getElementById('subtitle-track-list');
  trackList.innerHTML = '';
  
  items.forEach((item, index) => {
    const trackItem = document.createElement('div');
    trackItem.classList.add('track-item');
    
    // 根据项目类型添加不同的类
    if (item.type === 'attachment') {
      trackItem.classList.add('attachment-item');
    }
    
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'subtitle-track';
    radio.id = `track-${index}`;
    radio.value = index;
    
    if (index === 0) {
      radio.checked = true;
      appState.selectedItem = item;
    }
    
    radio.addEventListener('change', () => {
      appState.selectedItem = item;
      
      // 清空预览
      document.getElementById('subtitle-preview').innerHTML = '';
      document.getElementById('subtitle-preview-container').style.display = 'none';
    });
    
    const label = document.createElement('label');
    label.htmlFor = `track-${index}`;
    label.textContent = item.description;
    
    trackItem.appendChild(radio);
    trackItem.appendChild(label);
    trackList.appendChild(trackItem);
  });
  
  // 默认选择第一个项目
  if (items.length > 0) {
    appState.selectedItem = items[0];
  }
}

// 处理预览按钮点击
async function handlePreviewClick() {
  if (!appState.currentFile || !appState.selectedItem) {
    return;
  }
  
  // 显示加载指示器
  document.getElementById('loading-indicator').style.display = 'block';
  document.getElementById('subtitle-preview-container').style.display = 'none';
  
  try {
    let subtitleContent;
    let format;
    
    // 根据选中项类型执行不同的提取操作
    if (appState.selectedItem.type === 'track') {
      // 提取轨道字幕
      format = appState.selectedItem.format.toLowerCase();
      const preferredFormat = (format === 'ass' || format === 'ssa') ? 'ass' : 'srt';
      
      // 使用服务器API提取字幕
      const response = await fetch(`${SERVER_URL}/api/extract-subtitle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: appState.filename,
          trackIndex: appState.selectedItem.index,
          format: preferredFormat
        }),
      });
      
      if (!response.ok) {
        throw new Error(`服务器错误: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || '提取字幕失败');
      }
      
      subtitleContent = data.subtitle;
      
    } else if (appState.selectedItem.type === 'attachment') {
      // 提取附件字幕
      if (!appState.selectedItem.isSubtitle) {
        throw new Error('选中的附件不是字幕文件');
      }
      
      format = appState.selectedItem.filename.split('.').pop().toLowerCase();
      
      // 使用服务器API提取附件
      const response = await fetch(`${SERVER_URL}/api/extract-attachment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoFilename: appState.filename,
          attachmentFilename: appState.selectedItem.filename
        }),
      });
      
      if (!response.ok) {
        throw new Error(`服务器错误: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || '提取附件失败');
      }
      
      subtitleContent = data.content;
    }
    
    if (!subtitleContent) {
      throw new Error('无法提取字幕内容');
    }
    
    // 解析字幕
    const parsedSubtitle = parseSubtitle(subtitleContent, format);
    
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
  if (!appState.currentFile || !appState.selectedItem) {
    return;
  }
  
  // 显示加载指示器
  document.getElementById('loading-indicator').style.display = 'block';
  
  try {
    let content;
    let fileName;
    let mimeType = 'text/plain';
    
    // 使用服务器API提取字幕/附件
    let endpoint, params;
    
    if (appState.selectedItem.type === 'track') {
      // 从轨道提取字幕
      endpoint = '/api/extract-subtitle';
      const format = appState.selectedItem.format.toLowerCase();
      const preferredFormat = (format === 'ass' || format === 'ssa') ? 'ass' : 'srt';
      
      params = {
        filename: appState.filename,
        trackIndex: appState.selectedItem.index,
        format: preferredFormat
      };
      
      fileName = appState.filename.replace('.mkv', '') +
                `_${appState.selectedItem.language}.${preferredFormat}`;
                
    } else if (appState.selectedItem.type === 'attachment') {
      // 从附件提取
      endpoint = '/api/extract-attachment';
      params = {
        videoFilename: appState.filename,
        attachmentFilename: appState.selectedItem.filename
      };
      
      fileName = appState.selectedItem.filename;
      
      // 设置适当的MIME类型
      if (appState.selectedItem.isFont) {
        if (fileName.endsWith('.ttf')) {
          mimeType = 'font/ttf';
        } else if (fileName.endsWith('.otf')) {
          mimeType = 'font/otf';
        }
      }
    }
    
    // 发送请求
    const response = await fetch(`${SERVER_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    
    if (!response.ok) {
      throw new Error(`服务器错误: ${response.status}`);
    }
    
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || '提取失败');
    }
    
    // 直接下载文件
    if (data.outputPath) {
      // 提取文件名
      const outputFileName = data.outputPath.split(/[\/\\]/).pop();
      
      // 下载文件
      window.location.href = `${SERVER_URL}/api/download/${outputFileName}`;
      
      showSuccess(`字幕已提取，正在下载...`);
      return;
    }
    
    // 如果没有outputPath但有content，使用content
    content = data.content || data.subtitle;
    
    if (!content) {
      throw new Error('无法提取内容');
    }
    
    // 如果服务器没有直接提供下载但返回了内容，创建下载链接
    if (content) {
      let blob;
      if (typeof content === 'string') {
        blob = new Blob([content], { type: mimeType });
      } else {
        // 二进制数据
        blob = new Blob([content], { type: appState.selectedItem.mimetype || mimeType });
      }
      
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      
      // 释放URL对象
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } else {
      showError('提取成功但无法下载文件');
    }
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

// 显示成功信息
function showSuccess(message) {
  // 复用错误容器显示成功信息
  const errorElement = document.getElementById('error-message');
  errorElement.textContent = message;
  errorElement.style.color = '#4caf50';
  document.getElementById('error-container').style.display = 'block';
  
  // 3秒后自动隐藏
  setTimeout(() => {
    document.getElementById('error-container').style.display = 'none';
    errorElement.style.color = ''; // 恢复默认颜色
  }, 3000);
}