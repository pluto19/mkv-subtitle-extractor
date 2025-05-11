// js/mkv-parser.js
// 使用服务器API替代WebAssembly FFmpeg

// 服务器配置
const SERVER_URL = 'http://localhost:3000';

// 解析MKV文件并提取字幕轨道和附件信息
export async function parseMkvFile(file) {
  console.log('开始解析MKV文件，使用服务器API方法...');
  
  try {
    // 使用本地文件处理API的情况下，不需要传输整个文件
    // 服务器API只需要文件名即可
    const filename = file.name;
    
    // 调用服务器API解析MKV文件
    const response = await fetch(`${SERVER_URL}/api/analyze-mkv`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filename }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `服务器错误: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || '解析文件失败');
    }
    
    console.log('FFmpeg解析完成，找到轨道:', data.tracks?.length || 0, '附件:', data.attachments?.length || 0);
    
    return {
      tracks: data.tracks || [],
      attachments: data.attachments || []
    };
  } catch (error) {
    console.error("解析MKV文件失败:", error);
    // 发生错误时返回空结果
    return { tracks: [], attachments: [] };
  }
}