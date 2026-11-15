import {asianLandmarks} from './landmarks-asia.mjs';
import {europeanLandmarks} from './landmarks-europe.mjs';
import {worldLandmarks} from './landmarks-world.mjs';
export function getLandmarks(){return [...asianLandmarks(),...europeanLandmarks(),...worldLandmarks()].map(m=>{
 // Restore squat landmarks' real aspect ratios after the shared mesh envelope.
 const sy=m.id==='colosseum'?.26:m.id==='great-pyramid-giza'?.471:m.id==='marina-bay-sands'?.47:1;
 if(sy!==1)for(const p of m.pieces){p.vertices=p.vertices.map(([x,y,z])=>[x,y*sy,z]);p.order*=sy;}return m;
});}
export function constructionState(model,progress){const count=model.pieces.length;const p=Math.max(0,Math.min(1,Number.isFinite(progress)?progress:0));const cursor=p*count;return {built:Math.floor(cursor),fraction:cursor-Math.floor(cursor),complete:p===1};}
export function createArchitecture(canvas,getState){
 const ctx=canvas.getContext('2d'),models=getLandmarks(),motion=matchMedia('(prefers-reduced-motion: reduce)');let w=0,h=0,dpr=1,frame,last=0,px=0,py=0,tx=0,ty=0,palette;
 const parent=canvas.parentElement;
 function colors(){const s=getComputedStyle(document.documentElement),v=k=>s.getPropertyValue(k).trim();palette={paper:v('--paper'),ink:v('--ink'),muted:v('--muted'),rule:v('--rule'),accent:v('--accent'),stone:v('--slab'),steel:v('--steel')||v('--muted'),glass:v('--glass')||v('--slab')};}
 function resize(){const r=parent.getBoundingClientRect();w=r.width;h=r.height;dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);colors();draw(performance.now());}
 const observer=new ResizeObserver(resize);observer.observe(parent);const themes=new MutationObserver(()=>{colors();draw(performance.now())});themes.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
 parent.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;const r=parent.getBoundingClientRect();tx=(e.clientX-r.left)/w-.5;ty=(e.clientY-r.top)/h-.5});const reset=()=>{tx=ty=0};parent.addEventListener('pointerleave',reset);window.addEventListener('blur',reset);
 function draw(time){if(!w||!palette)return;const state=getState(),model=models.find(m=>m.id===state.landmark)||models[0];const progress=Math.max(0,Math.min(1,state.progress));const construction=constructionState(model,progress);const moving=state.running&&!motion.matches;const dt=Math.max(0,Math.min((time-last)/1000,.05));last=time;if(!motion.matches){const ease=1-Math.exp(-dt*6);px+=(tx-px)*ease;py+=(ty-py)*ease}else px=py=0;
 const angle=-.60+px*.50,ca=Math.cos(angle),sa=Math.sin(angle),elev=.32+py*.12,ce=Math.cos(elev),se=Math.sin(elev);const maxY=Math.max(...model.pieces.map(p=>p.order))+.1;const scale=Math.min(w/5.4,(h-125)/5.7);const groundY=h*.79;const project=([x,y,z])=>{const xx=x*ca-z*sa,zz=x*sa+z*ca;return [w*.48+xx*scale,groundY+(-y*ce+zz*se)*scale,zz*ce-y*se]};
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);ctx.lineJoin='round';ctx.lineCap='round';
 const line=(a,b,color=palette.rule,alpha=1,width=.7)=>{const p=project(a),q=project(b);ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);ctx.stroke();ctx.globalAlpha=1};
 for(let i=-6;i<=6;i++){const k=i*.35;line([k,0,-2.1],[k,0,2.1],palette.rule,.30);line([-2.1,0,k],[2.1,0,k],palette.rule,.30)}
 for(const x of [-1.8,1.8])for(const z of [-1.8,1.8]){line([x-.07,0,z],[x+.07,0,z],palette.muted,.8);line([x,0,z-.07],[x,0,z+.07],palette.muted,.8)}
 // A quiet complete elevation stays as a scaffold, never an opaque core.
 ctx.strokeStyle=palette.ink;ctx.lineWidth=.40;ctx.globalAlpha=.075;ctx.beginPath();for(const piece of model.pieces){const ps=piece.vertices.map(project);ctx.moveTo(ps[0][0],ps[0][1]);ctx.lineTo(ps[1][0],ps[1][1]);ctx.lineTo(ps[2][0],ps[2][1]);ctx.closePath()}ctx.stroke();ctx.globalAlpha=1;
 const faces=[];function face(piece,offset=[0,0,0],active=false){const points=piece.vertices.map(v=>project(v.map((n,i)=>n+offset[i])));const [a,b,c]=piece.vertices,u=b.map((n,i)=>n-a[i]),v=c.map((n,i)=>n-a[i]),normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],norm=Math.hypot(...normal)||1;const lighting=.88+Math.abs((normal[0]*.5+normal[1]*.8+normal[2]*.3)/norm)*.12;faces.push({points,depth:points.reduce((s,p)=>s+p[2],0)/3,color:active?palette.accent:palette[piece.material]||palette.stone,lighting});}
 for(let i=0;i<construction.built;i++)face(model.pieces[i]);
 // The crane slews, then lowers exactly the next structural panel into place.
 const next=model.pieces[Math.min(construction.built,model.pieces.length-1)];const center=next.vertices[0].map((_,i)=>next.vertices.reduce((s,v)=>s+v[i],0)/3);const f=construction.fraction;const smooth=x=>x*x*(3-2*x);const arrive=smooth(Math.min(1,f/.52)),lower=smooth(Math.max(0,(f-.52)/.48));const lift=motion.matches?0:(1-lower)*.72;const offset=[motion.matches?0:(1-arrive)*1.2,lift,motion.matches?0:(1-arrive)*.45];if(!construction.complete)face(next,offset,true);
 faces.sort((a,b)=>b.depth-a.depth);for(const f of faces){ctx.beginPath();f.points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fillStyle=f.color;ctx.fill();ctx.fillStyle=palette.ink;ctx.globalAlpha=(1-f.lighting)*.7;ctx.fill();ctx.globalAlpha=.28;ctx.strokeStyle=palette.ink;ctx.lineWidth=.36;ctx.stroke();ctx.globalAlpha=1;}
 if(!construction.complete){const load=center.map((n,i)=>n+offset[i]);const mastX=-1.75,mastZ=.55,craneY=Math.max(maxY+.35,load[1]+.55);const crane=palette.accent;
 // Latticed tower, counter-jib, cabin, trolley and suspended hook.
 for(const x of [mastX-.055,mastX+.055])line([x,0,mastZ],[x,craneY,mastZ],crane,.8,1);
 for(let y=0;y<craneY;y+=.22){const top=Math.min(craneY,y+.22);line([mastX-.055,y,mastZ],[mastX+.055,top,mastZ],crane,.65,.65);line([mastX+.055,y,mastZ],[mastX-.055,top,mastZ],crane,.65,.65)}
 const end=[Math.max(load[0]+.35,.8),craneY,load[2]];line([mastX-.55,craneY,mastZ],end,crane,1,1.2);line([mastX-.55,craneY+.11,mastZ],[end[0],craneY+.11,end[2]],crane,.7,.65);line([mastX,craneY+.4,mastZ],end,crane,.65);line([mastX,craneY+.4,mastZ],[mastX-.55,craneY,mastZ],crane,.65);
 line([load[0],craneY,load[2]],[load[0],load[1]+.04,load[2]],palette.ink,.8,.65);for(const v of next.vertices)line([load[0],load[1]+.07,load[2]],v.map((n,i)=>n+offset[i]),crane,.55,.5);
 const cabin=project([mastX+.13,craneY-.06,mastZ]);ctx.fillStyle=palette.ink;ctx.fillRect(cabin[0]-3,cabin[1]-3,6,6);
 // Survey crew: tiny helmets, jointed legs and a moving site cart.
 for(let i=0;i<3;i++){const t=moving?time*.00035:0;const x=-.9+i*.8+Math.sin(t+i)*.14,z=1.2;const p=project([x,.07,z]);ctx.fillStyle=crane;ctx.beginPath();ctx.arc(p[0],p[1]-6,1.8,0,Math.PI*2);ctx.fill();line([x,.09,z],[x,.02,z],palette.ink,.9,1.3);line([x,.02,z],[x-.025,0,z+.02],palette.ink,.8);line([x,.02,z],[x+.025,0,z-.02],palette.ink,.8);}
 }
 // Height datum and construction count, aligned to the ground instead of the mesh.
 line([1.8,0,0],[1.8,maxY,0],palette.muted,.45,.55);for(const y of [0,maxY])line([1.74,y,0],[1.86,y,0],palette.muted,.7);const datum=project([1.8,maxY*.5,0]);ctx.save();ctx.translate(datum[0]+10,datum[1]);ctx.rotate(-Math.PI/2);ctx.fillStyle=palette.muted;ctx.font='8px monospace';ctx.textAlign='center';ctx.fillText(`${model.heightMeters} M / ${String(Math.floor(progress*100)).padStart(2,'0')}%`,0,0);ctx.restore();
 canvas.dataset.complete=construction.built;canvas.dataset.total=model.pieces.length;canvas.dataset.built=construction.built;canvas.dataset.model=model.id;canvas.dataset.progress=progress.toFixed(5);
 }
 function loop(t){frame=requestAnimationFrame(loop);if(document.hidden)return;if(t-last<(motion.matches?500:1000/30))return;draw(t)}resize();frame=requestAnimationFrame(loop);return {draw:()=>draw(performance.now()),destroy(){cancelAnimationFrame(frame);observer.disconnect();themes.disconnect();window.removeEventListener('blur',reset)}};
}
