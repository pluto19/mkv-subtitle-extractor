// js/ffmpeg-core.js - Placeholder
// This file used to contain WebAssembly FFmpeg integration code
// Now it's just a placeholder since we've moved to server-based FFmpeg processing

// Initialize FFmpeg (now just a placeholder function)
export async function initFFmpeg() {
  console.log('FFmpeg initialization is now handled by the server');
  return true;
}

// These functions are kept for compatibility, but now they're just stubs
// that log warnings if they're accidentally called
export async function extractSubtitle(file, trackIndex, format) {
  console.warn('extractSubtitle() is deprecated. Use server API instead.');
  throw new Error('This function is no longer available. The app now uses server-side FFmpeg.');
}

export async function extractAttachment(file, filename) {
  console.warn('extractAttachment() is deprecated. Use server API instead.');
  throw new Error('This function is no longer available. The app now uses server-side FFmpeg.');
}

export async function identifySubtitleTracks(file) {
  console.warn('identifySubtitleTracks() is deprecated. Use server API instead.');
  throw new Error('This function is no longer available. The app now uses server-side FFmpeg.');
}