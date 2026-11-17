(function(root,factory){
  if(typeof module==='object') module.exports=factory(); else root.Typetris=factory();
})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  const WORDS=typeof module==='object'?require('./corpus.js'):globalThis.TypetrisWords;
  const PATTERNS=[];
  // Technique multiplier: 1x for combo 0–4, 2x for 5–9, 3x thereafter.
  // Pending-token bonuses = base * multiplier: column ceil(peak/2), level 2,
  // fullclear 8, rebuild 8. A rebuilt column's base is ceil(4/2) = 2.
  // Downstack words still add one ordinary token. Ghost matches instead build
  // one tile per two distinct words and earn only column/rebuild bonuses.
  const comboMultiplier=combo=>Math.min(3,1+Math.floor(Math.max(0,combo)/5));
  class Match {
    constructor({random=Math.random,practice=false}={}) {
      this.random=random;this.practice=practice;
      this.elapsed=0;this.characters=0;this.keystrokes=0;this.errors=0;
      this.sent=0;this.score=0;this.bestCombo=0;this.events=[];this.cpuClock=0;
      this.status='playing';this.endReason='';this.fullClears=0;
      this.player=this.board();this.cpu=this.board();
    }
    word(extra=[]) {
      const used=new Set([...extra,...(this.player?.words||[]),...(this.cpu?.words||[]),...this.ghostWords(this.player),...this.ghostWords(this.cpu)].filter(Boolean));
      const pool=WORDS.filter(w=>!used.has(w));
      if(!pool.length) throw new Error('Unique word pool exhausted');
      return pool[Math.min(pool.length-1,Math.max(0,Math.floor(this.random()*pool.length)))];
    }
    board() {
      const words=[];
      for(let i=0;i<20;i++) words.push(this.word(words));
      return {words,index:0,done:[],pending:[],combo:0,lines:0,route:[],b2b:0,techniques:0,peaks:[4,4,4,4,4],phase:'downstack',ghosts:[],level:true};
    }
    heights(board){return Array.from({length:5},(_,c)=>board.words.filter((w,i)=>w&&i%5===c).length);}
    technique(board,id,base,column,height){
      const side=board===this.player?'player':'cpu',multiplier=comboMultiplier(board.combo),bonus=base*multiplier;
      board.pending.push(...Array(bonus).fill(column));board.techniques++;
      if(side==='player')this.score+=bonus*100;
      const names={column:'Column clear',level:'Level stack',fullclear:'Full clear',rebuild:'Stack rebuilt'};
      this.events.push({type:'technique',side,id,name:names[id],bonus,column,multiplier,height});
    }
    ghostWords(board=this.player){return (board?.ghosts||[]).flatMap(g=>g.words);}
    typingWords(board=this.player){return board.phase==='upstack'?board.ghosts.flatMap(g=>g.remaining):board.words.filter(Boolean);}
    challenge(board,column){
      const used=new Set([...(this.player?.words||[]),...(this.cpu?.words||[]),...this.ghostWords(this.player),...this.ghostWords(this.cpu)]);
      const pool=WORDS.filter(w=>!used.has(w)),vowels='aeiou',offset=Math.floor(this.random()*5)%5;
      for(let n=0;n<5;n++){
        const vowel=vowels[(offset+n)%5],yes=pool.filter(w=>w.includes(vowel)),no=pool.filter(w=>!w.includes(vowel));
        if(yes.length<2||no.length<2)continue;
        const pick=list=>list.splice(Math.min(list.length-1,Math.max(0,Math.floor(this.random()*list.length))),1)[0];
        const remaining=[pick(yes),pick(yes)],words=[remaining[0],pick(no),remaining[1],pick(no)];
        // Shuffle solutions and decoys together: a fixed position must not bypass reading.
        for(let i=words.length-1;i>0;i--){
          const j=Math.min(i,Math.max(0,Math.floor(this.random()*(i+1))));
          [words[i],words[j]]=[words[j],words[i]];
        }
        return {column,vowel,words,remaining};
      }
      throw new Error('Unique ghost word pool exhausted');
    }
    completeGhost(board,word){
      if(this.status!=='playing'||board.phase!=='upstack')return false;
      const ghost=board.ghosts.find(g=>g.remaining.includes(word));if(!ghost)return false;
      ghost.remaining=ghost.remaining.filter(w=>w!==word);board.combo++;
      if(board===this.player){this.characters+=word.length+1;this.bestCombo=Math.max(this.bestCombo,board.combo);this.score+=100+board.combo*10;this.events.push({type:'combo',value:board.combo});}
      if(ghost.remaining.length)return true;
      const col=ghost.column,side=board===this.player?'player':'cpu';let index=col;
      while(board.words[index])index+=5;
      if(index>=40){this.status=side==='player'?'lost':'won';this.endReason='topout';this.events.push({type:'end',result:this.status});return true;}
      while(board.words.length<=index)board.words.push(null);
      board.words[index]=this.word();board.restored[col]++;board.peaks[col]=Math.max(board.peaks[col],this.heights(board)[col]);
      if(board.restored[col]===4){
        this.technique(board,'column',2,col,4);
      }else board.ghosts[board.ghosts.indexOf(ghost)]=this.challenge(board,col);
      if(board.restored.every(h=>h===4)){
        this.technique(board,'rebuild',8,col,4);board.phase='downstack';board.ghosts=[];board.index=board.words.findIndex(Boolean);
        const heights=this.heights(board);board.level=heights.every(h=>h===heights[0]);
      }else board.index=board.ghosts[0].column;
      return true;
    }
    get target(){return this.player.phase==='upstack'?(this.typingWords().includes(this.player.targetWord)?this.player.targetWord:this.player.ghosts.find(g=>g.column===this.player.index)?.remaining[0]||this.typingWords()[0]||''):this.player.words[this.player.index]||'';}
    select(column){
      if(this.status!=='playing'||!Number.isInteger(column)||column<0||column>4)return false;
      if(this.player.phase==='upstack'){
        if(!this.player.ghosts.find(g=>g.column===column)?.remaining.length)return false;
        this.player.index=column;this.player.targetWord='';return true;
      }
      const index=this.player.words.findIndex((w,i)=>w&&i%5===column);
      if(index<0)return false;this.player.index=index;return true;
    }
    power(){return this.player.pending.length;}
    attack(side='player',column=null){
      const source=this[side],dest=side==='player'?this.cpu:this.player;
      const empty={power:0,blocked:0,sent:0};
      if(this.status!=='playing')return empty;
      const tiles=source.pending.filter(i=>column===null||i%5===column);
      if(!tiles.length)return empty;
      if(column===null){source.route=[];source.b2b=0;}
      source.pending=source.pending.filter(i=>!tiles.includes(i));
      const columns=tiles.map(i=>i%5);
      if(!this.practice) for(const col of columns){
        let index=col;
        while(index<40&&dest.words[index])index+=5;
        if(index>=40){
          this.status=side==='player'?'won':'lost';this.endReason='topout';break;
        }
        while(dest.words.length<=index)dest.words.push(null);
        dest.words[index]=this.word();
        dest.peaks[col]=Math.max(dest.peaks[col],this.heights(dest)[col]);
        const heights=this.heights(dest);dest.level=heights[0]>0&&heights.every(h=>h===heights[0]);
        dest.done=dest.done.filter(i=>i!==index);
      }
      if(side==='player'){this.sent+=this.practice?0:tiles.length;this.score+=tiles.length*50;}
      const hit={power:tiles.length,blocked:0,sent:this.practice?0:tiles.length,columns};
      this.events.push({type:'attack',side,...hit});
      if(this.status!=='playing')this.events.push({type:'end',result:this.status});
      return hit;
    }
    mistake(){
      if(this.status!=='playing')return;
      this.errors++;this.player.combo=0;this.player.route=[];this.player.b2b=0;this.events.push({type:'mistake'});
    }
    get cpuWpm(){return this.wpm+20;}
    get wpm(){return this.elapsed>0?Math.round(this.characters/5/(this.elapsed/60)):0;}
    get accuracy(){return this.keystrokes?Math.max(0,Math.round((this.keystrokes-this.errors)/this.keystrokes*100)):100;}
    tick(seconds,wpm){
      if(this.status!=='playing'||!Number.isFinite(seconds)||seconds<=0)return;
      this.elapsed+=seconds;if(this.practice)return;
      const speed=wpm===undefined?this.cpuWpm:wpm;
      if(!Number.isFinite(speed)||speed<=0)return;
      this.cpuClock+=seconds*speed*5/60;
      let turns=0;
      while(this.status==='playing'&&turns++<100){
        if(this.cpu.phase==='upstack'){
          const word=this.typingWords(this.cpu)[0];if(!word)break;
          const cost=word.length+1;if(this.cpuClock+1e-9<cost)break;
          this.cpuClock-=cost;this.completeGhost(this.cpu,word);continue;
        }
        // CPU deliberately works down one column; it obeys the same spatial rules.
        const candidates=this.cpu.words.map((w,i)=>w?i:-1).filter(i=>i>=0).sort((a,b)=>a%5-b%5||a-b);
        const index=candidates[0];if(index===undefined)break;
        this.cpu.index=index;const cost=this.cpu.words[index].length+1;
        if(this.cpuClock+1e-9<cost)break;
        this.cpuClock-=cost;this.complete(this.cpu,index);
      }
    }
    complete(board,index=board.index){
      if(this.status!=='playing'||board.phase!=='downstack'||!board.words[index])return;
      const word=board.words[index],side=board===this.player?'player':'cpu',col=index%5;
      board.words[index]=null;board.done.push(index);board.pending.push(index);board.combo++;
      board.peaks[col]=Math.max(board.peaks[col],this.heights(board)[col]+1);
      // Slots count upward from the floor. Compact only the cleared column;
      // pending entries are individual attack tokens, not unique slot IDs.
      const remaining=board.words.filter((w,i)=>w&&i%5===col);
      for(let i=col,row=0;i<board.words.length;i+=5,row++)board.words[i]=remaining[row]||null;
      board.index=board.words.findIndex(Boolean);
      if(side==='player'){
        this.characters+=word.length+1;this.bestCombo=Math.max(this.bestCombo,board.combo);
        this.score+=100+board.combo*10;this.events.push({type:'combo',value:board.combo});
      }
      if(!board.words.some((w,i)=>w&&i%5===col)){
        this.technique(board,'column',Math.ceil(board.peaks[col]/2),col,board.peaks[col]);board.peaks[col]=0;
        board.lines++;this.events.push({type:'clear',side,column:col});this.attack(side,col);
      }
      const heights=this.heights(board),equal=heights[0]>0&&heights.every(h=>h===heights[0]);
      if(equal&&!board.level)this.technique(board,'level',2,col,heights[0]);
      board.level=equal;
      if(!board.words.some(Boolean)&&this.status==='playing'){
        this.fullClears+=side==='player'?1:0;
        this.technique(board,'fullclear',8,col,0);
        this.events.push({type:'fullclear',side});
        board.phase='upstack';board.ghosts=[];board.restored=[0,0,0,0,0];
        for(let c=0;c<5;c++)board.ghosts.push(this.challenge(board,c));board.index=0;
      }
    }
    submit(value){
      if(this.status!=='playing')return 'ignored';
      const words=this.typingWords();
      if(value.endsWith(' ')){
        const word=value.slice(0,-1);if(!words.includes(word))return 'mistake';
        if(this.player.phase==='upstack')this.completeGhost(this.player,word);
        else this.complete(this.player,this.player.words.indexOf(word));return 'complete';
      }
      // Let every unused visible bank choice be typed to completion. Vowel
      // eligibility is checked on Space above, not leaked by rejecting prefixes.
      const prefixes=this.player.phase==='upstack'
        ?this.player.ghosts.flatMap(g=>g.words.filter(w=>!w.includes(g.vowel)||g.remaining.includes(w)))
        :words;
      const word=prefixes.find(w=>w.startsWith(value));if(!word)return 'mistake';
      this.player.targetWord=word;
      this.player.index=this.player.phase==='upstack'?this.player.ghosts.find(g=>g.words.includes(word)).column:this.player.words.indexOf(word);
      return 'prefix';
    }
  }
  return {Match,WORDS,PATTERNS,comboMultiplier};
});
