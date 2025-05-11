// workers/ffmpeg-worker.js - Placeholder
// This worker is no longer used since we've moved to server-based FFmpeg processing

// Respond with an error if this worker is somehow initialized
self.onmessage = function(e) {
  self.postMessage({ 
    type: 'error', 
    message: 'FFmpeg Worker is deprecated. The app now uses server-side FFmpeg processing.'
  });
};

console.log('FFmpeg Worker is no longer used. The app now uses server-side FFmpeg processing.');