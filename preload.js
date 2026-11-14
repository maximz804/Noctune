const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('noctuneDesktop', { setMini: (v) => ipcRenderer.send('noctune:mini', !!v), onMini: (fn) => ipcRenderer.on('noctune:mini-state', (_e, v) => fn(v)) });
