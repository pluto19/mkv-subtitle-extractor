// js/local-file-handler.js
import { appState } from './app.js';
import { updateSubtitleTrackList } from './ui.js';
import { parseSubtitle, renderSubtitlePreview } from './subtitle-parser.js';

// 服务器配置
const SERVER_URL = 'http://localhost:3000';

// 初始化本地文件处理
export function initLocalFileHandler() {
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
      handleLocalFile(e.dataTransfer.files[0]);
    }
  });
  
  // 点击区域触发文件选择
  dropZone.addEventListener('click', () => {
    fileInput.click();
  });
  
  // 所有按钮事件处理均由ui.js处理，避免重复绑定
  // document.getElementById('preview-button').addEventListener('click', previewSelectedSubtitle); // 移除此行，避免重复绑定
  // document.getElementById('extract-button').addEventListener('click', extractSelectedSubtitle); // 移除此行，避免重复绑定
}

// 处理文件选择事件
function handleFileSelect(e) {
  if (e.target.files.length > 0) {
    handleLocalFile(e.target.files[0]);
  }
}

// 处理本地文件
export async function handleLocalFile(file) {
  // 检查文件类型
  if (!file.name.toLowerCase().endsWith('.mkv')) {
    showError('请选择MKV格式的文件');
    return;
  }
  
  appState.currentFile = file;
  
  // 保存文件名到应用状态
  appState.filename = file.name;
  
  // 显示文件信息
  document.getElementById('file-info').textContent = `文件: ${file.name} (${formatFileSize(file.size)})`;
  document.getElementById('file-info-container').style.display = 'block';
  
  // 显示加载指示器
  document.getElementById('loading-indicator').style.display = 'block';
  
  // 解析MKV文件并识别字幕轨道和附件
  try {
    console.log('开始分析MKV文件结构...');
    console.log('文件名:', file.name);
    
    // 通过本地服务器解析MKV文件
    const response = await fetch(`${SERVER_URL}/api/analyze-mkv`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filename: file.name }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      
      // 处理"找不到文件"错误
      if (response.status === 404) {
        // 显示特殊错误提示，指导用户设置媒体目录
        showMediaDirectoryPrompt(errorData.mediaDirectories || []);
        throw new Error(errorData.message || '找不到文件，请设置正确的媒体目录');
      }
      
      throw new Error(`服务器错误: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('服务器返回数据:', data);
    
    if (!data.success) {
      throw new Error(data.error || '解析文件失败');
    }
    
    const { tracks, attachments } = data;
    
    appState.subtitleTracks = tracks || [];
    appState.subtitleAttachments = attachments || [];
    
    // 合并轨道和附件列表
    const allSubtitleItems = [...appState.subtitleTracks, ...appState.subtitleAttachments];
    
    console.log('解析完成，找到轨道:', appState.subtitleTracks.length, '附件:', appState.subtitleAttachments.length);
    
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
    showError(`处理文件时出错: ${error.message}`);
    document.getElementById('loading-indicator').style.display = 'none';
  }
}

// 显示媒体目录设置提示
async function showMediaDirectoryPrompt(currentDirectories) {
  // 显示目前配置的媒体目录
  let directoryList = '当前配置的媒体目录:\n';
  if (currentDirectories.length === 0) {
    directoryList += '- 没有配置目录\n';
  } else {
    currentDirectories.forEach((dir, index) => {
      directoryList += `- ${dir}\n`;
    });
  }
  
  // 提示用户输入文件所在目录
  const newDirectory = prompt(
    `找不到文件"${appState.filename}"。\n\n` +
    `${directoryList}\n` +
    `请输入文件所在的目录路径，例如"D:\\Videos"\n` +
    `此设置将保存在服务器上`,
    ''
  );
  
  if (!newDirectory) {
    return false;
  }
  
  try {
    // 保存新目录到服务器
    const response = await fetch(`${SERVER_URL}/api/save-media-directory`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ directory: newDirectory }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '保存目录失败');
    }
    
    const data = await response.json();
    if (data.success) {
      showSuccess(`已添加目录: ${newDirectory}`);
      console.log('更新后的媒体目录列表:', data.mediaDirectories);
      return true;
    }
  } catch (error) {
    console.error('保存媒体目录出错:', error);
    showError(`保存目录失败: ${error.message}`);
  }
  
  return false;
}

// 显示通知
function showNotification(message, type = 'info') {
  const notificationElement = document.createElement('div');
  notificationElement.classList.add('notification');
  notificationElement.classList.add(`notification-${type}`);
  notificationElement.textContent = message;
  
  document.body.appendChild(notificationElement);
  
  // 5秒后自动移除
  setTimeout(() => {
    notificationElement.classList.add('notification-hide');
    setTimeout(() => {
      document.body.removeChild(notificationElement);
    }, 500);
  }, 5000);
}

// 预览选中的字幕
async function previewSelectedSubtitle() {
  const selectedItem = appState.selectedItem;
  
  if (!selectedItem) {
    showError('请先选择一个字幕轨道或附件');
    return;
  }
  
  if (!appState.filename) {
    showError('文件名未知');
    return;
  }
  
  // 显示加载指示器
  document.getElementById('loading-indicator').style.display = 'block';
  
  try {
    let subtitleContent;
    
    if (selectedItem.type === 'track') {
      // 从轨道提取字幕
      const response = await fetch(`${SERVER_URL}/api/extract-subtitle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: appState.filename,
          trackIndex: selectedItem.index,
          format: selectedItem.format || 'srt'
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
    } else if (selectedItem.type === 'attachment' && selectedItem.isSubtitle) {
      // 从附件提取字幕
      const response = await fetch(`${SERVER_URL}/api/extract-attachment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoFilename: appState.filename,
          attachmentFilename: selectedItem.filename
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
    } else {
      throw new Error('所选项目不是字幕');
    }
    
    // 隐藏加载指示器
    document.getElementById('loading-indicator').style.display = 'none';
    
    // 确定字幕格式
    const format = selectedItem.format || 
                  (selectedItem.filename && selectedItem.filename.split('.').pop().toLowerCase()) || 
                  'srt';
    
    // 解析字幕内容
    const parsedSubtitle = parseSubtitle(subtitleContent, format);
    
    // 渲染字幕预览
    renderSubtitlePreview(parsedSubtitle);
    
    // 显示字幕预览区域
    document.getElementById('subtitle-preview-container').style.display = 'block';
    
    // 滚动到预览区域
    document.getElementById('subtitle-preview-container').scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    console.error('预览字幕出错:', error);
    showError(`预览字幕时出错: ${error.message}`);
    document.getElementById('loading-indicator').style.display = 'none';
  }
}

// 提取并下载选中的字幕
async function extractSelectedSubtitle() {
  const selectedItem = appState.selectedItem;
  
  if (!selectedItem) {
    showError('请先选择一个字幕轨道或附件');
    return;
  }
  
  if (!appState.filename) {
    showError('文件名未知');
    return;
  }
  
  // 显示加载指示器
  document.getElementById('loading-indicator').style.display = 'block';
  
  try {
    let endpoint, params, filename;
    
    if (selectedItem.type === 'track') {
      // 从轨道提取字幕
      endpoint = '/api/extract-subtitle';
      params = {
        filename: appState.filename,
        trackIndex: selectedItem.index,
        format: selectedItem.format || 'srt'
      };
      filename = `subtitle_track${selectedItem.index}_${selectedItem.language}.${selectedItem.format || 'srt'}`;
    } else if (selectedItem.type === 'attachment') {
      // 从附件提取
      endpoint = '/api/extract-attachment';
      params = {
        videoFilename: appState.filename,
        attachmentFilename: selectedItem.filename
      };
      filename = selectedItem.filename;
    } else {
      throw new Error('所选项目类型不支持');
    }
    
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
    
    // 隐藏加载指示器
    document.getElementById('loading-indicator').style.display = 'none';
    
    // 创建下载链接
    if (data.outputPath) {
      // 提取文件名
      const outputFileName = data.outputPath.split(/[\/\\]/).pop();
      
      // 下载文件
      window.location.href = `${SERVER_URL}/api/download/${outputFileName}`;
      
      showSuccess(`字幕已提取，正在下载...`);
    } else {
      showError('提取成功但无法下载文件');
    }
  } catch (error) {
    console.error('提取字幕出错:', error);
    showError(`提取字幕时出错: ${error.message}`);
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

// 格式化文件大小
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}