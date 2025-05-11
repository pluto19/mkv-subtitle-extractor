// js/file-handler.js - Stub
// This file is now a stub that redirects to local-file-handler.js

import { initLocalFileHandler, handleLocalFile } from './local-file-handler.js';

// Re-export functions from local-file-handler.js
export function initFileHandler() {
  console.log('Using local file handler instead of WebAssembly-based handler');
  return initLocalFileHandler();
}

export function handleFile(file) {
  console.log('Using local file handler instead of WebAssembly-based handler');
  return handleLocalFile(file);
}