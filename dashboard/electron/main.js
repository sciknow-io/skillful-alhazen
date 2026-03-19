'use strict';

const { app, BrowserWindow, shell } = require('electron');
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

let nextProcess = null;
let mainWindow = null;

const PORT = 3000;
const DEV_PORT = process.env.NEXT_DEV_PORT || PORT;
const IS_DEV = process.env.NODE_ENV === 'development' || process.env.ELECTRON_IS_DEV === '1';

/**
 * Poll until the server responds on the given URL.
 * Retries up to maxRetries times with 500ms delay between attempts.
 */
function waitForServer(url, maxRetries = 60) {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    function check() {
      http.get(url, (res) => {
        if (res.statusCode < 500) {
          resolve();
        } else {
          retry();
        }
      }).on('error', () => {
        retry();
      });
    }

    function retry() {
      attempts++;
      if (attempts >= maxRetries) {
        reject(new Error(`Server at ${url} not ready after ${maxRetries} attempts`));
        return;
      }
      setTimeout(check, 500);
    }

    check();
  });
}

/**
 * Start the Next.js standalone server as a child process.
 * Only called in production mode (when .next/standalone/server.js exists).
 */
async function startNextServer() {
  const serverScript = path.join(__dirname, '..', '.next', 'standalone', 'server.js');

  return new Promise((resolve, reject) => {
    nextProcess = spawn('node', [serverScript], {
      env: {
        ...process.env,
        PORT: String(PORT),
        HOSTNAME: '127.0.0.1',
        NODE_ENV: 'production',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    nextProcess.stdout.on('data', (data) => {
      const msg = data.toString();
      if (process.env.ELECTRON_DEBUG) {
        process.stdout.write('[next] ' + msg);
      }
    });

    nextProcess.stderr.on('data', (data) => {
      process.stderr.write('[next] ' + data.toString());
    });

    nextProcess.on('error', reject);

    // Give it a moment to start before polling
    setTimeout(() => {
      waitForServer(`http://127.0.0.1:${PORT}`)
        .then(resolve)
        .catch(reject);
    }, 500);
  });
}

function createWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'Skillful-Alhazen',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.loadURL(url);

  // Open external links in the system browser, not Electron
  mainWindow.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    if (targetUrl.startsWith('http://127.0.0.1') || targetUrl.startsWith('http://localhost')) {
      return { action: 'allow' };
    }
    shell.openExternal(targetUrl);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  if (IS_DEV) {
    // In dev mode, connect to an already-running Next.js dev server
    const devUrl = `http://localhost:${DEV_PORT}`;
    console.log(`[electron] Dev mode: connecting to ${devUrl}`);
    try {
      await waitForServer(devUrl, 5);
    } catch {
      console.warn('[electron] Dev server not detected — loading anyway');
    }
    createWindow(devUrl);
  } else {
    // In production mode, start the Next.js standalone server
    console.log('[electron] Starting Next.js server...');
    try {
      await startNextServer();
      console.log(`[electron] Server ready on port ${PORT}`);
    } catch (err) {
      console.error('[electron] Failed to start Next.js server:', err);
      app.quit();
      return;
    }
    createWindow(`http://127.0.0.1:${PORT}`);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    const url = IS_DEV
      ? `http://localhost:${DEV_PORT}`
      : `http://127.0.0.1:${PORT}`;
    createWindow(url);
  }
});

app.on('will-quit', () => {
  if (nextProcess) {
    nextProcess.kill('SIGTERM');
    nextProcess = null;
  }
});
