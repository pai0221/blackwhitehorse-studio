const boardEl = document.getElementById('board');
const cells = [...document.querySelectorAll('.cell')];
const youSel = document.getElementById('youSelect');
const levelSel = document.getElementById('levelSelect');
const newBtn = document.getElementById('newGameBtn');
const statusEl = document.getElementById('status');

let board, you, ai, gameOver;

const LINES = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
];

function start() {
  board = Array(9).fill('');
  you = youSel.value;
  ai = you === 'X' ? 'O' : 'X';
  gameOver = false;
  cells.forEach(c => {
    c.textContent = '';
    c.classList.remove('taken','win');
  });
  setStatus(`${you} 執子。點空格落子`);
  // 若玩家選 O，AI 先手
  if (you === 'O') {
    aiTurn();
  }
}

function setStatus(t){ statusEl.textContent = t; }

cells.forEach(cell => {
  cell.addEventListener('click', () => {
    if (gameOver) return;
    const i = +cell.dataset.i;
    if (board[i]) return; // occupied
    move(i, you);
    const result = checkEnd();
    if (result.ended) return endGame(result);

    // AI 回合
    aiTurn();
  });
});

function aiTurn() {
  if (gameOver) return;
  const level = levelSel.value;
  let idx;
  if (level === 'Easy') idx = randomMove(board);
  else if (level === 'Medium') idx = mediumMove(board, ai, you);
  else idx = minimaxRoot(board, ai, you); // Hard
  move(idx, ai);
  const result = checkEnd();
  if (result.ended) return endGame(result);
  setStatus(`輪到你（${you}）`);
}

function move(i, who) {
  board[i] = who;
  cells[i].textContent = who;
  cells[i].classList.add('taken');
}

function checkEnd() {
  for (const [a,b,c] of LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { ended: true, winner: board[a], line: [a,b,c] };
    }
  }
  if (board.every(x => x)) return { ended: true, winner: null };
  return { ended: false };
}

function endGame({winner, line}) {
  gameOver = true;
  if (winner) {
    line.forEach(i => cells[i].classList.add('win'));
    setStatus(`${winner} 勝！按「新局」再來一盤`);
  } else {
    setStatus(`平手！按「新局」再來一盤`);
  }
}

newBtn.addEventListener('click', start);
youSel.addEventListener('change', start);

// ---------- AI 實作 ----------
function randomMove(b){
  const moves = b.map((v,i)=> v? null : i).filter(v=>v!==null);
  return moves[Math.floor(Math.random()*moves.length)];
}

// Medium：有勝先勝，能擋必擋，否則隨機
function mediumMove(b, me, opp){
  // 先看我方致勝
  for (const i of b.map((v,i)=> v? null : i).filter(v=>v!==null)) {
    const bb = b.slice(); bb[i] = me;
    if (isWin(bb, me)) return i;
  }
  // 再擋對手
  for (const i of b.map((v,i)=> v? null : i).filter(v=>v!==null)) {
    const bb = b.slice(); bb[i] = opp;
    if (isWin(bb, opp)) return i;
  }
  // 隨機
  return randomMove(b);
}

function isWin(b, who){
  return LINES.some(([a,b2,c]) => b[a]===who && b[b2]===who && b[c]===who);
}

// Hard：Minimax（完美策略）
function minimaxRoot(b, me, opp){
  let bestScore = -Infinity, bestMove = null;
  for (const i of b.map((v,i)=> v? null : i).filter(v=>v!==null)) {
    const bb = b.slice(); bb[i] = me;
    const score = minimax(bb, false, me, opp, 0);
    if (score > bestScore) { bestScore = score; bestMove = i; }
  }
  return bestMove;
}

function minimax(b, isMax, me, opp, depth){
  const winner = terminalWinner(b);
  if (winner !== null) {
    if (winner === me) return 10 - depth;
    if (winner === opp) return depth - 10;
    return 0; // draw
  }
  if (isMax){
    let best = -Infinity;
    for (const i of b.map((v,i)=> v? null : i).filter(v=>v!==null)) {
      const bb = b.slice(); bb[i] = me;
      best = Math.max(best, minimax(bb, false, me, opp, depth+1));
    }
    return best;
  } else {
    let best = Infinity;
    for (const i of b.map((v,i)=> v? null : i).filter(v=>v!==null)) {
      const bb = b.slice(); bb[i] = opp;
      best = Math.min(best, minimax(bb, true, me, opp, depth+1));
    }
    return best;
  }
}

function terminalWinner(b){
  for (const [a,b2,c] of LINES) {
    if (b[a] && b[a]===b[b2] && b[a]===b[c]) return b[a];
  }
  if (b.every(x=>x)) return 'draw';
  return null;
}

// 啟動
start();
