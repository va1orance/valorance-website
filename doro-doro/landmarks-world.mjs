import {triangle, quad, box, ring, beam, finish} from './geometry.mjs';

// Original low-poly interpretations, not survey/engineering geometry.
const model=(id,name,city,heightMeters,reference,pieces)=>finish({id,name,city,heightMeters,reference,pieces});
const lerp=(a,b,t)=>a+(b-a)*t;

function empireState(){
 const p=[];
 // Broad low podium, asymmetric-in-plan street frontage; seven setback groups.
 const tiers=[ [0,.19,1.20,.54], [.19,.62,1.02,.47], [.62,.80,.89,.43], [.80,.99,.78,.40], [.99,2.73,.66,.36], [2.73,2.99,.56,.32], [2.99,3.17,.43,.28], [3.17,3.30,.31,.23] ];
 for(const [lo,hi,w,d] of tiers){
  box(p,0,lo,0,w,hi-lo,d,'stone');
  // Recessed blue-grey window ribbons between continuous limestone piers.
  const courses=Math.max(1,Math.round((hi-lo)/.19));
  for(let j=0;j<courses;j++){
   const y=lerp(lo,hi,(j+.12)/courses), h=(hi-lo)/courses*.75;
   for(const face of [-1,1]){
    const n=Math.max(3,Math.round(w/.10));
    for(let i=0;i<n;i++){
     const x=-w/2+(i+.5)*w/n, a=w/n*.30,z=face*(d/2+.001);
     quad(p,[x-a,y,z],[x+a,y,z],[x+a,y+h,z],[x-a,y+h,z],'glass');
    }
    const nSide=Math.max(2,Math.round(d/.10));
    for(let i=0;i<nSide;i++){
     const z=-d/2+(i+.5)*d/nSide,a=d/nSide*.30,x=face*(w/2+.001);
     quad(p,[x,y,z-a],[x,y,z+a],[x,y+h,z+a],[x,y+h,z-a],'glass');
    }
   }
  }
 }
 // Observatory parapet, four stepped metal mast stages, cylindrical mooring crown.
 box(p,0,3.29,0,.34,.035,.26,'accent');
 for(let j=0;j<4;j++)box(p,0,3.325+j*.045,0,.26-j*.035,.045,.20-j*.025,'steel');
 ring(p,3.505,3.71,.082,.060,12,'steel');
 ring(p,3.71,3.77,.066,.023,12,'accent');
 ring(p,3.77,4,.019,.004,8,'steel');
 box(p,0,.005,-.278,.14,.13,.018,'accent');
 return model('empire-state-building','Empire State Building','New York',443.2,'https://www.arch2o.com/why-the-empire-state-building-is-an-art-deco-masterpiece/',p);
}

// Three rounded wings tied together with deep re-entrant valleys, not a cone.
function yContour(lengths,core){
 const pts=[];
 for(let k=0;k<3;k++){
  const a=k*Math.PI*2/3, r=lengths[k], half=core*.72;
  const local=(u,v)=>[Math.cos(a)*u-Math.sin(a)*v,Math.sin(a)*u+Math.cos(a)*v];
  pts.push(local(core*.60,-half));
  for(let j=0;j<=4;j++){
   const t=-Math.PI/2+j*Math.PI/4;
   pts.push(local(r+half*Math.cos(t),half*Math.sin(t)));
  }
  pts.push(local(core*.60,half));
 }
 return pts;
}
function burj(){
 const p=[];
 const tierCount=18, top=3.38;
 for(let j=0;j<tierCount;j++){
  const y0=j*top/tierCount,y1=(j+1)*top/tierCount;
  const scale=1-j/tierCount*.83;
  // The three tips retreat sequentially, giving the characteristic spiraling setbacks.
  const lengths=[0,1,2].map(k=>.38*scale*(1-.11*((j+k)%3)));
  const shape=yContour(lengths,.11*scale);
  for(let i=0;i<shape.length;i++){
   const a=shape[i],b=shape[(i+1)%shape.length];
   quad(p,[a[0],y0,a[1]],[b[0],y0,b[1]],[b[0],y1,b[1]],[a[0],y1,a[1]],i%7===0?'steel':'glass');
   p.push(triangle([0,y1,0],[a[0],y1,a[1]],[b[0],y1,b[1]],'steel'));
  }
 }
 // Exposed central core, telescoping steel crown, needle terminating at y=4.
 ring(p,3.38,3.57,.055,.037,12,'glass');
 ring(p,3.57,3.76,.037,.019,12,'steel');
 ring(p,3.76,4,.019,.002,10,'accent');
 return model('burj-khalifa','Burj Khalifa','Dubai',828,'https://www.burjkhalifa.ae/the-tower/architecture-design',p);
}

function operaHouse(){
 const p=[];
 // Sandstone podium and monumental stair ascent along the southern approach.
 box(p,0,0,0,2.66,.17,2.75,'stone');
 box(p,0,.17,.08,2.46,.105,2.36,'stone');
 for(let j=0;j<10;j++)box(p,0,.017*j,-1.46+.042*j,1.67,.017,.082,'stone');
 // Two unequal processions of vaulted sail shells, plus the smaller restaurant roof.
 // Each shell is a tessellated curvilinear triangle with a single springing vertex.
 function shell(cx,z0,w,h,len){
  const n=8,m=8,base=.275;
  const point=(i,j)=>{
   const u=i/n,t=-Math.PI/2+j/m*Math.PI;
   return [cx+w*Math.sin(t)*Math.sin(u*Math.PI/2),base+h*Math.sin(u*Math.PI/2)*Math.cos(t),z0+len*u-.30*len*Math.sin(Math.PI*u)*Math.cos(t)];
  };
  for(let i=0;i<n;i++)for(let j=0;j<m;j++){
   const mat=j===1||j===6?'accent':'stone';
   if(i===0)p.push(triangle(point(0,0),point(1,j),point(1,j+1),mat));
   else quad(p,point(i,j),point(i+1,j),point(i+1,j+1),point(i,j+1),mat);
  }
  // Glazed end wall meets the open parabolic/spherical-inspired roof boundary.
  for(let j=0;j<m;j++)p.push(triangle([cx,base,z0+len],point(n,j+1),point(n,j),'glass'));
 }
 shell(-.52,-.95,.48,1.22,.76);
 shell(-.52,-.55,.51,2.025,1.03);
 shell(-.52,.08,.49,1.68,.94);
 shell(.54,-.90,.44,1.02,.65);
 shell(.54,-.54,.47,1.73,.98);
 shell(.54,.10,.44,1.40,.87);
 shell(.05,.88,.39,.62,.48);
 return model('sydney-opera-house','Sydney Opera House','Sydney',67,'https://www.sydneyoperahouse.com/our-story/the-spherical-solution',p);
}

function greatPyramid(){
 const p=[], rows=30, height=4, half=1.48;
 // Thirty visual course groups stand for the much more numerous original courses.
 // Narrow horizontal terraces separate individually jointed, staggered masonry faces.
 for(let row=0;row<rows;row++){
  const lo=height*row/rows,hi=height*(row+1)/rows;
  const a=half*(1-row/rows), b=half*(1-(row+1)/rows);
  const n=Math.max(1,Math.ceil(5*(1-row/rows)));
  for(let face=0;face<4;face++){
   const rot=([x,y,z])=>{
    const t=face*Math.PI/2;
    return [x*Math.cos(t)-z*Math.sin(t),y,x*Math.sin(t)+z*Math.cos(t)];
   };
   for(let k=0;k<n;k++){
    const gap=.004*(1-row/rows), left=-a+2*a*k/n+gap,right=-a+2*a*(k+1)/n-gap;
    const topLeft=left*b/a,topRight=right*b/a;
    const yTop=hi-.008, mat=row===rows-1?'accent':((row+k+face)%13===0?'accent':'stone');
    if(row===rows-1)p.push(triangle(rot([left,lo,-a]),rot([right,lo,-a]),[0,4,0],mat));
    else {
     quad(p,rot([left,lo,-a]),rot([right,lo,-a]),rot([topRight,yTop,-b]),rot([topLeft,yTop,-b]),mat);
     // Tiny course ledge catches light and reveals construction layering.
     quad(p,rot([topLeft,yTop,-b]),rot([topRight,yTop,-b]),rot([topRight,hi,-b]),rot([topLeft,hi,-b]),'stone');
    }
   }
  }
 }
 return model('great-pyramid-giza','Great Pyramid of Giza','Giza',146.6,'https://en.wikipedia.org/wiki/Great_Pyramid_of_Giza',p);
}

export function worldLandmarks(){return [empireState(),burj(),operaHouse(),greatPyramid()];}
