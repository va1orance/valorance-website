// Original stylized architectural meshes; research and intentional distortions in references-asia.md.
import { triangle, quad, box, ring, sphere, beam, finish } from './geometry.mjs';

const TAU = Math.PI * 2;
const corners = (y, w, d=w, x=0, z=0) => [[x-w/2,y,z-d/2],[x+w/2,y,z-d/2],[x+w/2,y,z+d/2],[x-w/2,y,z+d/2]];
function shell(out,y0,y1,w0,w1,d0=w0,d1=w1,x=0,z0=0,z1=z0,material='glass') {
  const a=corners(y0,w0,d0,x,z0),b=corners(y1,w1,d1,x,z1);
  for(let i=0;i<4;i++) quad(out,a[i],a[(i+1)%4],b[(i+1)%4],b[i],material);
}
function clean(model) {
  // sphere() has collapsed polar triangles; do not send zero-area crane payloads.
  model.pieces=model.pieces.filter(t=>{
    const [a,b,c]=t.vertices,u=b.map((v,i)=>v-a[i]),v=c.map((v,i)=>v-a[i]);
    return Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])>1e-10;
  });
  return finish(model);
}
function pearl() {
  const pieces=[],s=4/468;
  ring(pieces,0,.07,.68,.61,24,'stone');
  ring(pieces,.07,.12,.61,.38,24,'steel');
  // Three outward raking concrete legs, not an opaque tapered pedestal.
  for(let i=0;i<3;i++) {
    const a=i*TAU/3+Math.PI/6, ca=Math.cos(a),sa=Math.sin(a);
    box(pieces,.54*ca,0,.54*sa,.16,.08,.16,'stone');
    beam(pieces,[.54*ca,.08,.54*sa],[.08*ca,93*s,.08*sa],.043,'stone');
    beam(pieces,[.075*ca,.72,.075*sa],[.075*ca,2.49,.075*sa],.026,'stone');
  }
  sphere(pieces,0,93*s,0,25*s,16,8,'accent');
  sphere(pieces,0,272.5*s,0,22.5*s,16,8,'accent');
  // Dark equatorial observation windows emphasize the two principal pearls.
  ring(pieces,93*s-.027,93*s+.027,25.08*s,25.08*s,16,'glass');
  ring(pieces,272.5*s-.035,272.5*s+.035,22.6*s,22.6*s,16,'glass');
  for(let i=0;i<5;i++) sphere(pieces,0,1.22+i*.175,0,.055,8,4,'glass');
  ring(pieces,2.45,2.91,.047,.037,10,'steel');
  sphere(pieces,0,346*s,0,7*s,12,6,'accent');
  ring(pieces,3.02,3.43,.032,.023,10,'steel');
  ring(pieces,3.43,3.78,.023,.011,8,'accent');
  ring(pieces,3.78,4,.011,0,8,'steel');
  return clean({id:'oriental-pearl',name:'Oriental Pearl Tower',city:'Shanghai, China',heightMeters:468,reference:'https://skyscraperpage.com/b25/shanghai/oriental-pearl-tower',pieces});
}
function taipei() {
  const pieces=[];
  box(pieces,0,0,0,.88,.11,.88,'stone');
  shell(pieces,.11,.66,.66,.57,.66,.57,0,0,0,'glass');
  for(let i=0;i<4;i++) shell(pieces,.18+i*.12,.19+i*.12,.66-i*.018,.66-i*.018,undefined,undefined,0,0,0,'steel');
  box(pieces,0,.66,0,.70,.08,.70,'stone');
  // Eight distinct upward-flaring eight-storey modules: the bamboo/pagoda silhouette.
  const start=.74,step=.327;
  for(let k=0;k<8;k++) {
    const y=start+k*step,h=.295,w0=.48,w1=.66;
    for(let row=0;row<8;row++) {
      const a=row/8,b=(row+1)/8;
      shell(pieces,y+a*h,y+b*h,w0+(w1-w0)*a,w0+(w1-w0)*b,undefined,undefined,0,0,0,row===7?'steel':'glass');
    }
    shell(pieces,y+h,y+h+.032,.69,.48,undefined,undefined,0,0,0,'stone');
    const lower=corners(y,.48),upper=corners(y+h,.66);
    for(let i=0;i<4;i++) {
      beam(pieces,lower[i],upper[i],.009,'steel');
      // One narrow central mullion per facade, separately liftable.
      const j=(i+1)%4;
      beam(pieces,lower[i].map((v,d)=>(v+lower[j][d])/2),upper[i].map((v,d)=>(v+upper[j][d])/2),.005,'steel');
    }
  }
  // Stepped crown and smaller lantern support the long antenna.
  box(pieces,0,3.356,0,.46,.10,.46,'steel');
  shell(pieces,3.456,3.58,.42,.30,undefined,undefined,0,0,0,'glass');
  box(pieces,0,3.58,0,.32,.045,.32,'stone');
  shell(pieces,3.625,3.73,.22,.14,undefined,undefined,0,0,0,'steel');
  ring(pieces,3.73,3.91,.024,.017,8,'steel');
  ring(pieces,3.91,4,.017,0,8,'accent');
  // Four coin-like medallions on the pedestal (vertical eight-sided discs).
  for(let face=0;face<4;face++) {
    const a=face*Math.PI/2;
    for(let j=0;j<8;j++) {
      const u=j*TAU/8,v=(j+1)*TAU/8;
      const p=t=>[Math.cos(a)*.354-Math.sin(a)*Math.cos(t)*.064,.67+Math.sin(t)*.064,Math.sin(a)*.354+Math.cos(a)*Math.cos(t)*.064];
      pieces.push(triangle([Math.cos(a)*.354,.67,Math.sin(a)*.354],p(u),p(v),'accent'));
    }
  }
  return clean({id:'taipei-101',name:'Taipei 101',city:'Taipei, Taiwan',heightMeters:508,reference:'https://en.wikipedia.org/wiki/Taipei_101',pieces});
}
function tokyo() {
  const pieces=[];
  const levels=[[.045,.68],[.45,.50],[.93,.34],[1.40,.255],[1.80,.205],[2.22,.145],[2.65,.095],[3.03,.065]];
  for(const [x,z] of [[-.68,-.68],[.68,-.68],[.68,.68],[-.68,.68]]) box(pieces,x,0,z,.19,.07,.19,'stone');
  for(let k=0;k<levels.length-1;k++) {
    const [y0,r0]=levels[k],[y1,r1]=levels[k+1],a=corners(y0,2*r0),b=corners(y1,2*r1);
    const mat=k<4||k===5?'accent':'stone';
    for(let side=0;side<4;side++) {
      const next=(side+1)%4;
      beam(pieces,a[side],b[side],k<3?.022:.012,mat);
      // Lowest bay stays open between legs; its braces climb each side rather than filling the foot void.
      if(k===0) {
        const mid=a[side].map((v,i)=>(v+b[side][i])/2);
        beam(pieces,mid,b[next],.011,mat);
      } else {
        beam(pieces,a[side],b[next],.010,mat);
        beam(pieces,a[next],b[side],.010,mat);
        beam(pieces,a[side],a[next],.010,mat);
      }
    }
  }
  box(pieces,0,1.70,0,.60,.055,.60,'stone');
  box(pieces,0,1.755,0,.55,.105,.55,'glass');
  box(pieces,0,1.86,0,.59,.045,.59,'accent');
  ring(pieces,2.94,2.98,.16,.16,12,'stone');
  ring(pieces,2.98,3.08,.15,.13,12,'glass');
  ring(pieces,3.08,3.105,.15,.10,12,'stone');
  ring(pieces,3.105,3.28,.066,.048,8,'accent');
  for(let i=0;i<6;i++) ring(pieces,3.28+i*.105,3.28+(i+1)*.105,.044-i*.005,.039-i*.005,8,i%2?'accent':'stone');
  ring(pieces,3.91,4,.014,0,8,'accent');
  return clean({id:'tokyo-tower',name:'Tokyo Tower',city:'Tokyo, Japan',heightMeters:333,reference:'https://en.tokyotower.co.jp/plan/towerpedia/',pieces});
}
function marina() {
  const pieces=[];
  box(pieces,0,0,0,2.69,.07,.91,'stone');
  // Separate towers retain the two large urban windows; each splays in depth at its foot.
  for(const [k,x] of [-.92,-.10,.72].entries()) {
    const h=3.70,rows=26;
    const profile=t=>({w:.43+.065*t,d:.73-.31*Math.min(1,t*2.5),z:.08*(1-t)*(k===0?1.4:1)});
    for(let j=0;j<rows;j++) {
      const t=j/rows,u=(j+1)/rows,a=profile(t),b=profile(u),y=.07+t*h;
      shell(pieces,y,.07+u*h,a.w,b.w,a.d,b.d,x,a.z,b.z,'glass');
      if(j%2===0) shell(pieces,y,y+.013,a.w+.013,a.w+.013,a.d+.012,a.d+.012,x,a.z,a.z,'stone');
    }
    // Continuous contrasting structural edge strips, segmented for the construction sequence.
    for(let j=0;j<4;j++) {
      const t=j/4,u=(j+1)/4,a=profile(t),b=profile(u);
      const c=corners(.07+t*h,a.w,a.d,x,a.z),d=corners(.07+u*h,b.w,b.d,x,b.z);
      for(let side=0;side<4;side++) beam(pieces,c[side],d[side],.009,'steel');
    }
  }
  // Boat-like SkyPark: rounded stern and long asymmetric tapered cantilever at the north end.
  const outline=[[-1.47,0],[-1.39,-.17],[-1.20,-.235],[-.72,-.25],[.2,-.25],[.95,-.22],[1.30,-.15],[1.47,-.045],[1.47,.045],[1.30,.15],[.95,.22],[.2,.25],[-.72,.25],[-1.20,.235],[-1.39,.17]];
  for(let i=0;i<outline.length;i++) {
    const j=(i+1)%outline.length,[x,z]=outline[i],[xx,zz]=outline[j];
    quad(pieces,[x*.96,3.76,z*.65],[xx*.96,3.76,zz*.65],[xx,3.88,zz],[x,3.88,z],'stone');
    pieces.push(triangle([0,3.88,0],[x,3.88,z],[xx,3.88,zz],'accent'));
    pieces.push(triangle([0,3.72,0],[xx*.96,3.76,zz*.65],[x*.96,3.76,z*.65],'steel'));
  }
  box(pieces,-.27,3.885,-.10,1.35,.015,.13,'glass'); // infinity pool
  box(pieces,-.65,3.90,.07,.45,.085,.18,'glass');
  box(pieces,-.65,3.985,.07,.50,.015,.22,'stone');
  box(pieces,.26,3.90,.06,.33,.085,.19,'glass');
  box(pieces,.26,3.985,.06,.38,.015,.23,'stone');
  return clean({id:'marina-bay-sands',name:'Marina Bay Sands',city:'Singapore',heightMeters:200,reference:'https://www.safdiearchitects.com/projects/marina-bay-sands-hotel-and-skypark',pieces});
}
export function asianLandmarks() { return [pearl(),taipei(),tokyo(),marina()]; }
