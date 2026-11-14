const {app,BrowserWindow,shell,ipcMain,screen}=require('electron');
const http=require('node:http'),https=require('node:https'),fs=require('node:fs'),path=require('node:path');
let server,mainWindow,miniWindow,appUrl,miniState=null;
const INSTANCES=['https://yt.chocolatemoo53.com','https://invidious.tiekoetter.com','https://inv.nadeko.net','https://invidious.nerdvpn.de'];
function searchInstance(base,q){return new Promise((resolve,reject)=>{let req=https.get(`${base}/api/v1/search?q=${encodeURIComponent(q)}&type=video&sort_by=relevance`,{headers:{'User-Agent':'NOCTUNE/0.5',Accept:'application/json'},timeout:5500},r=>{if(r.statusCode!==200){r.resume();return reject(Error('HTTP '+r.statusCode))}let s='';r.on('data',b=>{s+=b;if(s.length>1500000)r.destroy()});r.on('end',()=>{try{const j=JSON.parse(s);if(!Array.isArray(j))throw Error('Invalid response');resolve(j)}catch(e){reject(e)}});r.on('error',reject)});req.on('timeout',()=>req.destroy(Error('Timeout')));req.on('error',reject)})}
async function publicSearch(q){for(const instance of INSTANCES){try{const items=await searchInstance(instance,q);const tracks=items.filter(x=>x.type==='video'&&/^[\w-]{11}$/.test(x.videoId)).slice(0,30).map(x=>({id:x.videoId,title:String(x.title||'Untitled'),artist:String(x.author||'YouTube'),thumbnail:`https://i.ytimg.com/vi/${x.videoId}/mqdefault.jpg`}));if(tracks.length)return tracks}catch(e){console.warn('Search unavailable:',instance,e.message)}}throw Error('Music search providers unavailable. Try again or paste a YouTube link.')}
function serve(){return new Promise((resolve,reject)=>{server=http.createServer(async(req,res)=>{let u;try{u=new URL(req.url,'http://localhost')}catch{res.writeHead(400);return res.end()}
if(u.pathname==='/api/search'){const q=(u.searchParams.get('q')||'').trim().slice(0,120);if(!q){res.writeHead(400,{'Content-Type':'application/json'});return res.end(JSON.stringify({error:'Enter a search term'}))}try{const tracks=await publicSearch(q);res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({tracks}))}catch(e){res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({error:e.message}))}return}
const files={'/':'index.html','/index.html':'index.html','/mini.html':'mini.html'};const name=files[u.pathname];if(!name){res.writeHead(404);return res.end('Not found')}fs.readFile(path.join(__dirname,name),(e,data)=>{if(e){res.writeHead(500);return res.end('Could not load app')}res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Referrer-Policy':'strict-origin-when-cross-origin','X-Content-Type-Options':'nosniff'});res.end(data)})});server.on('error',reject);server.listen(0,'127.0.0.1',()=>resolve(`http://127.0.0.1:${server.address().port}/`))})}
function sendMain(channel,...args){if(mainWindow&&!mainWindow.isDestroyed())mainWindow.webContents.send(channel,...args)}
function showMain(){if(!miniWindow||miniWindow.isDestroyed()){mainWindow.show();return}miniWindow.webContents.send('noctune:handoff-request')}
function closeMini(){if(miniWindow&&!miniWindow.isDestroyed()){miniWindow.removeAllListeners('closed');miniWindow.close()}miniWindow=null;miniState=null}
function openMini(state){if(!mainWindow||mainWindow.isDestroyed())return;if(miniWindow&&!miniWindow.isDestroyed()){miniWindow.focus();return}miniState=state||null;
const display=screen.getDisplayMatching(mainWindow.getBounds()),w=500,h=405;
miniWindow=new BrowserWindow({width:w,height:h,minWidth:440,minHeight:350,maxWidth:650,maxHeight:560,x:Math.round(display.workArea.x+(display.workArea.width-w)/2),y:display.workArea.y+12,frame:false,alwaysOnTop:true,backgroundColor:'#120e20',show:false,skipTaskbar:false,title:'NOCTUNE Mini',webPreferences:{preload:path.join(__dirname,'preload.js'),nodeIntegration:false,contextIsolation:true,sandbox:true,backgroundThrottling:false}});
miniWindow.webContents.setWindowOpenHandler(({url})=>{if(/^https:\/\//.test(url))shell.openExternal(url);return {action:'deny'}});
miniWindow.on('closed',()=>{miniWindow=null;if(mainWindow&&!mainWindow.isDestroyed()&&!mainWindow.isVisible())mainWindow.show()});
miniWindow.loadURL(appUrl+'mini.html').then(()=>{if(miniWindow&&!miniWindow.isDestroyed()){miniWindow.show();miniWindow.webContents.send('noctune:mini-track',miniState);mainWindow.hide()}}).catch(e=>{console.error(e);closeMini();mainWindow.show()})}
ipcMain.on('noctune:open-mini',(e,state)=>{if(e.sender!==mainWindow?.webContents)return;openMini(state)});
ipcMain.on('noctune:mini-ready',e=>{if(e.sender===miniWindow?.webContents)miniWindow.webContents.send('noctune:mini-track',miniState)});
ipcMain.on('noctune:restore',e=>{if(e.sender===miniWindow?.webContents)showMain()});
ipcMain.on('noctune:handoff', (e,state)=>{if(e.sender!==miniWindow?.webContents)return;sendMain('noctune:resume',state);closeMini();mainWindow.show();mainWindow.focus()});
ipcMain.on('noctune:mini-close',e=>{if(e.sender===miniWindow?.webContents)showMain()});
ipcMain.on('noctune:mini-state-update',(e,state)=>{if(e.sender===miniWindow?.webContents)miniState=state});
ipcMain.on('noctune:mini-like',(e,id)=>{if(e.sender===miniWindow?.webContents)sendMain('noctune:like-track',id)});
app.whenReady().then(async()=>{appUrl=await serve();mainWindow=new BrowserWindow({width:1500,height:900,minWidth:1000,minHeight:650,backgroundColor:'#090b14',icon:path.join(__dirname,'noctune.png'),title:'NOCTUNE',autoHideMenuBar:true,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,backgroundThrottling:false,preload:path.join(__dirname,'preload.js')}});
mainWindow.webContents.setWindowOpenHandler(({url})=>{if(/^https:\/\//.test(url))shell.openExternal(url);return {action:'deny'}});
mainWindow.webContents.on('will-navigate',(e,target)=>{if(target!==appUrl){e.preventDefault();if(/^https:\/\//.test(target))shell.openExternal(target)}});
await mainWindow.loadURL(appUrl);
mainWindow.on('minimize',()=>{if(miniWindow)return;setTimeout(()=>{if(!mainWindow||mainWindow.isDestroyed()||miniWindow)return;mainWindow.restore();sendMain('noctune:request-mini')},120)});
mainWindow.on('closed',()=>{mainWindow=null;closeMini()});
});
app.on('window-all-closed',()=>{if(server)server.close();if(process.platform!=='darwin')app.quit()});
