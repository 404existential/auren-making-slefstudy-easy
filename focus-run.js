const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
const scoreEl=document.getElementById('score'),bestEl=document.getElementById('best'),speedEl=document.getElementById('speed'),topScore=document.getElementById('scoreTop');
const start=document.getElementById('start'),over=document.getElementById('gameOver'),finalScore=document.getElementById('finalScore'),finalBest=document.getElementById('finalBest');
let W,H,dpr,playing=false,last=0,score=0,best=Number(localStorage.getItem('aurenFocusBest')||0),speed=1,spawn=0,items=[],particles=[],lane=1,jump=0,vy=0;
bestEl.textContent=best;
function resize(){dpr=Math.min(devicePixelRatio||1,2);W=canvas.clientWidth;H=canvas.clientHeight;canvas.width=W*dpr;canvas.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0)}addEventListener('resize',resize);resize();
function road(){return {x:W*.18,w:W*.64,top:35,bottom:H+40}}
function laneX(n,y){const r=road(),pers=(y-r.top)/(r.bottom-r.top),width=r.w*(.42+.58*pers);return r.x+r.w/2+(n-1)*width/3}
function spawnItem(){const type=Math.random()<.27?'focus':'block';items.push({lane:Math.floor(Math.random()*3),y:-80,type,h:55+Math.random()*30,passed:false})}
function reset(){score=0;speed=1;spawn=0;items=[];particles=[];lane=1;jump=0;vy=0;playing=true;start.classList.add('hidden');over.classList.add('hidden');last=performance.now();requestAnimationFrame(loop)}
function end(){playing=false;best=Math.max(best,Math.floor(score));localStorage.setItem('aurenFocusBest',best);finalScore.textContent=Math.floor(score);finalBest.textContent=best;over.classList.remove('hidden')}
function move(dir){if(!playing)return;lane=Math.max(0,Math.min(2,lane+dir))}
function jumpNow(){if(playing&&jump===0){vy=-760;jump=1}}
addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight',' ','a','d','A','D'].includes(e.key))e.preventDefault();if(e.key==='ArrowLeft'||e.key==='a'||e.key==='A')move(-1);if(e.key==='ArrowRight'||e.key==='d'||e.key==='D')move(1);if(e.key===' ')jumpNow();if(e.key==='Enter'&&!playing)reset()});
let touchX=0;canvas.addEventListener('touchstart',e=>touchX=e.touches[0].clientX,{passive:true});canvas.addEventListener('touchend',e=>{let dx=e.changedTouches[0].clientX-touchX;if(Math.abs(dx)>35)move(dx>0?1:-1);else jumpNow()},{passive:true});
document.getElementById('startBtn').onclick=reset;document.getElementById('againBtn').onclick=reset;
function draw(){ctx.clearRect(0,0,W,H);const r=road();
ctx.fillStyle='#c9c3b7';ctx.fillRect(0,0,W,H);ctx.fillStyle='#a9a39a';ctx.beginPath();ctx.moveTo(W*.34,0);ctx.lineTo(W*.66,0);ctx.lineTo(W*.92,H);ctx.lineTo(W*.08,H);ctx.closePath();ctx.fill();
ctx.fillStyle='#e9e5dd';ctx.beginPath();ctx.moveTo(r.x,0);ctx.lineTo(r.x+r.w,0);ctx.lineTo(W*.88,H);ctx.lineTo(W*.12,H);ctx.closePath();ctx.fill();
ctx.strokeStyle='#17171622';ctx.lineWidth=2;for(let n=1;n<3;n++){ctx.beginPath();ctx.moveTo(W*.34+n*W*.16,0);ctx.lineTo(W*.5+(n-1)*W*.38,H);ctx.stroke()}
for(let y=70;y<H;y+=75){let yy=(y+(score*3)%75);ctx.strokeStyle='#17171618';ctx.beginPath();ctx.moveTo(W*.22,yy);ctx.lineTo(W*.78,yy);ctx.stroke()}
items.forEach(o=>{let x=laneX(o.lane,o.y),s=.55+o.y/H*.8;ctx.save();ctx.translate(x,o.y);ctx.scale(s,s);if(o.type==='focus'){ctx.fillStyle='#713636';ctx.beginPath();ctx.arc(0,0,20,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f4f1ea';ctx.font='700 16px DM Sans';ctx.textAlign='center';ctx.fillText('✦',0,6)}else{ctx.fillStyle='#171716';ctx.fillRect(-25,-30,50,60);ctx.fillStyle='#f4f1ea';ctx.font='700 9px DM Sans';ctx.textAlign='center';ctx.fillText('NOISE',0,4)}ctx.restore()});
let px=laneX(lane,H*.84);let py=H*.84-jump;ctx.save();ctx.translate(px,py);ctx.fillStyle='#171716';ctx.beginPath();ctx.arc(0,-30,14,0,Math.PI*2);ctx.fill();ctx.fillRect(-13,-15,26,38);ctx.fillStyle='#713636';ctx.fillRect(-12,22,9,22);ctx.fillRect(3,22,9,22);ctx.restore();
}
function loop(t){if(!playing)return;let dt=Math.min((t-last)/1000,.035);last=t;speed=Math.min(2.6,1+score/1100);speedEl.textContent=speed.toFixed(1)+'x';score+=dt*12*speed;spawn-=dt;if(spawn<=0){spawnItem();spawn=Math.max(.34,1.05-score/2500)}if(jump){jump+=vy*dt;vy+=2100*dt;if(jump<=0){jump=0;vy=0}}
items.forEach(o=>o.y+=dt*390*speed);items=items.filter(o=>{if(o.y>H+100)return false;let near=Math.abs(o.y-H*.84)<55;if(near&&!o.passed){o.passed=true;if(o.lane===lane&&jump<38){if(o.type==='focus'){score+=75;for(let i=0;i<10;i++)particles.push({x:laneX(lane,o.y),y:o.y,vx:(Math.random()-.5)*160,vy:-Math.random()*180,life:1})}else end()}}return playing});particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=300*dt;p.life-=dt});particles=particles.filter(p=>p.life>0);scoreEl.textContent=Math.floor(score);topScore.textContent=String(Math.floor(score)).padStart(6,'0');draw();particles.forEach(p=>{ctx.globalAlpha=p.life;ctx.fillStyle='#713636';ctx.fillRect(p.x,p.y,4,4);ctx.globalAlpha=1});requestAnimationFrame(loop)}
draw();
