// 百戰天蟲（Worms）風格 Canvas 版本（新增：按住空白鍵蓄力發射）

const WIDTH = 1280;
const HEIGHT = 720;
const GRAVITY = 900; // 像素/秒^2
const WATER_LEVEL = HEIGHT - 24;
const WALK_DIST_PER_TURN = 140; // 每回合可行走距離（像素）
const TURN_TIME = 28; // 每回合秒數
const AFTER_SHOT_DELAY = 1500; // 飛彈結束到換手的延遲(ms)

// 蓄力參數
const CHARGE_MIN = 20;   // 最小威力
const CHARGE_MAX = 100;  // 最大威力
const CHARGE_TIME = 1.6; // 按住多久到滿蓄力（秒）

// 工具
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
const randRange=(a,b)=>a+Math.random()*(b-a);
const deg2rad=d=>d*Math.PI/180;

// DOM
const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d');
const turnInfoEl=document.getElementById('turnInfo');
const weaponInfoEl=document.getElementById('weaponInfo');
const angleInfoEl=document.getElementById('angleInfo');
const powerInfoEl=document.getElementById('powerInfo');
const windValueEl=document.getElementById('windValue');
const windArrowEl=document.getElementById('windArrow');

// ================= 地形 =================
class Terrain{
  constructor(w,h){
    this.w=w;this.h=h;
    this.canvas=document.createElement('canvas');
    this.canvas.width=w;this.canvas.height=h;
    this.g=this.canvas.getContext('2d');
    this.heightmap=new Float32Array(w);
    this.generate();
  }
  generate(){
    const g=this.g;g.clearRect(0,0,this.w,this.h);
    const base=this.h*0.55;
    const A1=this.h*0.10,F1=randRange(0.004,0.008);
    const A2=this.h*0.06,F2=randRange(0.008,0.015);
    const A3=this.h*0.03,F3=randRange(0.015,0.028);
    for(let i=0;i<this.w;i++){
      const s=Math.sin(i*F1)*A1+Math.sin(i*F2)*A2+Math.sin(i*F3)*A3;
      this.heightmap[i]=clamp(base+s, this.h*0.25,this.h*0.85);
    }
    g.fillStyle='#6b4f2a';g.beginPath();
    g.moveTo(0,this.h);
    for(let i=0;i<this.w;i++) g.lineTo(i,this.heightmap[i]);
    g.lineTo(this.w,this.h);g.closePath();g.fill();
    g.strokeStyle='#6fcf6f';g.lineWidth=3;g.beginPath();
    g.moveTo(0,this.heightmap[0]);
    for(let i=1;i<this.w;i++) g.lineTo(i,this.heightmap[i]);
    g.stroke();
    this.updateImageData();
  }
  updateImageData(){this.img=this.g.getImageData(0,0,this.w,this.h);this.data=this.img.data;}
  isSolid(x,y){x|=0;y|=0;if(x<0||x>=this.w||y<0||y>=this.h)return false;return this.data[(y*this.w+x)*4+3]>10;}
  explode(cx,cy,r){const g=this.g;g.save();g.globalCompositeOperation='destination-out';
    g.beginPath();g.arc(cx,cy,r,0,Math.PI*2);g.fill();g.restore();this.updateImageData();}
  drawTo(destCtx){destCtx.drawImage(this.canvas,0,0);}
}
// ================= 蟲（Worm） =================
class Worm {
  constructor(x,y,color,teamId,name){
    this.x=x;this.y=y;
    this.vx=0;this.vy=0;
    this.radius=10;
    this.color=color;
    this.teamId=teamId;
    this.name=name;
    this.alive=true;
    this.health=100;
    this.facing=1;
    this.aimAngle=-30;
    this.power=CHARGE_MIN; // 初始威力（HUD 顯示用）
  }

  applyDamage(amount){
    if(!this.alive)return;
    this.health=Math.max(0,this.health-Math.round(amount));
    if(this.health<=0)this.alive=false;
  }

  update(dt,terrain){
    if(!this.alive)return;
    this.vy+=GRAVITY*dt;
    this.vx=clamp(this.vx,-260,260);
    this.vy=clamp(this.vy,-1400,1400);
    let nx=this.x+this.vx*dt;
    let ny=this.y+this.vy*dt;

    if(this.y>WATER_LEVEL+80){this.alive=false;return;}

    const steps=5;
    for(let i=0;i<steps;i++){
      const ix=this.x+(nx-this.x)*(i+1)/steps;
      const iy=this.y+(ny-this.y)*(i+1)/steps;
      if(this._collides(terrain,ix,iy)){
        let adjY=iy,found=false;
        for(let up=0;up<20;up++){
          if(!this._collides(terrain,ix,adjY-1)){found=true;break;}
          adjY-=1;
        }
        if(found){this.y=adjY;this.x=ix;if(this.vy>0)this.vy=0;}
        return;
      }else{this.x=ix;this.y=iy;}
    }
  }

  _collides(terrain,x,y){
    const r=this.radius;
    for(let a=0;a<360;a+=22){
      const rx=Math.round(x+Math.cos(a*Math.PI/180)*r);
      const ry=Math.round(y+Math.sin(a*Math.PI/180)*r);
      if(terrain.isSolid(rx,ry))return true;
    }
    return false;
  }

  draw(ctx){
    if(!this.alive)return;
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x,this.y,this.radius,0,Math.PI*2);
    ctx.fillStyle=this.color;ctx.fill();
    // 眼睛
    ctx.fillStyle='#fff';
    ctx.beginPath();ctx.arc(this.x-3,this.y-3,2,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(this.x+3,this.y-3,2,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#222';
    ctx.beginPath();ctx.arc(this.x-3,this.y-3,1,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(this.x+3,this.y-3,1,0,Math.PI*2);ctx.fill();

    // 準星
    const ang=deg2rad(this.aimAngle);
    const dir=this.facing;
    const ax=this.x+Math.cos(ang)*dir*24;
    const ay=this.y+Math.sin(ang)*24;
    ctx.strokeStyle='#ffd166';
    ctx.beginPath();ctx.moveTo(this.x,this.y);ctx.lineTo(ax,ay);ctx.stroke();
    ctx.restore();

    // 血條
    ctx.save();
    ctx.fillStyle='#000';
    ctx.fillRect(this.x-20,this.y-this.radius-16,40,6);
    ctx.fillStyle=(this.teamId===0?'#ff6b6b':'#6ec1ff');
    ctx.fillRect(this.x-20,this.y-this.radius-16,40*(this.health/100),6);
    ctx.restore();
  }
}
// ================= 飛彈 / 手榴彈 =================
class Projectile {
  constructor(x,y,vx,vy,type,wind){
    this.x=x;this.y=y;
    this.vx=vx;this.vy=vy;
    this.type=type;
    this.alive=true;
    this.radius=4;
    this.wind=wind;

    if(type==='bazooka'){
      this.explodeRadius=34;
      this.maxDamage=50;
      this.fuse=null;
      this.bouncy=false;
    }else if(type==='grenade'){
      this.explodeRadius=38;
      this.maxDamage=60;
      this.fuse=3.0;
      this.bouncy=true;
    }else{ // 神聖手榴彈
      this.explodeRadius=52;
      this.maxDamage=85;
      this.fuse=4.0;
      this.bouncy=true;
    }
  }

  update(dt,terrain,worms){
    if(!this.alive)return;
    this.vx+=this.wind*40*dt;
    this.vy+=GRAVITY*dt;
    let nx=this.x+this.vx*dt;
    let ny=this.y+this.vy*dt;

    if(terrain.isSolid(nx|0,ny|0)){
      if(this.type==='bazooka'){this.explode(terrain,worms);return;}
      else if(this.bouncy){
        const hitBelow=terrain.isSolid(this.x|0,(ny+2)|0);
        const hitSide=terrain.isSolid((nx+Math.sign(this.vx)*2)|0,this.y|0);
        if(hitBelow){this.vy*=-0.4;this.vx*=0.7;ny=this.y-1;}
        else if(hitSide){this.vx*=-0.4;this.vy*=0.8;nx=this.x-Math.sign(this.vx)*2;}
        else{this.vx*=-0.3;this.vy*=-0.3;}
      }else{this.explode(terrain,worms);return;}
    }

    if(this.type==='bazooka'){
      for(const w of worms){
        if(!w.alive)continue;
        const dx=nx-w.x,dy=ny-w.y;
        if(dx*dx+dy*dy<=(w.radius+this.radius)**2){this.explode(terrain,worms);return;}
      }
    }

    if(this.fuse!=null){this.fuse-=dt;if(this.fuse<=0){this.explode(terrain,worms);return;}}

    this.x=nx;this.y=ny;
    if(this.y>HEIGHT+200||this.x<-200||this.x>WIDTH+200)this.alive=false;
  }

  explode(terrain,worms){
    if(!this.alive)return;
    this.alive=false;
    terrain.explode(this.x,this.y,this.explodeRadius);
    for(const w of worms){
      if(!w.alive)continue;
      const dx=w.x-this.x,dy=w.y-this.y;
      const d=Math.hypot(dx,dy);
      if(d<=this.explodeRadius+24){
        const dmg=Math.max(0,this.maxDamage*(1-d/(this.explodeRadius+8)));
        w.applyDamage(dmg);
        const k=220;
        if(d>1){w.vx+=(dx/d)*k;w.vy+=(dy/d)*k*-0.4;}
      }
    }
    effects.push(new ExplosionFX(this.x,this.y,this.explodeRadius));
  }

  draw(ctx){
    if(!this.alive)return;
    ctx.save();
    ctx.fillStyle=(this.type==='bazooka'?'#f6bd60':(this.type==='grenade'?'#94d2bd':'#f94144'));
    ctx.beginPath();ctx.arc(this.x,this.y,this.radius,0,Math.PI*2);ctx.fill();
    if(this.fuse!=null){
      ctx.fillStyle='#fff';
      ctx.fillRect(this.x-5,this.y-8,clamp(10*(this.fuse/3),0,10),2);
    }
    ctx.restore();
  }
}

// ================= 爆炸特效 =================
class ExplosionFX {
  constructor(x,y,r){this.x=x;this.y=y;this.r=r;this.t=0;this.duration=0.5;}
  update(dt){this.t+=dt;}
  draw(ctx){
    const p=clamp(this.t/this.duration,0,1);
    const rr=this.r*(0.7+0.6*p);
    const alpha=1-p;
    ctx.save();
    ctx.globalAlpha=alpha;
    const grd=ctx.createRadialGradient(this.x,this.y,rr*0.1,this.x,this.y,rr);
    grd.addColorStop(0,'#fff4e6');
    grd.addColorStop(0.3,'#ffcf6a');
    grd.addColorStop(0.7,'#ff7f50');
    grd.addColorStop(1,'rgba(255,0,0,0)');
    ctx.fillStyle=grd;
    ctx.beginPath();ctx.arc(this.x,this.y,rr,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }
  get alive(){return this.t<this.duration;}
}
// ================= 風 =================
class Wind{
  constructor(){this.value=0;}
  randomize(){this.value=randRange(-1,1);}
  drawHUD(){
    windValueEl.textContent=this.value.toFixed(2);
    windArrowEl.textContent=this.value>0?'⇢':(this.value<0?'⇠':'⇆');
  }
}

// ================= 遊戲控制（含蓄力機制） =================
class Game{
  constructor(){
    this.terrain=new Terrain(WIDTH,HEIGHT);
    this.wind=new Wind();
    this.worms=[];
    this.projectiles=[];
    this.turnIndex=0;
    this.turnTimer=TURN_TIME;
    this.movementBudget=WALK_DIST_PER_TURN;
    this.state='playing'; // 'playing' | 'projectile' | 'waitingNext' | 'gameover'

    // 蓄力狀態
    this.isCharging=false;
    this.chargeT=0;      // 0..1（用於轉換為威力）
    this.chargeHold=0;   // 實際按住秒數（顯示/計算用）

    this.activeWeapon='bazooka';
    this.keys=new Set();
    this.initTeams();
    this.nextTurn(true);
    this.bindInputs();
  }

  initTeams(){
    const positions=[WIDTH*0.15,WIDTH*0.35,WIDTH*0.65,WIDTH*0.85];
    for(let i=0;i<4;i++){
      const x=positions[i]|0;
      const y=this.spawnYFromX(x);
      const teamId=(i<2?0:1);
      const color=(teamId===0?(i===0?'#ff8fa3':'#ff5c8a'):(i===2?'#6ec1ff':'#4ea8de'));
      this.worms.push(new Worm(x,y-20,color,teamId,`W${i+1}`));
    }
  }

  spawnYFromX(x){return (this.terrain.heightmap[x|0]|0)-10;}

  bindInputs(){
    window.addEventListener('keydown',(e)=>{
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','Enter','1','2','3','r','R'].includes(e.key)) e.preventDefault();
      if(this.keys.has(e.key) && e.key===' ') return; // 避免長按重複 keydown
      this.keys.add(e.key);

      if(e.key==='1') this.activeWeapon='bazooka';
      if(e.key==='2') this.activeWeapon='grenade';
      if(e.key==='3') this.activeWeapon='hhg';

      if((e.key==='r'||e.key==='R') && this.state!=='projectile') this.resetTerrainAndPositions();
      if(e.key==='Enter' && this.state==='playing' && !this.isCharging) this.endTurn();

      // 開始蓄力
      if(e.key===' ' && this.state==='playing' && !this.isCharging){
        this.isCharging=true;
        this.chargeT=0;
        this.chargeHold=0;
      }
    });

    window.addEventListener('keyup',(e)=>{
      // 放開空白鍵 -> 以蓄力值發射
      if(e.key===' ' && this.isCharging){
        const w=this.activeWorm;
        if(w){
          const power=CHARGE_MIN+(CHARGE_MAX-CHARGE_MIN)*this.chargeT;
          w.power=power; // 供 HUD 顯示
          this.tryFireWithPower(power);
        }
        this.isCharging=false;
        this.chargeT=0;
        this.chargeHold=0;
      }
      this.keys.delete(e.key);
    });
  }

  resetTerrainAndPositions(){
    this.terrain.generate();
    const xs=[WIDTH*0.15,WIDTH*0.35,WIDTH*0.65,WIDTH*0.85];
    for(let i=0;i<this.worms.length;i++){
      const w=this.worms[i]; if(!w.alive) continue;
      const x=xs[i]|0, y=this.spawnYFromX(x);
      w.x=x; w.y=y-20; w.vx=0; w.vy=0;
    }
  }

  get activeWorm(){
    for(let i=0;i<this.worms.length;i++){
      const w=this.worms[(this.turnIndex+i)%this.worms.length];
      if(w.alive) return w;
    }
    return null;
  }

  nextTurn(first=false){
    this.wind.randomize();
    this.movementBudget=WALK_DIST_PER_TURN;
    this.turnTimer=TURN_TIME;
    this.state='playing';
    if(!first) this.turnIndex=(this.turnIndex+1)%this.worms.length;
    const w=this.activeWorm;
    if(!w){this.state='gameover';return;}
    const enemy=this.worms.find(x=>x.alive && x.teamId!==w.teamId);
    if(enemy) w.facing=(enemy.x>=w.x?1:-1);
    this.updateHUD();
  }

  updateHUD(){
    const w=this.activeWorm; if(!w) return;
    const teamName=(w.teamId===0?'紅隊':'藍隊');
    turnInfoEl.textContent=`回合：${teamName}（${w.name}）剩 ${Math.ceil(this.turnTimer)} 秒`;
    weaponInfoEl.textContent=`武器：${this.activeWeapon==='bazooka'?'火箭筒':(this.activeWeapon==='grenade'?'手榴彈':'神聖手榴彈')}`;
    angleInfoEl.textContent=`角度：${w.aimAngle|0}°`;
    const shownPower=this.isCharging?(CHARGE_MIN+(CHARGE_MAX-CHARGE_MIN)*this.chargeT):w.power;
    powerInfoEl.textContent=`威力：${shownPower|0}`;
    this.wind.drawHUD();
  }

  tryFireWithPower(powerValue){
    if(this.state!=='playing') return;
    const w=this.activeWorm; if(!w) return;
    const ang=deg2rad(w.aimAngle)*w.facing;
    const muzzleV=Math.min(Math.max(powerValue,CHARGE_MIN),CHARGE_MAX)*6;
    const vx=Math.cos(ang)*muzzleV;
    const vy=Math.sin(ang)*muzzleV;
    const px=w.x+Math.cos(ang)*(w.radius+6);
    const py=w.y+Math.sin(ang)*(w.radius+6);
    this.projectiles.push(new Projectile(px,py,vx,vy,this.activeWeapon,this.wind.value));
    this.state='projectile';
  }

  endTurn(){ this.turnIndex=(this.turnIndex+1)%this.worms.length; this.nextTurn(); }

  update(dt){
    if(this.state==='gameover') return;

    const aw=this.activeWorm;
    if(this.state==='playing' && aw && aw.alive){
      this.turnTimer-=dt;
      if(this.turnTimer<=0){this.endTurn();return;}

      // 瞄準
      if(this.keys.has('ArrowUp'))  aw.aimAngle=Math.max(-85,aw.aimAngle-60*dt);
      if(this.keys.has('ArrowDown'))aw.aimAngle=Math.min( 85,aw.aimAngle+60*dt);

      // 蓄力填充（ease-out 手感）
      if(this.isCharging){
        this.chargeHold+=dt;
        const t=Math.max(0,Math.min(1,this.chargeHold/CHARGE_TIME));
        this.chargeT=1-(1-t)*(1-t);
      }

      // 移動（蓄力時鎖移動，避免誤觸）
      let moveDir=0;
      if(this.keys.has('ArrowLeft'))  moveDir-=1;
      if(this.keys.has('ArrowRight')) moveDir+=1;
      if(moveDir!==0 && this.movementBudget>0 && !this.isCharging){
        aw.facing=moveDir;
        const step=70*dt;
        const spend=Math.min(this.movementBudget,step);
        const nx=aw.x+moveDir*spend;
        let ny=aw.y,blocked=false;
        for(let i=0;i<aw.radius;i++){
          if(!this.terrain.isSolid(nx|0,(ny-i)|0)){ny=ny-i;blocked=false;break;}
          blocked=true;
        }
        if(!blocked){aw.x=nx;aw.y=ny;this.movementBudget-=spend;}
      }
      this.updateHUD();
    }

    // 物理更新
    for(const w of this.worms) w.update(dt,this.terrain);
    for(const p of this.projectiles) p.update(dt,this.terrain,this.worms);
    for(const fx of effects) fx.update(dt);

    // 清理
    this.projectiles=this.projectiles.filter(p=>p.alive);
    effects=effects.filter(e=>e.alive);

    // 勝負
    const aliveTeams=new Set(this.worms.filter(w=>w.alive).map(w=>w.teamId));
    if(aliveTeams.size<=1){
      this.state='gameover';
      setTimeout(()=>{
        showOverlay(aliveTeams.size===0?'平局！':(aliveTeams.has(0)?'紅隊勝利！':'藍隊勝利！')+'<br><br>按 R 重生地形繼續玩，或重新整理頁面。');
      },600);
    }

    // 射擊階段結束 -> 延遲換手
    if(this.state==='projectile' && this.projectiles.length===0){
      this.state='waitingNext';
      setTimeout(()=>this.nextTurn(),AFTER_SHOT_DELAY);
    }
  }

  draw(ctx){
    // 背景
    const sky=ctx.createLinearGradient(0,0,0,HEIGHT);
    sky.addColorStop(0,'#2b2d42'); sky.addColorStop(1,'#14213d');
    ctx.fillStyle=sky; ctx.fillRect(0,0,WIDTH,HEIGHT);
    // 遠山
    ctx.save();ctx.globalAlpha=0.25;ctx.fillStyle='#0e1726';
    for(let i=0;i<8;i++){
      const bx=i*180+60, by=HEIGHT*0.72+((i%2)*20);
      ctx.beginPath();ctx.moveTo(bx-120,by);ctx.lineTo(bx,by-140);ctx.lineTo(bx+140,by);ctx.closePath();ctx.fill();
    }
    ctx.restore();
    // 水面
    ctx.fillStyle='#31587a';ctx.fillRect(0,WATER_LEVEL,WIDTH,HEIGHT-WATER_LEVEL);
    // 地形 / 物件
    this.terrain.drawTo(ctx);
    for(const p of this.projectiles) p.draw(ctx);
    for(const w of this.worms) w.draw(ctx);
    for(const fx of effects) fx.draw(ctx);

    // 移動距離條
    const aw=this.activeWorm;
    if(aw && this.state!=='gameover'){
      const mm=this.movementBudget/WALK_DIST_PER_TURN;
      ctx.save();
      ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.fillRect(12,HEIGHT-36,240,14);
      ctx.fillStyle='#a0c4ff'; ctx.fillRect(12,HEIGHT-36,240*mm,14);
      ctx.strokeStyle='#e0e0e0'; ctx.strokeRect(12,HEIGHT-36,240,14);
      ctx.font='12px system-ui'; ctx.fillStyle='#fff';
      ctx.fillText('本回合剩餘移動距離',14,HEIGHT-42);
      ctx.restore();
    }

    // 蓄力條（底部中間）
    if(this.state==='playing' && this.isCharging){
      const w=340,h=18;
      const x=(WIDTH-w)/2,y=HEIGHT-48;
      const t=this.chargeT;
      ctx.save();
      ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.fillRect(x,y,w,h);
      const grd=ctx.createLinearGradient(x,y,x+w,y);
      grd.addColorStop(0,'#ffd166'); grd.addColorStop(1,'#ef476f');
      ctx.fillStyle=grd; ctx.fillRect(x,y,Math.floor(w*t),h);
      ctx.strokeStyle='#e0e0e0'; ctx.strokeRect(x,y,w,h);
      ctx.font='12px system-ui'; ctx.fillStyle='#fff';
      ctx.fillText('按住空白鍵蓄力，放開發射',x,y-6);
      ctx.restore();
    }
  }
}

// ================= 全域：主迴圈 / 尺寸自適應 =================
let game=null;
let effects=[];

function showOverlay(html){
  const ov=document.getElementById('overlay');
  ov.innerHTML=`<div>${html}</div>`;
  ov.classList.remove('hidden');
  setTimeout(()=>ov.classList.add('hidden'),2800);
}

function start(){
  game=new Game();
  let last=performance.now();
  function frame(now){
    const dt=Math.min(0.033,(now-last)/1000);
    last=now;
    game.update(dt);
    game.draw(ctx);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
start();

// 維持畫面比例
function resizeCanvasToFit(){
  const wrapW=window.innerWidth, wrapH=window.innerHeight;
  const scale=Math.min(wrapW/WIDTH, wrapH/HEIGHT);
  const w=Math.floor(WIDTH*scale), h=Math.floor(HEIGHT*scale);
  const c=document.getElementById('game');
  c.style.width=w+'px'; c.style.height=h+'px';
}
window.addEventListener('resize',resizeCanvasToFit);
resizeCanvasToFit();
