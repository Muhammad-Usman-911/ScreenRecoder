const { app, BrowserWindow, desktopCapturer, ipcMain, Menu, dialog } = require('electron');
const path = require('node:path');
const { writeFile } = require('fs/promises');

// Add logging function for main process
function log(type, message, error = null) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${type}: ${message}`);
  if (error) console.error(error);
}

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
    },
    fullscreen:true,
    frame:false,
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  //mainWindow.webContents.openDevTools();
  
  log('INFO', 'Main window created');
};

// Register the IPC handler to fetch screen sources
ipcMain.handle('get-sources', async () => {
  try {
    log('INFO', 'Fetching screen sources');
    const sources = await desktopCapturer.getSources({ 
      types: ['window', 'screen'],
      thumbnailSize: { width: 0, height: 0 } // Optimize performance
    });
    return sources.map(source => ({
      id: source.id,
      name: source.name,
    }));
  } catch (error) {
    log('ERROR', 'Failed to get sources', error);
    throw error;
  }
});

ipcMain.handle('exit-window', (event, args) => {
  app.quit();
})

// Handle screen selection
ipcMain.handle('show-screen-popup', async (event, data) => {
  try {
    log('INFO', 'Showing screen selection popup');
    const menuItems = data.map(source => ({
      label: source.name,
      click: () => {
        event.sender.send('source-selected', {
          id: source.id,
          name: source.name
        });
        log('INFO', `Screen selected: ${source.name}`);
      }
    }));

    const contextMenu = Menu.buildFromTemplate(menuItems);
    contextMenu.popup();
  } catch (error) {
    log('ERROR', 'Failed to show screen popup', error);
    throw error;
  }
});

// Handle saving the recording
ipcMain.handle('save-recording', async (event, buffer) => {
  try {
    log('INFO', 'Initiating save recording dialog');
    const { filePath, canceled } = await dialog.showSaveDialog({
      buttonLabel: 'Save Recording',
      defaultPath: `recording-${Date.now()}.webm`,
      filters: [{ name: 'Videos', extensions: ['webm'] }]
    });

    if (canceled || !filePath) {
      log('INFO', 'Save dialog canceled');
      return null;
    }

    // Convert Array to Buffer before writing
    const uint8Array = new Uint8Array(buffer);
    await writeFile(filePath, uint8Array);
    log('INFO', `Recording saved successfully to: ${filePath}`);
    
    return filePath;
  } catch (error) {
    log('ERROR', 'Failed to save recording', error);
    throw error;
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}).catch(error => {
  log('ERROR', 'Failed to initialize app', error);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle global errors
process.on('uncaughtException', (error) => {
  log('ERROR', 'Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
  log('ERROR', 'Unhandled Rejection:', error);
});