const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let didRetryLoad = false;
let didForceReload = false;
const indexPath = path.join(__dirname, 'dist/erp-fe/browser/index.html');
const configFileName = 'workspace-config.json';

const getConfigPath = () => path.join(app.getPath('userData'), configFileName);

const readConfig = async () => {
  try {
    const raw = await fs.promises.readFile(getConfigPath(), 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const writeConfig = async (config) => {
  const payload = JSON.stringify(config || {}, null, 2);
  await fs.promises.writeFile(getConfigPath(), payload, 'utf8');
  return config;
};

const clearConfig = async () => {
  try {
    await fs.promises.unlink(getConfigPath());
  } catch {}
  return null;
};

const registerConfigIpc = () => {
  ipcMain.handle('workspace-config:get', async () => readConfig());
  ipcMain.handle('workspace-config:set', async (_event, config) => writeConfig(config));
  ipcMain.handle('workspace-config:clear', async () => clearConfig());
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  const loadApp = () => {
    const { session } = mainWindow.webContents;
    Promise.all([
      session.clearCache(),
      session.clearStorageData({
        storages: ['serviceworkers', 'cachestorage'],
        quotas: [],
      }),
    ]).finally(() => {
      mainWindow.loadFile(indexPath);
    });
  };

  mainWindow.webContents.once('did-finish-load', () => {
    mainWindow.show();

    // If Angular failed to bootstrap on first load, reload once automatically.
    setTimeout(async () => {
      if (didForceReload || mainWindow.isDestroyed()) return;
      try {
        const hasAppRootContent = await mainWindow.webContents.executeJavaScript(
          "(() => { const appRoot = document.querySelector('app-root'); return !!(appRoot && appRoot.children.length); })()",
          true
        );
        const windowTitle = mainWindow.getTitle();
        if (!hasAppRootContent || windowTitle === app.getName()) {
          didForceReload = true;
          mainWindow.webContents.reloadIgnoringCache();
        }
      } catch {
        // If we can't inspect the DOM, do nothing.
      }
    }, 1000);
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, _errorDescription, _validatedURL, isMainFrame) => {
    if (!isMainFrame) return;
    if (didRetryLoad) return;
    if (errorCode === -3) return; // ERR_ABORTED (e.g. navigation interrupted)
    didRetryLoad = true;
    setTimeout(loadApp, 250);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  loadApp();
}

app.whenReady().then(() => {
  registerConfigIpc();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});


// mainWindow.webContents.openDevTools();
