// A custom orthographic architectural study. No 3D engine or external assets.
export function createArchitecture(canvas,getState){
 const ctx=canvas.getContext('2d');let w=0,h=0,dpr=1,frame=0,last=0,angle=-.55,targetX=0,targetY=0,px=0,py=0;let palette;const motion=matchMedia('(prefers-reduced-motion: reduce)');
 const parent=canvas.parentElement;
 const resize=()=>{const r=parent.getBoundingClientRect();w=r.width;h=r.height;dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);readPalette();draw(0);};
 function readPalette(){const s=getComputedStyle(document.documentElement);palette={paper:s.getPropertyValue('--paper').trim(),ink:s.getPropertyValue('--ink').trim(),muted:s.getPropertyValue('--muted').trim(),rule:s.getPropertyValue('--rule').trim(),accent:s.getPropertyValue('--accent').trim(),slab:s.getPropertyValue('--slab').trim(),dark:document.documentElement.dataset.theme==='dark'};}
 const observer=new ResizeObserver(resize);observer.observe(parent);
 const themeObserver=new MutationObserver(()=>{readPalette();draw(0)});themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
 parent.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;const r=parent.getBoundingClientRect();targetX=(e.clientX-r.left)/w-.5;targetY=(e.clientY-r.top)/h-.5;});
 parent.addEventListener('pointerleave',()=>{targetX=targetY=0});window.addEventListener('blur',()=>{targetX=targetY=0});
 function draw(time){if(!palette||!w)return;const state=getState();const progress=state.progress;const rest=state.mode!=='focus';const dt=Math.min((time-last)/1000,.05)||0;last=time;
 if(!motion.matches){px+=(targetX-px)*.045;py+=(targetY-py)*.045;angle+=dt*(state.running?.021:.004);}else{px=py=0;}
 const a=angle+px*.45+progress*.55;const ca=Math.cos(a),sa=Math.sin(a);const elevation=.44+py*.1;const ce=Math.cos(elevation),se=Math.sin(elevation);
 const scale=Math.min(w/4.2,(h-100)/6.0);const cx=w*.5,cy=h*.53;
 const project=(x,y,z)=>{const xx=x*ca-z*sa,zz=x*sa+z*ca;return [cx+xx*scale,cy+(-y*ce+zz*se)*scale,zz*ce+y*se]};
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);ctx.lineWidth=.65;ctx.lineJoin='round';
 const line=(p,q,color,alpha=1,width=.65)=>{ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);ctx.stroke();ctx.globalAlpha=1};
 // Survey ground, engraved grids, register marks and projection lines.
 const ground=-2.0;ctx.save();for(let i=-5;i<=5;i++){line(project(i*.36,ground,-1.8),project(i*.36,ground,1.8),palette.rule,.33);line(project(-1.8,ground,i*.36),project(1.8,ground,i*.36),palette.rule,.33)}
 const ring=(r,y,alpha)=>{ctx.beginPath();for(let i=0;i<=100;i++){const t=i/100*Math.PI*2,p=project(Math.cos(t)*r,y,Math.sin(t)*r);i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])}ctx.strokeStyle=palette.rule;ctx.globalAlpha=alpha;ctx.lineWidth=.7;ctx.stroke();ctx.globalAlpha=1};ring(1.52,ground,.8);ring(1.60,ground,.4);
 for(const v of [[-1.75,ground,-1.75],[1.75,ground,1.75]]){const p=project(...v);line([p[0]-5,p[1]],[p[0]+5,p[1]],palette.muted,.7);line([p[0],p[1]-5],[p[0],p[1]+5],palette.muted,.7)}ctx.restore();
 const faces=[];const addFace=(pts,fill,stroke=palette.ink,alpha=1)=>{const p=pts.map(v=>project(...v));faces.push({p,depth:p.reduce((a,v)=>a+v[2],0)/p.length,fill,stroke,alpha})};
 function box(x,z,y,sx,sz,thick,turn,top,side){const c=Math.cos(turn),s=Math.sin(turn);const v=(xx,yy,zz)=>[x+xx*c-zz*s,yy,z+xx*s+zz*c];const b=[v(-sx,y,-sz),v(sx,y,-sz),v(sx,y,sz),v(-sx,y,sz)],t=b.map(([a,b,c])=>[a,b+thick,c]);addFace(t,top);for(let j=0;j<4;j++)addFace([b[j],b[(j+1)%4],t[(j+1)%4],t[j]],side);}
 const levels=24;
 // Suspended vermilion core: session progress rises inside the stone section.
 box(0,0,ground+.05,.22,.22,3.45,0,palette.accent,palette.dark?'#93553e':'#8f3427');
 for(let i=0;i<levels;i++){
 const t=i/(levels-1),y=-1.72+t*3.45;const turn=(t-.5)*.92+Math.sin(t*5+progress*3)*.11+(rest?Math.sin(t*6)*.32:0);const drift=rest?Math.sin(t*5)*.19:0;
 const activated=t<=progress&&progress>0;const top=activated?palette.accent:palette.slab;const side=activated?(palette.dark?'#b76948':'#8e3527'):(palette.dark?'#3f4a3c':'#b8baaa');
 const radius=.87+Math.sin(t*Math.PI)*.20;const thickness=.032;const gap=.30;
 // Four structural bands form a genuine courtyard void rather than a solid block.
 const c=Math.cos(turn),s=Math.sin(turn);const band=(x,z,sx,sz)=>box(x*c-z*s+drift,x*s+z*c,y,sx,sz,thickness,turn,top,side);
 band(0,-(radius+gap)/2,radius,(radius-gap)/2);band(0,(radius+gap)/2,radius,(radius-gap)/2);band(-(radius+gap)/2,0,(radius-gap)/2,gap);band((radius+gap)/2,0,(radius-gap)/2,gap);
 // Thin cantilever fins articulate every third terrace.
 if(i%3===0){band(radius+.12,0,.16,.018);band(-radius-.12,0,.16,.018)}
 }
 faces.sort((a,b)=>a.depth-b.depth);for(const f of faces){ctx.beginPath();f.p.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fillStyle=f.fill;ctx.fill();ctx.globalAlpha=.48;ctx.strokeStyle=f.stroke;ctx.lineWidth=.45;ctx.stroke();ctx.globalAlpha=1;}
 // Hairline technical measurements remain fixed to the moving structure.
 const top=project(1.6,1.78,0),bottom=project(1.6,-1.72,0);line(top,bottom,palette.muted,.7);for(const p of [top,bottom]){line([p[0]-4,p[1]-3],[p[0]+4,p[1]+3],palette.muted,.8);line([p[0]-15,p[1]],[p[0]+6,p[1]],palette.rule,.5)}
 ctx.save();ctx.translate((top[0]+bottom[0])/2+10,(top[1]+bottom[1])/2);ctx.rotate(-Math.PI/2);ctx.font='8px monospace';ctx.fillStyle=palette.muted;ctx.textAlign='center';ctx.fillText(`${Math.round((1-progress)*100).toString().padStart(3,'0')} / 100`,0,0);ctx.restore();
 // Time's cross-section: a tracking plane, not a decorative loader.
 if(progress>0){const p=project(0,-1.72+progress*3.45,0);line([w*.08,p[1]],[w*.92,p[1]],palette.accent,.35,.5);ctx.fillStyle=palette.accent;ctx.fillRect(w*.08-2,p[1]-2,4,4)}
 }
 function loop(t){frame=requestAnimationFrame(loop);if(document.hidden)return;if(motion.matches&&t-last<1000)return;draw(t)}
 resize();frame=requestAnimationFrame(loop);return {draw:()=>draw(performance.now()),destroy(){cancelAnimationFrame(frame);observer.disconnect();themeObserver.disconnect()}};
}
