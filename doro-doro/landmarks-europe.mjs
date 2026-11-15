import {triangle,quad,box,beam,finish} from './geometry.mjs';

// Original low-poly interpretations; no surveyed or engineering geometry.
const TAU=Math.PI*2;
function model(id,name,city,heightMeters,reference,pieces){
  // Normalization includes beam thickness, so nothing sinks below the ground.
  const points=pieces.flatMap(p=>p.vertices), ys=points.map(p=>p[1]);
  const lo=Math.min(...ys),hi=Math.max(...ys),scale=4/(hi-lo);
  for(const p of pieces){p.vertices=p.vertices.map(([x,y,z])=>[x*scale,(y-lo)*scale,z*scale]);p.order=p.vertices.reduce((s,v)=>s+v[1],0)/3;}
  return finish({id,name,city,heightMeters,reference,pieces});
}
function tapered(out,y0,y1,w0,w1,material='steel'){
  for(let i=0;i<4;i++){const a=i*Math.PI/2+Math.PI/4,b=a+Math.PI/2;
    const p=(t,y,w)=>[Math.cos(t)*w,y,Math.sin(t)*w];
    quad(out,p(a,y0,w0),p(b,y0,w0),p(b,y1,w1),p(a,y1,w1),material);
  }
}
function eiffel(){
 const p=[],ys=[.02,.35,.70,1.05,1.40,1.85,2.35,2.85,3.35,3.65],ws=[.75,.61,.43,.34,.25,.17,.115,.08,.06,.04];
 const corners=[[-1,-1],[1,-1],[1,1],[-1,1]];
 for(const [x,z] of corners){
  box(p,x*.75,0,z*.75,.16,.06,.16,'stone');
  for(let j=0;j<ys.length-1;j++)beam(p,[x*ws[j],ys[j],z*ws[j]],[x*ws[j+1],ys[j+1],z*ws[j+1]],j<2?.024:.012,'steel');
 }
 for(let f=0;f<4;f++){
  const a=corners[f],b=corners[(f+1)%4];
  for(let j=2;j<ys.length-1;j++){
   beam(p,[a[0]*ws[j],ys[j],a[1]*ws[j]],[b[0]*ws[j+1],ys[j+1],b[1]*ws[j+1]],.007,'steel');
   beam(p,[b[0]*ws[j],ys[j],b[1]*ws[j]],[a[0]*ws[j+1],ys[j+1],a[1]*ws[j+1]],.007,'steel');
  }
  // A real open arch: segmented curved member, not a filled facade.
  const pos=t=>{const u=-.64+1.28*t,y=.13+.48*Math.sin(Math.PI*t);return [a[0]===b[0]?a[0]*.64:u,y,a[1]===b[1]?a[1]*.64:u];};
  for(let j=0;j<8;j++)beam(p,pos(j/8),pos((j+1)/8),.019,'steel');
 }
 for(const [y,w] of [[.70,.96],[1.40,.59],[3.35,.20]])box(p,0,y,0,w,.045,w,'steel');
 box(p,0,3.39,0,.12,.20,.12,'accent');
 beam(p,[0,3.59,0],[0,3.94,0],.011,'steel');
 beam(p,[0,3.94,0],[0,4,0],.005,'accent');
 return model('eiffel-tower','Eiffel Tower','Paris',330,'https://www.toureiffel.paris/en/the-monument/key-figures',p);
}
function elizabeth(){
 const p=[];box(p,0,0,0,.62,.09,.62);box(p,0,.09,0,.49,2.43,.49);box(p,0,2.22,0,.56,.52,.56);
 for(const y of [.14,.58,1.02,1.46,1.90,2.20,2.74,3.12])box(p,0,y,0,.57,.045,.57,'accent');
 // Transform facade-local coordinates onto each of the four clock faces.
 const face=(f,u,y,d=.286)=>{const a=f*Math.PI/2;return [u*Math.cos(a)+d*Math.sin(a),y,d*Math.cos(a)-u*Math.sin(a)];};
 for(let f=0;f<4;f++){
  for(let row=0;row<5;row++)for(const u of [-.14,0,.14]){
   const y=.25+row*.38;quad(p,face(f,u-.027,y),face(f,u+.027,y),face(f,u+.027,y+.21),face(f,u-.027,y+.21),'steel');
  }
  const cy=2.48,r=.177;
  for(let i=0;i<24;i++){
   const a=i/24*TAU,b=(i+1)/24*TAU;
   const q=(t,rr,d=.289)=>face(f,Math.sin(t)*rr,cy+Math.cos(t)*rr,d);
   p.push(triangle(face(f,0,cy,.289),q(a,r),q(b,r),'glass'));
   quad(p,q(a,r),q(b,r),q(b,r+.015),q(a,r+.015),'accent');
  }
  for(let i=0;i<12;i++){
   const a=i/12*TAU,dx=Math.sin(a),dy=Math.cos(a),tx=Math.cos(a)*.007,ty=-Math.sin(a)*.007;
   quad(p,face(f,dx*.138-tx,cy+dy*.138-ty,.294),face(f,dx*.169-tx,cy+dy*.169-ty,.294),face(f,dx*.169+tx,cy+dy*.169+ty,.294),face(f,dx*.138+tx,cy+dy*.138+ty,.294),'steel');
  }
  // Hands fixed at 10:08, lifted off the dial to prevent z fighting.
  for(const [angle,length] of [[-Math.PI/3,.102],[Math.PI*4/15,.15]]){
   const dx=Math.sin(angle),dy=Math.cos(angle),tx=dy*.008,ty=-dx*.008;
   quad(p,face(f,-tx,cy-ty,.299),face(f,tx,cy+ty,.299),face(f,dx*length+tx,cy+dy*length+ty,.299),face(f,dx*length-tx,cy+dy*length-ty,.299),'steel');
  }
  for(const u of [-.16,-.055,.055,.16])quad(p,face(f,u-.028,2.85),face(f,u+.028,2.85),face(f,u+.028,3.07),face(f,u-.028,3.07),'steel');
 }
 // Corner buttresses and Gothic pinnacles.
 for(const x of [-.25,.25])for(const z of [-.25,.25]){
  box(p,x,.10,z,.055,2.10,.055);box(p,x,2.76,z,.06,.45,.06);
  for(let i=0;i<4;i++){const a=i/4*TAU,b=(i+1)/4*TAU;p.push(triangle([x+Math.cos(a)*.055,3.21,z+Math.sin(a)*.055],[x+Math.cos(b)*.055,3.21,z+Math.sin(b)*.055],[x,3.43,z],'accent'));}
 }
 box(p,0,2.78,0,.47,.34,.47);tapered(p,3.14,3.56,.39,.16,'steel');box(p,0,3.56,0,.21,.13,.21,'accent');tapered(p,3.69,3.96,.15,.013,'steel');beam(p,[0,3.95,0],[0,4,0],.006,'accent');
 return model('elizabeth-tower','Elizabeth Tower (Big Ben)','London',96,'https://www.parliament.uk/about/living-heritage/building/palace/big-ben/facts-figures/',p);
}
function colosseum(){
 const p=[],N=13,rx=1.47,rz=1.22,th=.12;
 const v=(t,y,inset=0)=>[(rx-inset)*Math.cos(t),y,(rz-inset)*Math.sin(t)];
 function panel(a,b,y0,y1){quad(p,v(a,y0),v(b,y0),v(b,y1),v(a,y1));quad(p,v(b,y0,th),v(a,y0,th),v(a,y1,th),v(b,y1,th));}
 for(let tier=0;tier<3;tier++){
  const y=tier*1.08;
  for(let i=0;i<N;i++){
   const a=i/N*TAU,b=(i+1)/N*TAU,g=(b-a)*.19,aa=a+g,bb=b-g;
   // The two solid piers leave a genuinely empty opening below the arch.
   panel(a,aa,y,y+.96);panel(bb,b,y,y+.96);
   quad(p,v(aa,y),v(aa,y+.96),v(aa,y+.96,th),v(aa,y,th));
   quad(p,v(bb,y,th),v(bb,y+.96,th),v(bb,y+.96),v(bb,y));
   for(let s=0;s<3;s++){
    const u=s/3,w=(s+1)/3,t0=aa+(bb-aa)*u,t1=aa+(bb-aa)*w;
    const h0=y+.52+.30*Math.sin(u*Math.PI),h1=y+.52+.30*Math.sin(w*Math.PI);
    quad(p,v(t0,h0),v(t1,h1),v(t1,y+.96),v(t0,y+.96));
    quad(p,v(t1,h1,th),v(t0,h0,th),v(t0,y+.96,th),v(t1,y+.96,th));
    quad(p,v(t0,h0,th),v(t1,h1,th),v(t1,h1),v(t0,h0));
   }
   panel(a,b,y+.96,y+1.08);quad(p,v(a,y+1.08),v(b,y+1.08),v(b,y+1.08,th),v(a,y+1.08,th));
  }
 }
 // Broken attic on one side exposes the hollow arena; this is not a solid drum.
 for(let i=0;i<N;i++){
  const a=i/N*TAU,b=(i+1)/N*TAU,top=i<9?4:3.45;
  panel(a,b,3.24,top);quad(p,v(a,top),v(b,top),v(b,top,th),v(a,top,th));
 }
 return model('colosseum','Colosseum','Rome',48.5,'https://the-colosseum.net/wp/en/numbers/',p);
}
function shard(){
 const p=[],N=8,heights=[4,3.85,3.96,3.74,3.93,3.78,3.99,3.82];
 const base=Array.from({length:N},(_,i)=>{const a=i/N*TAU+Math.PI/8;return [Math.cos(a)*.48,Math.sin(a)*.35];});
 for(let f=0;f<N;f++){
  const a=base[f],b=base[(f+1)%N],height=heights[f];
  // Separate planes have narrow open fractures and unequal shard tips.
  const point=(u,t)=>{const trim=.018+(u*(1-.036));return [(a[0]+(b[0]-a[0])*trim)*(1-t*.98),t*height,(a[1]+(b[1]-a[1])*trim)*(1-t*.98)];};
  for(let j=0;j<18;j++)for(let k=0;k<2;k++)quad(p,point(k/2,j/18),point((k+1)/2,j/18),point((k+1)/2,(j+1)/18),point(k/2,(j+1)/18),'glass');
  // Thin floor strips and exposed spire mullions are separate liftable pieces.
  for(let j=1;j<18;j++){
   const t=j/18;quad(p,point(0,t-.0016),point(1,t-.0016),point(1,t+.0016),point(0,t+.0016),'steel');
  }
  beam(p,point(0,.78),point(0,1),.0025,'steel');
 }
 box(p,0,0,0,.92,.035,.67,'stone');
 return model('the-shard','The Shard','London',309.6,'https://www.fondazionerenzopiano.org/en/project/the-shard-london-bridge-tower/',p);
}
export function europeanLandmarks(){return [eiffel(),elizabeth(),colosseum(),shard()];}
