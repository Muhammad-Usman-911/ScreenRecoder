// preload.js updates
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    getSources: () => ipcRenderer.invoke('get-sources'),
    showScreenPopup: (data) => ipcRenderer.invoke('show-screen-popup', data),
    saveRecording: (uint8Array) => ipcRenderer.invoke('save-recording', uint8Array),
    onSourceSelected: (callback) => ipcRenderer.on('source-selected', callback),
    onRecordingSaved: (callback) => ipcRenderer.on('recording-saved', callback),
    exitWindow: () => ipcRenderer.invoke('exit-window'), // Use ipcRenderer.invoke instead
});