// js/subtitle-parser.js
// 使用第三方库或自定义函数解析字幕内容

// 解析字幕内容
export function parseSubtitle(content, format) {
  console.log(`开始解析字幕，格式: ${format}`);
  console.log(`字幕内容前50个字符: ${(content || '').substring(0, 50)}...`);
  
  // 防御性编程 - 确保content是字符串
  if (!content) {
    console.error('字幕内容为空');
    return { format: format || 'unknown', entries: [] };
  }
  
  if (typeof content !== 'string') {
    console.error('字幕内容不是字符串类型:', typeof content);
    content = String(content);
  }
  
  try {
    // 检测可能的字幕格式（如果提供的格式不正确）
    if (!format || (format !== 'srt' && format !== 'ass' && format !== 'ssa')) {
      // 尝试自动检测格式
      if (content.includes('[Script Info]') || content.includes('[V4+ Styles]')) {
        format = 'ass';
        console.log('自动检测到ASS格式');
      } else {
        format = 'srt';
        console.log('默认使用SRT格式');
      }
    }
    
    if (format === 'srt') {
      return parseSRT(content);
    } else if (format === 'ass' || format === 'ssa') {
      return parseASS(content);
    }
  } catch (error) {
    console.error('解析字幕出错:', error);
    // 返回空结果而不是抛出错误，避免UI崩溃
    return { format: format || 'unknown', entries: [], error: error.message };
  }
  
  console.warn(`不支持的字幕格式: ${format}，返回空结果`);
  return { format: format || 'unknown', entries: [] };
}

// 解析SRT格式
function parseSRT(content) {
  const entries = [];
  const blocks = content.trim().split(/\r?\n\r?\n/);
  
  for (const block of blocks) {
    const lines = block.split(/\r?\n/);
    if (lines.length < 3) continue;
    
    // 跳过字幕序号
    const timeLine = lines[1];
    const textLines = lines.slice(2);
    
    // 解析时间
    const timeMatch = timeLine.match(/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/);
    if (!timeMatch) continue;
    
    entries.push({
      startTime: timeMatch[1],
      endTime: timeMatch[2],
      text: textLines.join('\n')
    });
  }
  
  return { format: 'srt', entries };
}

// 解析ASS/SSA格式
function parseASS(content) {
  const entries = [];
  const lines = content.split(/\r?\n/);
  
  let inEvents = false;
  let formatLine = null;
  let textIndex = -1;
  let startIndex = -1;
  let endIndex = -1;
  
  for (const line of lines) {
    // 查找事件部分
    if (line.trim() === '[Events]') {
      inEvents = true;
      continue;
    }
    
    if (inEvents) {
      // 查找格式行
      if (line.startsWith('Format:')) {
        formatLine = line.substring(7).split(',').map(s => s.trim());
        textIndex = formatLine.indexOf('Text');
        startIndex = formatLine.indexOf('Start');
        endIndex = formatLine.indexOf('End');
        continue;
      }
      
      // 处理对话行
      if (formatLine && line.startsWith('Dialogue:')) {
        const parts = splitAssDialogue(line.substring(9));
        
        if (parts.length > Math.max(textIndex, startIndex, endIndex)) {
          entries.push({
            startTime: parts[startIndex],
            endTime: parts[endIndex],
            text: cleanAssText(parts[textIndex])
          });
        }
      }
    }
  }
  
  return { format: 'ass', entries };
}

// 分割ASS对话行
function splitAssDialogue(line) {
  const parts = [];
  let inQuotes = false;
  let current = '';
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === ',' && !inQuotes) {
      parts.push(current.trim());
      current = '';
    } else {
      if (char === '"') inQuotes = !inQuotes;
      current += char;
    }
  }
  
  if (current) parts.push(current.trim());
  return parts;
}

// 清理ASS文本
function cleanAssText(text) {
  // 移除ASS样式代码
  return text.replace(/{[^}]*}/g, '');
}

// 渲染字幕预览
export function renderSubtitlePreview(parsedSubtitle) {
  const previewContainer = document.getElementById('subtitle-preview');
  
  // 清空预览容器
  previewContainer.innerHTML = '';
  
  // 处理解析错误或空字幕
  if (!parsedSubtitle || !parsedSubtitle.entries || parsedSubtitle.entries.length === 0) {
    const errorElement = document.createElement('div');
    errorElement.classList.add('subtitle-error');
    
    if (parsedSubtitle && parsedSubtitle.error) {
      errorElement.textContent = `解析字幕时出错: ${parsedSubtitle.error}`;
    } else {
      errorElement.textContent = '未找到有效的字幕内容';
    }
    
    previewContainer.appendChild(errorElement);
    return;
  }
  
  console.log(`渲染字幕预览，共 ${parsedSubtitle.entries.length} 条字幕`);
  
  // 限制显示前100条字幕
  const entriesToShow = parsedSubtitle.entries.slice(0, 100);
  
  // 渲染字幕条目
  entriesToShow.forEach((entry, index) => {
    try {
      const entryElement = document.createElement('div');
      entryElement.classList.add('subtitle-entry');
      
      // 时间显示
      const timeElement = document.createElement('div');
      timeElement.classList.add('time-code');
      timeElement.textContent = `${entry.startTime || '00:00:00'} --> ${entry.endTime || '00:00:00'}`;
      
      // 文本显示
      const textElement = document.createElement('div');
      textElement.classList.add('subtitle-text');
      textElement.textContent = entry.text || '[空白字幕]';
      
      // 添加到预览容器
      entryElement.appendChild(timeElement);
      entryElement.appendChild(textElement);
      previewContainer.appendChild(entryElement);
    } catch (error) {
      console.error(`渲染第 ${index + 1} 条字幕时出错:`, error, entry);
    }
  });
  
  // 如果有更多字幕，显示提示
  if (parsedSubtitle.entries.length > 100) {
    const moreElement = document.createElement('div');
    moreElement.classList.add('more-subtitles');
    moreElement.textContent = `仅显示前100条字幕，共${parsedSubtitle.entries.length}条`;
    previewContainer.appendChild(moreElement);
  }
}