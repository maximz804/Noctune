const {contextBridge,ipcRenderer}=require('electron');
const listen=(channel,cb)=>ipcRenderer.on(channel,(_e,...args)=>cb(...args));
contextBridge.exposeInMainWorld('noctuneDesktop',{
openMini:state=>ipcRenderer.send('noctune:open-mini',state),
onRequestMini:cb=>listen('noctune:request-mini',cb),
onResume:cb=>listen('noctune:resume',cb),
onLikeTrack:cb=>listen('noctune:like-track',cb),
miniReady:()=>ipcRenderer.send('noctune:mini-ready'),onMiniTrack:cb=>listen('noctune:mini-track',cb),onHandoffRequest:cb=>listen('noctune:handoff-request',cb),
restore:()=>ipcRenderer.send('noctune:restore'),handoff:state=>ipcRenderer.send('noctune:handoff',state),
miniClose:()=>ipcRenderer.send('noctune:mini-close'),miniStateUpdate:state=>ipcRenderer.send('noctune:mini-state-update',state),miniLike:id=>ipcRenderer.send('noctune:mini-like',id)
});
