const { app, BrowserWindow, shell, ipcMain, screen } = require('electron');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

let server;
let mainWindow;
let mini = false;
let normalBounds = null;
function setMini(value) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mini === value) return;
  mini = value;
  if (mini) {
    normalBounds = mainWindow.getBounds();
    const { workArea } = screen.getDisplayMatching(normalBounds).bounds ? screen.getDisplayMatching(normalBounds) : screen.getPrimaryDisplay();
    const width = 490, height = 395;
    mainWindow.setMinimumSize(350, 260);
    mainWindow.setAlwaysOnTop(true, 'floating');
    mainWindow.setBounds({ x: Math.round(workArea.x + (workArea.width-width)/2), y: workArea.y + 8, width, height });
  } else {
    mainWindow.setAlwaysOnTop(false);
    mainWindow.setMinimumSize(1000, 650);
    if (normalBounds) mainWindow.setBounds(normalBounds);
  }
  mainWindow.webContents.send('noctune:mini-state', mini);
}
ipcMain.on('noctune:mini', (_, value) => setMini(!!value));

function startLocalServer() {
  return new Promise((resolve, reject) => {
    server = http.createServer((req, res) => {
      const pathname = new URL(req.url, 'http://localhost').pathname;
      if (pathname !== '/' && pathname !== '/index.html') {
        res.writeHead(404); res.end('Not found'); return;
      }
      fs.readFile(path.join(__dirname,'index.html'), (err, data) => {
        if (err) { res.writeHead(500); res.end('Could not load app'); return; }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'X-Content-Type-Options': 'nosniff' });
        res.end(data);
      });
    });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}/`));
  });
}

app.whenReady().then(async () => {
  const url = await startLocalServer();
  mainWindow = new BrowserWindow({
    width: 1500, height: 900, minWidth: 1000, minHeight: 650,
    backgroundColor: '#090b14',
    icon: path.join(__dirname, 'assets', 'noctune.png'),
    title: 'NOCTUNE',
    autoHideMenuBar: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true, preload: path.join(__dirname, 'preload.js') }
  });
  mainWindow.webContents.setWindowOpenHandler(({ url: target }) => {
    if (/^https:\/\//.test(target)) shell.openExternal(target);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, target) => {
    if (target !== url) { event.preventDefault(); if (/^https:\/\//.test(target)) shell.openExternal(target); }
  });
  await mainWindow.loadURL(url);
  mainWindow.on('minimize', (event) => { event.preventDefault(); if (!mini) setMini(true); });
});
app.on('window-all-closed', () => { if (server) server.close(); if (process.platform !== 'darwin') app.quit(); });
