'use strict';

// Minimal preload script with contextIsolation: true.
// The dashboard is a standard web app — no Node.js APIs exposed to the renderer.
// Add contextBridge.exposeInMainWorld(...) here if native Electron APIs are needed.

const { contextBridge } = require('electron');

// Expose Electron version info for debugging (optional)
contextBridge.exposeInMainWorld('electronInfo', {
  versions: {
    electron: process.versions.electron,
    node: process.versions.node,
    chrome: process.versions.chrome,
  },
});
