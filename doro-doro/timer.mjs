const MODES=['focus','short','long'];
const validDurations=d=>d&&MODES.every(k=>Number.isInteger(d[k])&&d[k]>=1&&d[k]<=180);
export class Timer {
 constructor(){this.mode='focus';this.durations={focus:25,short:5,long:15};this.left=1500000;this.running=false;this.deadline=null;this.completed=0;}
 remaining(now=Date.now()){return this.running?Math.max(0,this.deadline-now):this.left;}
 start(now=Date.now()){if(!this.running){this.deadline=now+this.left;this.running=true;}}
 pause(now=Date.now()){this.left=this.remaining(now);this.running=false;this.deadline=null;}
 select(mode){if(!MODES.includes(mode))throw new Error('Invalid mode');this.mode=mode;this.reset();}
 reset(){this.left=this.durations[this.mode]*60000;this.running=false;this.deadline=null;}
 next(){return this.mode==='focus'?(this.completed>0&&this.completed%4===0?'long':'short'):'focus';}
 skip(){this.select(this.next());}
 tick(now=Date.now()){if(!this.running||this.remaining(now)>0)return false;if(this.mode==='focus')this.completed++;this.select(this.next());return true;}
 configure(d){if(!validDurations(d))throw new Error('Use whole minutes between 1 and 180');this.durations={...d};this.reset();}
 serialize(){return {mode:this.mode,durations:{...this.durations},left:this.left,running:this.running,deadline:this.deadline,completed:this.completed};}
 static restore(s){const t=new Timer();if(!s||!MODES.includes(s.mode)||!validDurations(s.durations)||typeof s.running!=='boolean'||!Number.isInteger(s.completed)||s.completed<0||!Number.isFinite(s.left)||s.left<0||s.left>s.durations[s.mode]*60000||(s.running&&!Number.isFinite(s.deadline))||(!s.running&&s.deadline!==null))return t;Object.assign(t,{mode:s.mode,durations:{...s.durations},left:s.left,running:s.running,deadline:s.deadline,completed:s.completed});return t;}
}
