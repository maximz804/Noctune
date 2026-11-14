const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('noctuneDesktop', {
  setMini: value => ipcRenderer.send('noctune:mini', !!value),
  setMiniHover: value => ipcRenderer.send('noctune:mini-hover', !!value),
  onMini: callback => ipcRenderer.on('noctune:mini-state', (_event, value) => callback(value))
});
