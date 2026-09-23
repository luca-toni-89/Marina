'use strict';
const $=id=>document.getElementById(id);
const screens=['intro','snakeScreen','memoryScreen','tetrisScreen','finalScreen'];
const storageKey='marina-28-progress-v2';
let stage=Math.max(0,Math.min(3,Number(localStorage.getItem(storageKey))||0));
let soundOn=false,audioContext=null;
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;

function tone(freq=440,duration=.12,type='sine',gain=.045){
  if(!soundOn)return;
  try{audioContext??=new (window.AudioContext||window.webkitAudioContext)();const osc=audioContext.createOscillator(),volume=audioContext.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,audioContext.currentTime);volume.gain.setValueAtTime(gain,audioContext.currentTime);volume.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+duration);osc.connect(volume);volume.connect(audioContext.destination);osc.start();osc.stop(audioContext.currentTime+duration)}catch{}
}
function fanfare(){[523,659,784,1047].forEach((f,i)=>setTimeout(()=>tone(f,.25,'triangle',.07),i*115))}
$('soundBtn').addEventListener('click',()=>{soundOn=!soundOn;$('soundBtn').setAttribute('aria-pressed',String(soundOn));$('soundBtn').setAttribute('aria-label',soundOn?'Ton ausschalten':'Ton einschalten');$('soundText').textContent=soundOn?'TON AN':'TON AUS';tone(880,.1)});

function updateTrack(index){const percent=index*25;$('trackFill').style.width=`${percent}%`;$('trackKart').style.left=`${percent}%`;document.querySelectorAll('.stop').forEach((node,i)=>{node.classList.toggle('done',i<index);node.classList.toggle('current',i===index)})}
function showScreen(id){
  clearInterval(snakeTimer);snakeTimer=null;snakeRunning=false;
  clearInterval(tetrisTimer);tetrisTimer=null;tetrisRunning=false;
  screens.forEach(name=>$(name).classList.toggle('active',name===id));
  updateTrack(screens.indexOf(id));
  window.scrollTo({top:0,behavior:reducedMotion?'instant':'smooth'});
}
function startAtSavedStage(){if(stage===3)showScreen('finalScreen');else if(stage===2){showScreen('tetrisScreen');drawTetris()}else if(stage===1){showScreen('memoryScreen');newMemory()}else{showScreen('snakeScreen');drawSnake()}}
$('startBtn').addEventListener('click',startAtSavedStage);
if(stage>0)$('startBtn').querySelector('span').textContent=stage===3?'ZUM GESCHENK':'RENNEN FORTSETZEN';

function confetti(count=60,origin=null){
  const colors=['#9c6bff','#ffdb70','#7dedd2','#fffaff','#f08ab8'];
  for(let i=0;i<count;i++){
    const bit=document.createElement('i');bit.className='particle';
    bit.style.left=`${origin?Math.max(0,Math.min(100,origin.x/window.innerWidth*100+(Math.random()-.5)*45)):Math.random()*100}vw`;
    bit.style.top=origin?`${origin.y}px`:'-20px';bit.style.background=colors[i%colors.length];bit.style.borderRadius=i%4===0?'50%':'2px';bit.style.setProperty('--duration',`${1.6+Math.random()*2.2}s`);bit.style.setProperty('--drift',`${(Math.random()-.5)*280}px`);bit.style.animationDelay=`${Math.random()*.45}s`;
    $('particles').appendChild(bit);setTimeout(()=>bit.remove(),4500);
  }
}
function checkpoint(level,title,message){
  stage=Math.max(stage,level);localStorage.setItem(storageKey,String(stage));
  updateTrack(level+1);$('levelTitle').textContent=title;$('levelText').textContent=message;
  $('nextStage').querySelector('span').textContent=level===3?'ZUM GESCHENK':'WEITER ZUM NÄCHSTEN';
  $('levelOverlay').hidden=false;confetti(75);fanfare();$('nextStage').focus();
}
$('nextStage').addEventListener('click',()=>{$('levelOverlay').hidden=true;if(stage===1){showScreen('memoryScreen');newMemory()}else if(stage===2){showScreen('tetrisScreen');drawTetris()}else{showScreen('finalScreen');confetti(95)}});
let counting=false;
function countdown(callback){
  if(counting)return;
  counting=true;
  const layer=$('countdown'),label=$('countdownValue');layer.hidden=false;let value=3;label.textContent=value;tone(420,.09);
  const tick=()=>{value--;if(value>0){label.textContent=value;label.style.animation='none';void label.offsetWidth;label.style.animation='';tone(420,.09);setTimeout(tick,650)}else{label.textContent='GO!';tone(760,.2,'triangle');setTimeout(()=>{layer.hidden=true;counting=false;callback()},reducedMotion?100:430)}};
  setTimeout(tick,reducedMotion?100:650);
}

// Snake: 16 × 16, eight stars, one active direction change per tick.
const snakeCanvas=$('snakeCanvas'),snakeCtx=snakeCanvas.getContext('2d'),snakeSize=25;
let snake=[],snakeFood=null,snakeDir={x:1,y:0},snakeNext={x:1,y:0},snakeScore=0,snakeTimer=null,snakeRunning=false,snakeTurnQueued=false;
function snakeFoodPlace(){const free=[];for(let y=0;y<16;y++)for(let x=0;x<16;x++)if(!snake.some(part=>part.x===x&&part.y===y))free.push({x,y});snakeFood=free[Math.floor(Math.random()*free.length)]}
function drawSnake(){
  const c=snakeCtx;c.fillStyle='#10091f';c.fillRect(0,0,400,400);c.strokeStyle='#4c32724c';c.lineWidth=1;
  for(let i=1;i<16;i++){c.beginPath();c.moveTo(i*25,0);c.lineTo(i*25,400);c.moveTo(0,i*25);c.lineTo(400,i*25);c.stroke()}
  if(snakeFood){const x=(snakeFood.x+.5)*25,y=(snakeFood.y+.5)*25;c.shadowColor='#ffdf74';c.shadowBlur=16;c.fillStyle='#ffdb70';c.font='bold 26px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText('★',x,y+1);c.shadowBlur=0}
  snake.forEach((part,i)=>{const x=part.x*snakeSize+2,y=part.y*snakeSize+2;c.fillStyle=i===0?'#7dedd2':i%2?'#a576ff':'#9363eb';c.beginPath();c.roundRect(x,y,21,21,6);c.fill();if(i===0){c.fillStyle='#271842';c.beginPath();c.arc(x+16,y+7,2.2,0,7);c.fill()}});
}
function snakeStart(){clearInterval(snakeTimer);snake=[{x:5,y:8},{x:4,y:8},{x:3,y:8}];snakeDir={x:1,y:0};snakeNext={x:1,y:0};snakeTurnQueued=false;snakeScore=0;snakeFoodPlace();snakeRunning=true;$('snakeScore').textContent='0 / 8';$('snakeStatus').textContent='Auf geht’s!';$('snakeStatus').className='status';$('snakeStart').textContent='NEU STARTEN ↻';drawSnake();snakeTimer=setInterval(snakeTick,145)}
function snakeTick(){snakeDir=snakeNext;snakeTurnQueued=false;const head={x:snake[0].x+snakeDir.x,y:snake[0].y+snakeDir.y};const eating=head.x===snakeFood.x&&head.y===snakeFood.y;const body=eating?snake:snake.slice(0,-1);if(head.x<0||head.x>=16||head.y<0||head.y>=16||body.some(p=>p.x===head.x&&p.y===head.y)){clearInterval(snakeTimer);snakeRunning=false;$('snakeStatus').textContent='Autsch! Ein neuer Versuch?';$('snakeStatus').className='status bad';tone(150,.28,'sawtooth');return}snake.unshift(head);if(eating){snakeScore++;$('snakeScore').textContent=`${snakeScore} / 8`;tone(520+snakeScore*50,.08,'triangle');const rect=snakeCanvas.getBoundingClientRect();confetti(7,{x:rect.left+(head.x+.5)*rect.width/16,y:rect.top+(head.y+.5)*rect.height/16});if(snakeScore>=8){clearInterval(snakeTimer);snakeRunning=false;drawSnake();$('snakeStatus').textContent='Acht Sterne! Geschafft.';$('snakeStatus').className='status good';setTimeout(()=>checkpoint(1,'SNAKE GESCHAFFT!','Die 30 verliert den Anschluss. Ein Boxenstopp für dein Gedächtnis wartet.'),500);return}snakeFoodPlace();clearInterval(snakeTimer);snakeTimer=setInterval(snakeTick,Math.max(105,145-snakeScore*5))}else snake.pop();drawSnake()}
function snakeDirection(name){if(!snakeRunning||snakeTurnQueued)return;const dirs={up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}};const next=dirs[name];if(next&&(next.x!==-snakeDir.x||next.y!==-snakeDir.y)){snakeNext=next;snakeTurnQueued=true}}
$('snakeStart').addEventListener('click',()=>{clearInterval(snakeTimer);snakeRunning=false;countdown(snakeStart)});
document.querySelectorAll('[data-snake]').forEach(button=>button.addEventListener('click',()=>snakeDirection(button.dataset.snake)));
let snakeTouch=null;snakeCanvas.addEventListener('pointerdown',e=>{snakeTouch={x:e.clientX,y:e.clientY};snakeCanvas.setPointerCapture(e.pointerId)});snakeCanvas.addEventListener('pointerup',e=>{if(!snakeTouch)return;const dx=e.clientX-snakeTouch.x,dy=e.clientY-snakeTouch.y;if(Math.max(Math.abs(dx),Math.abs(dy))>16)snakeDirection(Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up');snakeTouch=null});

// Memory: a single card face keeps taps reliable across browsers and touch devices.
const symbols=['★','◆','☀','♥','♫','⚡','✿','♣'];let memoryDeck=[],memoryOpen=[],memoryPairs=0,memoryTurns=0,memoryLocked=false,memoryTimer=null,memoryGeneration=0;
function shuffle(array){for(let i=array.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[array[i],array[j]]=[array[j],array[i]]}return array}
function newMemory(){
  clearTimeout(memoryTimer);memoryGeneration++;
  memoryDeck=shuffle([...symbols,...symbols]);memoryOpen=[];memoryPairs=0;memoryTurns=0;memoryLocked=false;
  $('memoryPairs').textContent='0 / 8 PAARE';$('memoryTurns').textContent='0 ZÜGE';
  $('memoryStatus').textContent='Dreh zwei Karten um.';$('memoryStatus').className='status';
  $('memoryGrid').replaceChildren();
  memoryDeck.forEach((symbol,index)=>{
    const card=document.createElement('button');card.type='button';card.className='memory-card';card.textContent='M';
    card.setAttribute('aria-label',`Karte ${index+1}, verdeckt`);
    card.addEventListener('click',()=>flipCard(index));$('memoryGrid').append(card);
  });
}
function flipCard(index){
  if(memoryLocked||memoryOpen.includes(index))return;
  const card=$('memoryGrid').children[index];if(!card||card.classList.contains('matched'))return;
  card.textContent=memoryDeck[index];card.classList.add('open');card.setAttribute('aria-label',`Karte ${index+1}, ${memoryDeck[index]}`);
  memoryOpen.push(index);tone(360,.07);
  if(memoryOpen.length!==2)return;
  memoryLocked=true;memoryTurns++;$('memoryTurns').textContent=`${memoryTurns} ZÜGE`;
  const [a,b]=memoryOpen,generation=memoryGeneration;
  if(memoryDeck[a]===memoryDeck[b]){
    memoryTimer=setTimeout(()=>{
      if(generation!==memoryGeneration)return;
      for(const n of [a,b]){const matchedCard=$('memoryGrid').children[n];matchedCard.classList.add('matched');matchedCard.disabled=true}
      memoryPairs++;$('memoryPairs').textContent=`${memoryPairs} / 8 PAARE`;
      memoryOpen=[];tone(720,.12,'triangle');
      if(memoryPairs===8){$('memoryStatus').textContent='Alle acht Paare gefunden!';$('memoryStatus').className='status good';setTimeout(()=>{if(generation===memoryGeneration)checkpoint(2,'MEMORY GESCHAFFT!','Nur noch ein Spiel bis zu deinem Geschenk. Jetzt kommt der Endspurt!')},550)}
      else{memoryLocked=false;$('memoryStatus').textContent='Paar gefunden! Weiter so.';$('memoryStatus').className='status good'}
    },300);
  }else{
    $('memoryStatus').textContent='Nicht gleich – gleich sind sie wieder verdeckt.';$('memoryStatus').className='status';
    memoryTimer=setTimeout(()=>{
      if(generation!==memoryGeneration)return;
      for(const n of [a,b]){const hiddenCard=$('memoryGrid').children[n];hiddenCard.textContent='M';hiddenCard.classList.remove('open');hiddenCard.setAttribute('aria-label',`Karte ${n+1}, verdeckt`)}
      memoryOpen=[];memoryLocked=false;$('memoryStatus').textContent='Wo waren die Symbole?';
    },1050);
  }
}
$('memoryRestart').addEventListener('click',newMemory);

// Tetris: seven-bag randomizer, ghost piece, wall kicks, next piece and six-line finish.
const tc=$('tetrisCanvas'),tctx=tc.getContext('2d'),nc=$('nextCanvas'),nctx=nc.getContext('2d');
const shapes={I:[[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],O:[[1,1],[1,1]],T:[[0,1,0],[1,1,1],[0,0,0]],S:[[0,1,1],[1,1,0],[0,0,0]],Z:[[1,1,0],[0,1,1],[0,0,0]],J:[[1,0,0],[1,1,1],[0,0,0]],L:[[0,0,1],[1,1,1],[0,0,0]]};
const colors={I:'#67dfe8',O:'#ffda70',T:'#ad7bff',S:'#80eac2',Z:'#ff8889',J:'#6c98ff',L:'#ffad6d'};
let board=emptyBoard(),bag=[],active=null,nextType=null,tetrisLines=0,tetrisPoints=0,tetrisTimer=null,tetrisRunning=false,tetrisAlive=false;
function emptyBoard(){return Array.from({length:20},()=>Array(10).fill(null))}
function pullPiece(){if(!bag.length)bag=shuffle(Object.keys(shapes));return bag.pop()}
function createPiece(type){const matrix=shapes[type].map(row=>[...row]);return{type,matrix,x:Math.floor((10-matrix[0].length)/2),y:0}}
function collides(piece,dx=0,dy=0,matrix=piece.matrix){for(let y=0;y<matrix.length;y++)for(let x=0;x<matrix[y].length;x++)if(matrix[y][x]){const nx=piece.x+x+dx,ny=piece.y+y+dy;if(nx<0||nx>=10||ny>=20||(ny>=0&&board[ny][nx]))return true}return false}
function spawnPiece(){active=createPiece(nextType??pullPiece());nextType=pullPiece();drawNext();if(collides(active)){tetrisRunning=false;tetrisAlive=false;clearInterval(tetrisTimer);$('tetrisStatus').textContent='Feld voll! Versuch es nochmal.';$('tetrisStatus').className='status bad';$('tetrisStart').textContent='NEU STARTEN ↻';tone(150,.35,'sawtooth')}}
function resetTetris(){clearInterval(tetrisTimer);board=emptyBoard();bag=[];nextType=null;tetrisLines=0;tetrisPoints=0;tetrisRunning=true;tetrisAlive=true;$('tetrisLines').innerHTML='0 <span>/ 6</span>';$('tetrisScore').textContent='0000';$('tetrisMeter').style.width='0%';$('tetrisStatus').textContent='Räum die Reihen ab!';$('tetrisStatus').className='status';$('tetrisStart').textContent='PAUSE II';spawnPiece();drawTetris();tetrisTimer=setInterval(tetrisTick,580)}
function resumeTetris(){if(!tetrisAlive)return;tetrisRunning=true;$('tetrisStatus').textContent='Weiter geht’s!';$('tetrisStart').textContent='PAUSE II';tetrisTimer=setInterval(tetrisTick,Math.max(240,580-tetrisLines*30))}
function tetrisTick(){if(!tetrisRunning||!active)return;if(!collides(active,0,1))active.y++;else lockPiece();drawTetris()}
function lockPiece(){for(let y=0;y<active.matrix.length;y++)for(let x=0;x<active.matrix[y].length;x++)if(active.matrix[y][x]){const by=active.y+y;if(by>=0)board[by][active.x+x]=active.type}let cleared=0;for(let y=19;y>=0;y--)if(board[y].every(Boolean)){board.splice(y,1);board.unshift(Array(10).fill(null));cleared++;y++}if(cleared){tetrisLines+=cleared;tetrisPoints+=[0,100,300,500,800][cleared];$('tetrisLines').innerHTML=`${tetrisLines} <span>/ 6</span>`;$('tetrisScore').textContent=String(tetrisPoints).padStart(4,'0');$('tetrisMeter').style.width=`${Math.min(100,tetrisLines/6*100)}%`;tone(440+cleared*120,.2,'triangle');const rect=tc.getBoundingClientRect();confetti(10+cleared*8,{x:rect.left+rect.width/2,y:rect.top+rect.height*.45});clearInterval(tetrisTimer);if(tetrisLines>=6){tetrisRunning=false;tetrisAlive=false;$('tetrisStatus').textContent='Sechs Reihen! Ziel erreicht.';$('tetrisStatus').className='status good';setTimeout(()=>checkpoint(3,'FINISH LINE!','Drei Spiele, drei Siege. Dein Geschenk wartet hinter dem Umschlag.'),600);return}tetrisTimer=setInterval(tetrisTick,Math.max(240,580-tetrisLines*30))}spawnPiece()}
function rotateMatrix(matrix){return matrix[0].map((_,x)=>matrix.map(row=>row[x]).reverse())}
function tetrisAction(action){if(!tetrisRunning||!active)return;if(action==='left'&&!collides(active,-1,0))active.x--;if(action==='right'&&!collides(active,1,0))active.x++;if(action==='down'){if(!collides(active,0,1)){active.y++;tetrisPoints++;$('tetrisScore').textContent=String(tetrisPoints).padStart(4,'0')}else lockPiece()}if(action==='rotate'){const rotated=rotateMatrix(active.matrix);for(const kick of [0,-1,1,-2,2])if(!collides(active,kick,0,rotated)){active.x+=kick;active.matrix=rotated;tone(300,.05);break}}if(action==='drop'){let distance=0;while(!collides(active,0,1)){active.y++;distance++}tetrisPoints+=distance*2;$('tetrisScore').textContent=String(tetrisPoints).padStart(4,'0');tone(190,.08,'square');lockPiece()}drawTetris()}
function block(ctx,x,y,size,color,alpha=1){ctx.globalAlpha=alpha;ctx.fillStyle=color;ctx.fillRect(x*size+1,y*size+1,size-2,size-2);ctx.fillStyle='#ffffff55';ctx.fillRect(x*size+3,y*size+3,size-6,3);ctx.strokeStyle='#140b2b66';ctx.strokeRect(x*size+1.5,y*size+1.5,size-3,size-3);ctx.globalAlpha=1}
function drawTetris(){tctx.fillStyle='#10081f';tctx.fillRect(0,0,300,600);tctx.strokeStyle='#5c438236';tctx.lineWidth=1;for(let y=0;y<20;y++)for(let x=0;x<10;x++){tctx.strokeRect(x*30+.5,y*30+.5,30,30);if(board[y][x])block(tctx,x,y,30,colors[board[y][x]])}if(active){let ghost=0;while(!collides(active,0,ghost+1))ghost++;active.matrix.forEach((row,y)=>row.forEach((v,x)=>{if(!v)return;const px=active.x+x,py=active.y+y;if(py+ghost>=0)block(tctx,px,py+ghost,30,colors[active.type],.18);if(py>=0)block(tctx,px,py,30,colors[active.type])}))}}
function drawNext(){nctx.clearRect(0,0,120,100);if(!nextType)return;const m=shapes[nextType],size=24,ox=(120-m[0].length*size)/2,oy=(100-m.length*size)/2;nctx.save();nctx.translate(ox,oy);m.forEach((row,y)=>row.forEach((v,x)=>{if(v)block(nctx,x,y,size,colors[nextType])}));nctx.restore()}
$('tetrisStart').addEventListener('click',()=>{if(tetrisRunning){clearInterval(tetrisTimer);tetrisRunning=false;$('tetrisStatus').textContent='Pause. Atme kurz durch.';$('tetrisStart').textContent='WEITERSPIELEN →'}else if(tetrisAlive)resumeTetris();else countdown(resetTetris)});
document.querySelectorAll('[data-tetris]').forEach(button=>button.addEventListener('click',()=>tetrisAction(button.dataset.tetris)));
let tetrisTouch=null;tc.addEventListener('pointerdown',e=>{tetrisTouch={x:e.clientX,y:e.clientY};tc.setPointerCapture(e.pointerId)});tc.addEventListener('pointerup',e=>{if(!tetrisTouch)return;const dx=e.clientX-tetrisTouch.x,dy=e.clientY-tetrisTouch.y;if(Math.abs(dx)<18&&Math.abs(dy)<18)tetrisAction('rotate');else if(Math.abs(dx)>Math.abs(dy)){const steps=Math.min(5,Math.max(1,Math.round(Math.abs(dx)/24)));for(let i=0;i<steps;i++)tetrisAction(dx>0?'right':'left')}else if(dy>90)tetrisAction('drop');else if(dy>18)tetrisAction('down');tetrisTouch=null});
document.addEventListener('keydown',e=>{if($('levelOverlay').hidden===false||$('countdown').hidden===false)return;if($('snakeScreen').classList.contains('active')){const map={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',a:'left',s:'down',d:'right'};if(map[e.key]){e.preventDefault();snakeDirection(map[e.key])}}else if($('tetrisScreen').classList.contains('active')){const map={ArrowUp:'rotate',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',' ':'drop',w:'rotate',a:'left',s:'down',d:'right'};if(map[e.key]){e.preventDefault();tetrisAction(map[e.key])}}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)return;if(snakeRunning){clearInterval(snakeTimer);snakeRunning=false;$('snakeStatus').textContent='Pausiert – starte die Runde neu.'}if(tetrisRunning){clearInterval(tetrisTimer);tetrisRunning=false;$('tetrisStatus').textContent='Pausiert. Tippe auf Weiterspielen.';$('tetrisStart').textContent='WEITERSPIELEN →'}});

// The envelope opens before the PDF link appears. The PDF remains a normal relative file.
function openGift(){if($('giftScene').classList.contains('open'))return;$('giftScene').classList.add('open');$('giftOpen').disabled=true;$('giftNote').textContent='Nur für dich, Marina. 💜';tone(523,.24,'triangle');setTimeout(()=>tone(659,.24,'triangle'),230);setTimeout(()=>{confetti(115,{x:window.innerWidth/2,y:window.innerHeight*.55});fanfare()},650);setTimeout(()=>{$('giftOpen').hidden=true;$('voucherLink').hidden=false;$('voucherLink').focus()},reducedMotion?850:2200)}
$('giftOpen').addEventListener('click',openGift);$('giftScene').addEventListener('click',openGift);
drawSnake();drawTetris();
