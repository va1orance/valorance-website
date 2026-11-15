import {Timer} from './timer.mjs';
import {createArchitecture} from './architecture.mjs';
const $=s=>document.querySelector(s);
const load=k=>{try{return JSON.parse(localStorage.getItem(k))}catch{return null}};
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
const timer=Timer.restore(load('doro-timer-v1'));let soundEnabled=load('doro-sound')===true;let audio;let completedMessage=false;
const names={focus:'FOCUS',short:'SHORT REST',long:'LONG REST'};
function persist(){save('doro-timer-v1',timer.serialize())}
function update(){
 const left=timer.remaining(),seconds=Math.ceil(left/1000),mm=String(Math.floor(seconds/60)).padStart(2,'0'),ss=String(seconds%60).padStart(2,'0');
 $('#time').textContent=`${mm}:${ss}`;document.title=`${mm}:${ss} — ${timer.running?names[timer.mode].toLowerCase():'Doro-doro'}`;
 $('#interval').textContent=String(timer.completed+1).padStart(2,'0');$('#phase-label').textContent=`${timer.durations[timer.mode]} MIN / ${names[timer.mode]}`;
 $('#completed').textContent=String(timer.completed).padStart(2,'0');$('#toggle').setAttribute('aria-label',timer.running?'Pause timer':`Start ${timer.mode==='focus'?'focus':'rest'}`);
 $('#toggle-text').textContent=timer.running?'Pause session':(left<timer.durations[timer.mode]*60000?'Continue session':timer.mode==='focus'?'Begin session':'Begin rest');
 $('#play-icon').innerHTML=timer.running?'<path d="M8 6v12M16 6v12"/>':'<path d="M6 12h12m-5-5 5 5-5 5"/>';
 $('#status').textContent=completedMessage?'Time to breathe.':timer.running?(timer.mode==='focus'?'Nothing else. Just this.':'A little space to return.'):(left<timer.durations[timer.mode]*60000?'Time is yours. Take a breath.':timer.mode==='focus'?'Make room for one thing.':'Let your thoughts wander.');
 $('#art-mode').textContent=timer.mode==='focus'?'FOCUS STUDY':'REST STUDY';$('#sculpture-label').textContent=timer.mode==='focus'?'FIG. 01   /   ACCUMULATION':'FIG. 02   /   DECOMPRESSION';$('#drawing-state').textContent=timer.running?'IN MOTION':'AT REST';
 const done=timer.completed===0?0:(timer.completed%4||4);document.querySelectorAll('.session-dots i').forEach((el,i)=>el.classList.toggle('done',i<done));
 document.querySelectorAll('[data-mode]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.mode===timer.mode)));
 $('#timeline-fill').style.width=`${(1-left/(timer.durations[timer.mode]*60000))*100}%`;
 $('#sound-state').textContent=soundEnabled?'ON':'OFF';$('#sound').setAttribute('aria-pressed',String(soundEnabled));$('#sound').setAttribute('aria-label',`${soundEnabled?'Disable':'Enable'} completion sound`);
}
function unlockAudio(){if(!soundEnabled)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume().catch(()=>{})}catch{}}
function chime(){if(!soundEnabled||!audio)return;try{const now=audio.currentTime;[523.25,659.25,783.99].forEach((hz,i)=>{const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.value=hz;g.gain.setValueAtTime(0,now+i*.22);g.gain.linearRampToValueAtTime(.12,now+i*.22+.025);g.gain.exponentialRampToValueAtTime(.001,now+i*.22+1.6);o.connect(g);g.connect(audio.destination);o.start(now+i*.22);o.stop(now+i*.22+1.7)})}catch{}}
function toggle(){completedMessage=false;unlockAudio();if(timer.tick()){chime();completedMessage=true}else if(timer.running)timer.pause();else timer.start();persist();update()}
$('#toggle').addEventListener('click',toggle);
$('#reset').addEventListener('click',()=>{completedMessage=false;timer.reset();persist();update()});
$('#skip').addEventListener('click',()=>{completedMessage=false;timer.skip();persist();update()});
for(const button of document.querySelectorAll('[data-mode]'))button.addEventListener('click',()=>{completedMessage=false;timer.select(button.dataset.mode);persist();update()});
$('#sound').addEventListener('click',()=>{soundEnabled=!soundEnabled;save('doro-sound',soundEnabled);unlockAudio();if(soundEnabled)chime();update()});
const dialog=$('#settings');$('#settings-open').addEventListener('click',()=>{for(const k of ['focus','short','long'])dialog.querySelector(`[name=${k}]`).value=timer.durations[k];dialog.showModal()});$('#settings-close').addEventListener('click',()=>dialog.close());
$('#settings-form').addEventListener('submit',e=>{e.preventDefault();const data=new FormData(e.target);timer.configure(Object.fromEntries(['focus','short','long'].map(k=>[k,Number(data.get(k))])));completedMessage=false;persist();update();dialog.close()});
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});
function themeUI(){const dark=document.documentElement.dataset.theme==='dark';$('#theme').setAttribute('aria-label',`Switch to ${dark?'light':'dark'} theme`);$('#theme-name').textContent=dark?'AFTER HOURS':'PAPER';$('meta[name=theme-color]').content=dark?'#202520':'#e9e6dc'}
$('#theme').addEventListener('click',()=>{const next=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;try{localStorage.setItem('doro-theme',next)}catch{}themeUI()});themeUI();
$('#fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{$('#fullscreen').title='Fullscreen is not available in this browser'}});
if(!document.documentElement.requestFullscreen)$('#fullscreen').hidden=true;
document.addEventListener('fullscreenchange',()=>{$('#fullscreen').setAttribute('aria-label',document.fullscreenElement?'Exit fullscreen':'Enter fullscreen')});
document.addEventListener('keydown',e=>{if(dialog.open||e.altKey||e.metaKey||e.ctrlKey||e.repeat||e.isComposing||e.target.closest('input,textarea,select,button,a,[contenteditable]'))return;if(e.code==='Space'){e.preventDefault();toggle()}else if(e.key.toLowerCase()==='r')$('#reset').click()});
const tick=()=>{if(timer.tick()){completedMessage=true;chime();persist()}update()};setInterval(tick,250);document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick()});window.addEventListener('pageshow',tick);
createArchitecture($('#architecture'),()=>({mode:timer.mode,running:timer.running,progress:1-timer.remaining()/(timer.durations[timer.mode]*60000)}));tick();
