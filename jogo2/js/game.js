(()=>{'use strict';
const c=document.querySelector('#game'),ctx=c.getContext('2d');let W=960,H=480,scale=1;
function resize(){const r=c.getBoundingClientRect();c.width=W;c.height=H;}resize();addEventListener('resize',resize);
const girl=new Image(),girl2=new Image(),cdj=new Image();girl.src='assets/girl.png';girl2.src='assets/girl_alt.png';cdj.src='assets/cdj.png';
let keys={},touch=null,shots=[],enemies=[],sparks=[],score=0,best=+(localStorage.spaceImpactBest||0),lives=3,frame=0,spawn=0,paused=false,over=false,muted=true;
const player={x:105,y:240,w:55,h:58,speed:4.4,inv:0};
addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase()))e.preventDefault();if(e.key===' '&&over)restart();if(e.key.toLowerCase()==='p')paused=!paused;if(e.key.toLowerCase()==='m')muted=!muted});
addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
c.addEventListener('pointerdown',e=>{touch={x:e.offsetX/c.clientWidth*W,y:e.offsetY/c.clientHeight*H};shoot();});
c.addEventListener('pointermove',e=>{if(e.buttons&&touch)touch={x:e.offsetX/c.clientWidth*W,y:e.offsetY/c.clientHeight*H}});
function shoot(){if(!over&&!paused)shots.push({x:player.x+45,y:player.y+26,v:8});}
function restart(){score=0;lives=3;shots=[];enemies=[];sparks=[];spawn=0;over=false;player.y=H/2;player.inv=0;}
function enemy(){enemies.push({x:W+30,y:35+Math.random()*(H-100),w:62,h:34,v:2.2+Math.min(score/400,3),hp:1});}
function boom(x,y){for(let i=0;i<12;i++)sparks.push({x,y,vx:(Math.random()-.5)*5,vy:(Math.random()-.5)*5,t:18+Math.random()*15});}
function hit(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
function update(){frame++;if(paused||over)return;
let dx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),dy=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);
if(touch){player.x+=(touch.x-player.x-25)*.12;player.y+=(touch.y-player.y-25)*.12}
player.x=Math.max(15,Math.min(W-90,player.x+dx*player.speed));player.y=Math.max(48,Math.min(H-75,player.y+dy*player.speed));
if(keys[' ' ]&&frame%9===0)shoot();if(player.inv>0)player.inv--;
shots.forEach(s=>s.x+=s.v);shots=shots.filter(s=>s.x<W+20);
if(++spawn>Math.max(22,68-score/35)){enemy();spawn=0}
enemies.forEach(e=>{e.x-=e.v;e.y+=Math.sin(frame/20+e.x/60)*.55});
for(let e of enemies){for(let s of shots){if(!s.dead&&hit({x:s.x,y:s.y-2,w:12,h:4},e)){s.dead=true;e.hp--;boom(e.x,e.y+15);score+=10}}
if(e.hp<=0)e.dead=true;if(!e.dead&&player.inv===0&&hit({x:player.x+8,y:player.y+10,w:35,h:42},e)){e.dead=true;lives--;player.inv=70;boom(player.x+25,player.y+25);if(lives<=0){over=true;best=Math.max(best,score);localStorage.spaceImpactBest=best}}
if(e.x<-90)e.dead=true}
shots=shots.filter(s=>!s.dead);enemies=enemies.filter(e=>!e.dead);
sparks.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.t--});sparks=sparks.filter(p=>p.t>0);
}
function text(t,x,y,size=16,align='left'){ctx.font=`${size}px monospace`;ctx.textAlign=align;ctx.fillStyle='#fff';ctx.fillText(t,x,y)}
function draw(){ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);
// stars
for(let i=0;i<90;i++){let x=(i*137+frame*(i%3+1)*.35)%W,y=(i*71)%H;ctx.fillStyle=i%5?'#333':'#aaa';ctx.fillRect(x,y,1.5,1.5)}
ctx.strokeStyle='#333';ctx.strokeRect(12,12,W-24,H-24);
text('TECHGOTH',28,34,18);text('SPACE IMPACT.exe',28,52,10);
text('SCORE '+String(score).padStart(5,'0'),W-28,32,14,'right');text('HI '+String(best).padStart(5,'0'),W-28,49,10,'right');
text('♥ '.repeat(lives),28,75,16);
ctx.globalAlpha=player.inv&&frame%8<4?.3:1;
if(girl.complete)ctx.drawImage(frame%18<9?girl:girl2,player.x,player.y,54,56);else{text('◢█◣',player.x,player.y+30,25)}
ctx.globalAlpha=1;
shots.forEach(s=>{ctx.fillStyle='#fff';ctx.fillRect(s.x,s.y,13,3);ctx.fillRect(s.x+4,s.y-2,4,7)});
enemies.forEach(e=>{if(cdj.complete)ctx.drawImage(cdj,e.x,e.y,e.w,e.h);else text('[CDJ]',e.x,e.y+20,18)});
sparks.forEach(p=>{ctx.fillStyle='#fff';ctx.fillRect(p.x,p.y,2,2)});
if(paused||over){ctx.fillStyle='rgba(0,0,0,.72)';ctx.fillRect(0,0,W,H);text(over?'GAME OVER':'PAUSED',W/2,H/2-10,30,'center');text(over?'[ SPACE ] RESTART':'[ P ] RESUME',W/2,H/2+24,14,'center')}
text('WASD MOVE  ·  SPACE FIRE  ·  P PAUSE  ·  M SOUND',W/2,H-20,10,'center');
}
function loop(){update();draw();requestAnimationFrame(loop)}loop();
})();