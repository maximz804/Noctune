const {contextBridge,ipcRenderer}=require('electron');
const on=(channel,cb)=>ipcRenderer.on(channel,(_event,...args)=>cb(...args));
contextBridge.exposeInMainWorld('noctuneDesktop',{
 openMini:s=>ipcRenderer.send('noctune:open-mini',s),onRequestMini:cb=>on('noctune:request-mini',cb),onResume:cb=>on('noctune:resume',cb),onLikeTrack:cb=>on('noctune:like-track',cb),miniReady:()=>ipcRenderer.send('noctune:mini-ready'),onMiniTrack:cb=>on('noctune:mini-track',cb),onHandoffRequest:cb=>on('noctune:handoff-request',cb),restore:()=>ipcRenderer.send('noctune:restore'),handoff:s=>ipcRenderer.send('noctune:handoff',s),miniStateUpdate:s=>ipcRenderer.send('noctune:mini-state-update',s),miniLike:id=>ipcRenderer.send('noctune:mini-like',id)
});
