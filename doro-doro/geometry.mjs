// Shared model primitives. Units: ground y=0, landmark height ~4, width <=3.
export const triangle=(a,b,c,material='stone')=>({vertices:[a,b,c],material,order:(a[1]+b[1]+c[1])/3});
export function quad(out,a,b,c,d,material='stone'){out.push(triangle(a,b,c,material),triangle(a,c,d,material));}
export function box(out,x,y,z,w,h,d,material='stone'){
 const a=[x-w/2,y,z-d/2],b=[x+w/2,y,z-d/2],c=[x+w/2,y,z+d/2],e=[x-w/2,y,z+d/2];const top=p=>[p[0],p[1]+h,p[2]];
 quad(out,a,b,top(b),top(a),material);quad(out,b,c,top(c),top(b),material);quad(out,c,e,top(e),top(c),material);quad(out,e,a,top(a),top(e),material);quad(out,top(a),top(b),top(c),top(e),material);
}
export function ring(out,y0,y1,r0,r1,n=16,material='stone',cx=0,cz=0){for(let i=0;i<n;i++){const a=i/n*Math.PI*2,b=(i+1)/n*Math.PI*2;quad(out,[cx+Math.cos(a)*r0,y0,cz+Math.sin(a)*r0],[cx+Math.cos(b)*r0,y0,cz+Math.sin(b)*r0],[cx+Math.cos(b)*r1,y1,cz+Math.sin(b)*r1],[cx+Math.cos(a)*r1,y1,cz+Math.sin(a)*r1],material);}}
export function sphere(out,cx,cy,cz,r,n=16,bands=10,material='accent'){for(let j=0;j<bands;j++){const a=-Math.PI/2+j/bands*Math.PI,b=-Math.PI/2+(j+1)/bands*Math.PI;for(let i=0;i<n;i++){const u=i/n*Math.PI*2,v=(i+1)/n*Math.PI*2;const p=(t,s)=>[cx+Math.cos(t)*Math.cos(s)*r,cy+Math.sin(t)*r,cz+Math.cos(t)*Math.sin(s)*r];quad(out,p(a,u),p(a,v),p(b,v),p(b,u),material);}}}
export function beam(out,a,b,r=.025,material='steel'){const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],l=Math.hypot(dx,dy,dz)||1;const up=Math.abs(dy/l)<.95?[0,1,0]:[1,0,0];let u=[dy*up[2]-dz*up[1],dz*up[0]-dx*up[2],dx*up[1]-dy*up[0]];const ul=Math.hypot(...u);u=u.map(x=>x/ul*r);const v=[(dy*u[2]-dz*u[1])/l,(dz*u[0]-dx*u[2])/l,(dx*u[1]-dy*u[0])/l];const p=(q,s,t)=>q.map((x,i)=>x+u[i]*s+v[i]*t);for(const [s,t,ss,tt] of [[1,1,-1,1],[-1,1,-1,-1],[-1,-1,1,-1],[1,-1,1,1]])quad(out,p(a,s,t),p(a,ss,tt),p(b,ss,tt),p(b,s,t),material);}
export function finish(model){model.pieces.sort((a,b)=>a.order-b.order);return model;}
