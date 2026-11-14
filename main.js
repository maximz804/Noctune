
const { app, BrowserWindow, shell, ipcMain, screen } = require('electron');
const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');

let server;
let mainWindow;
let mini = false;
let expanded = false;
let normalBounds = null;

const INSTANCES = [
 'https://yt.chocolatemoo53.com',
 'https://invidious.tiekoetter.com',
 'https://inv.nadeko.net',
 'https://invidious.nerdvpn.de'
];

function searchInstance(base, query) {
  return new Promise((resolve, reject) => {
    const target = `${base}/api/v1/search?q=${encodeURIComponent(query)}&type=video&sort_by=relevance`;

    const req = https.get(
      target,
      {
        headers: {
          'User-Agent': 'NOCTUNE/0.4',
          Accept: 'application/json'
        },
        timeout: 6500
      },
      response => {
        if (response.statusCode !== 200) {
          response.resume();
          reject(new Error('HTTP ' + response.statusCode));
          return;
        }

        let data = '';

        response.on('data', chunk => {
          data += chunk;

          if (data.length > 1500000) {
            response.destroy();
          }
        });

        response.on('end', () => {
          try {
            const json = JSON.parse(data);

            if (!Array.isArray(json)) {
              throw new Error('Unexpected response');
            }

            resolve(json);
          } catch (error) {
            reject(error);
          }
        });

        response.on('error', reject);
      }
    );

    req.on('timeout', () => {
      req.destroy(new Error('Timeout'));
    });

    req.on('error', reject);
  });
}

async function publicSearch(query) {
  for (const instance of INSTANCES) {
    try {
      const items = await searchInstance(instance, query);

      return items
        .filter(item =>
          item.type === 'video' &&
          /^[\w-]{11}$/.test(item.videoId)
        )
        .slice(0, 25)
        .map(item => ({
          id: item.videoId,
          title: String(item.title || 'Untitled'),
          artist: String(item.author || 'YouTube'),
          thumbnail: `https://i.ytimg.com/vi/${item.videoId}/mqdefault.jpg`
        }));
    } catch (error) {
      console.warn(
        'Search provider unavailable:',
        instance,
        error.message
      );
    }
  }

  throw new Error(
    'Public search services are currently unavailable. Try again later or paste a YouTube link.'
  );
}

function resizeMini() {
  if (!mini || !mainWindow || mainWindow.isDestroyed()) return;

  const { workArea } = screen.getDisplayMatching(
    mainWindow.getBounds()
  );

  const width = 490;
  const height = expanded ? 410 : 315;

  mainWindow.setBounds({
    x: Math.round(workArea.x + (workArea.width - width) / 2),
    y: workArea.y + 10,
    width,
    height
  });
}

function setMini(value) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mini === value) return;

  mini = value;

  if (mini) {
    normalBounds = mainWindow.getBounds();
    expanded = false;

    mainWindow.setMinimumSize(460, 300);
    mainWindow.setAlwaysOnTop(true, 'floating');

    resizeMini();
  } else {
    mainWindow.setAlwaysOnTop(false);
    mainWindow.setMinimumSize(460, 300);

    if (normalBounds) {
      mainWindow.setBounds(normalBounds);
    }

    mainWindow.setMinimumSize(1000, 650);
  }

  mainWindow.webContents.send('noctune:mini-state', mini);
}

ipcMain.on('noctune:mini', (_event, value) => {
  setMini(!!value);
});

ipcMain.on('noctune:mini-hover', (_event, value) => {
  if (mini && expanded !== !!value) {
    expanded = !!value;
    resizeMini();
  }
});

function startLocalServer() {
  return new Promise((resolve, reject) => {
    server = http.createServer(async (req, res) => {
      let url;

      try {
        url = new URL(req.url, 'http://localhost');
      } catch {
        res.writeHead(400);
        res.end();
        return;
      }

      if (url.pathname === '/api/search') {
        const query = (
          url.searchParams.get('q') || ''
        ).trim().slice(0, 120);

        if (!query) {
          res.writeHead(400, {
            'Content-Type': 'application/json'
          });

          res.end(JSON.stringify({
            error: 'Enter a search term'
          }));

          return;
        }

        try {
          const tracks = await publicSearch(query);

          res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store'
          });

          res.end(JSON.stringify({ tracks }));
        } catch (error) {
          res.writeHead(503, {
            'Content-Type': 'application/json; charset=utf-8'
          });

          res.end(JSON.stringify({
            error: error.message
          }));
        }

        return;
      }

      if (
        url.pathname !== '/' &&
        url.pathname !== '/index.html'
      ) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      fs.readFile(
        path.join(__dirname, 'index.html'),
        (error, data) => {
          if (error) {
            res.writeHead(500);
            res.end('Could not load app');
            return;
          }

          res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8',
            'X-Content-Type-Options': 'nosniff'
          });

          res.end(data);
        }
      );
    });

    server.on('error', reject);

    server.listen(0, '127.0.0.1', () => {
      resolve(
        `http://127.0.0.1:${server.address().port}/`
      );
    });
  });
}

app.whenReady().then(async () => {
  const url = await startLocalServer();

  mainWindow = new BrowserWindow({
    width: 1500,
    height: 900,
    minWidth: 1000,
    minHeight: 650,
    backgroundColor: '#090b14',
    icon: path.join(__dirname, 'noctune.png'),
    title: 'NOCTUNE',
    autoHideMenuBar: true,

    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.webContents.setWindowOpenHandler(
    ({ url: target }) => {
      if (/^https:\/\//.test(target)) {
        shell.openExternal(target);
      }

      return { action: 'deny' };
    }
  );

  mainWindow.webContents.on(
    'will-navigate',
    (event, target) => {
      if (target !== url) {
        event.preventDefault();

        if (/^https:\/\//.test(target)) {
          shell.openExternal(target);
        }
      }
    }
  );

  await mainWindow.loadURL(url);

  // FIX: laat Windows eerst minimaliseren.
  // Herstel daarna het venster en schakel mini-modus in.
  mainWindow.on('minimize', () => {
    if (mini) return;

    setTimeout(() => {
      if (!mainWindow || mainWindow.isDestroyed()) {
        return;
      }

      mainWindow.restore();
      setMini(true);
      mainWindow.show();
    }, 100);
  });
});

app.on('window-all-closed', () => {
  if (server) {
    server.close();
  }

  if (process.platform !== 'darwin') {
    app.quit();
  }
});
