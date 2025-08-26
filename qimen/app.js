// --- 幾何佈局（五行在圓周上） ---
const svg = document.getElementById('board');
const cx = 300, cy = 300, R = 200;
const elements = ["木","火","土","金","水"]; // 逆時針排列
// 定義「木的相對位」= 在圓上與木對直的點（此處簡化為元素索引+2）
const oppositeIndex = (idx) => (idx + 2) % elements.length;

// 為每個元素建立節點與三個擺放槽位
const state = {
  slots: [],     // [{ex,ey,beads:[{id,elIdx}], elIdx}]
  beads: [],     // 全部棋珠
  history: []    // 用於撤銷
};

function drawBoard() {
  svg.innerHTML = "";
  // 五角連線
  const pts = elements.map((_,i) => {
    const a = -Math.PI/2 + i*(2*Math.PI/5);
    return [cx+R*Math.cos(a), cy+R*Math.sin(a)];
  });
  const poly = document.createElementNS("http://www.w3.org/2000/svg","polygon");
  poly.setAttribute("points", pts.map(p=>p.join(",")).join(" "));
  poly.setAttribute("fill","#fafafa");
  poly.setAttribute("stroke","#ccc");
  svg.appendChild(poly);

  // 節點＋槽位
  pts.forEach((p, elIdx) => {
    const [x,y] = p;
    // 節點圓
    const n = circle(x,y,26,"#eaeaea","#bbb");
    svg.appendChild(n);
    // 標籤
    const label = text(x, y-36, elements[elIdx]);
    label.setAttribute("class","node-label");
    svg.appendChild(label);

    // 三個槽位（扇形內側一條線上）
    for(let i=0;i<3;i++){
      const sx = x + (i-1)*18;
      const sy = y + 46;
      const slot = circle(sx, sy, 14, "#eee","#bbb");
      slot.classList.add("slot");
      svg.appendChild(slot);
      state.slots.push({x:sx,y:sy,elIdx, beads:[]});
    }
  });
}

function circle(x,y,r,fill,stroke){
  const c = document.createElementNS("http://www.w3.org/2000/svg","circle");
  c.setAttribute("cx",x); c.setAttribute("cy",y);
  c.setAttribute("r",r); c.setAttribute("fill",fill);
  if(stroke){ c.setAttribute("stroke",stroke); }
  return c;
}
function text(x,y,str){
  const t = document.createElementNS("http://www.w3.org/2000/svg","text");
  t.setAttribute("x",x); t.setAttribute("y",y);
  t.textContent = str;
  return t;
}

// 初始化：每屬性先放 2 顆珠
let beadIdSeq = 1;
function initBeads(){
  elements.forEach((_, elIdx) => {
    for(let i=0;i<2;i++){
      const slot = pickFreeSlot(elIdx) || state.slots.find(s=>s.elIdx===elIdx);
      addBead(slot, elIdx);
    }
  });
}
function pickFreeSlot(elIdx){
  return state.slots.filter(s=>s.elIdx===elIdx && s.beads.length===0)[0] || null;
}
function addBead(slot, elIdx){
  const id = beadIdSeq++;
  const b = circle(slot.x, slot.y, 10, colorFor(elIdx), "#666");
  b.classList.add("bead");
  b.dataset.id = id;
  b.dataset.elIdx = elIdx;
  b.addEventListener("click", ()=>toggleSelect(id));
  svg.appendChild(b);
  const beadObj = {id, elIdx, x:slot.x, y:slot.y, slotRef:slot};
  slot.beads.push(beadObj);
  state.beads.push(beadObj);
}
function colorFor(elIdx){
  return ["#43a047","#e53935","#8d6e63","#546e7a","#1e88e5"][elIdx];
}

// 選取/移動
let selected = new Set();
function toggleSelect(id){
  const el = svg.querySelector(`.bead[data-id="${id}"]`);
  if(selected.has(id)){ selected.delete(id); el.classList.remove("selected"); }
  else { selected.add(id); el.classList.add("selected"); }
}
function moveBeadToSlot(bead, slot){
  // 從舊槽移除
  bead.slotRef.beads = bead.slotRef.beads.filter(x=>x.id!==bead.id);
  // 記錄歷史
  state.history.push({type:"move", beadId:bead.id, from:bead.slotRef, to:slot});
  // 指向新槽（可溢出＝不限制數量）
  bead.slotRef = slot;
  bead.x = slot.x; bead.y = slot.y;
  const el = svg.querySelector(`.bead[data-id="${bead.id}"]`);
  el.setAttribute("cx", slot.x);
  el.setAttribute("cy", slot.y);
  slot.beads.push(bead);
}

// 能力：四屬各選1珠 → 木的相對位（可溢出）
// 這裡示範：從 火/土/金/水 各自自動挑一顆（若已選取則用選取），移到「木的相對元素」的第一個槽位（可疊放）
function abilityMoveToWoodOpp(){
  const woodIdx = elements.indexOf("木");
  const targetIdx = oppositeIndex(woodIdx);
  const targetSlot = state.slots.find(s=>s.elIdx===targetIdx); // 單一槽示範（可溢出）

  const poolIdx = elements.map((_,i)=>i).filter(i=>i!==woodIdx); // 排除木本身＝四屬
  // 若玩家已手動選了，優先用選取；否則自動挑第一顆
  const toMove = [];
  poolIdx.forEach(i=>{
    const selectedBead = [...selected]
      .map(id=>state.beads.find(b=>b.id===id))
      .find(b=>b && b.elIdx===i);
    if(selectedBead) toMove.push(selectedBead);
    else {
      const any = state.beads.find(b=>b.elIdx===i);
      if(any) toMove.push(any);
    }
  });

  if(toMove.length===0){ setHint("沒有可移動的珠。"); return; }

  toMove.forEach(b=> moveBeadToSlot(b, targetSlot));
  selected.clear();
  svg.querySelectorAll(".bead.selected").forEach(e=>e.classList.remove("selected"));
  setHint(`已將 ${toMove.length} 顆珠移至「${elements[targetIdx]}」（木的相對位）。`);
}

function setHint(msg){ document.getElementById("hint").textContent = msg; }

// 撤銷
function undo(){
  const last = state.history.pop();
  if(!last) return;
  if(last.type==="move"){
    const bead = state.beads.find(b=>b.id===last.beadId);
    // 從現在的槽移除
    bead.slotRef.beads = bead.slotRef.beads.filter(x=>x.id!==bead.id);
    // 回到 from
    bead.slotRef = last.from;
    bead.x = last.from.x; bead.y = last.from.y;
    const el = svg.querySelector(`.bead[data-id="${bead.id}"]`);
    el.setAttribute("cx", bead.x);
    el.setAttribute("cy", bead.y);
    last.from.beads.push(bead);
  }
}

document.getElementById("abilityMoveToWoodOpp").addEventListener("click", abilityMoveToWoodOpp);
document.getElementById("undoBtn").addEventListener("click", undo);

// 啟動
drawBoard();
initBeads();
setHint("點擊棋珠可選取（橘框）。按鈕可示範能力。");
