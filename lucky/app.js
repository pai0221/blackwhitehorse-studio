// Lucky Numbers — Web (You vs AI) - standalone (React 18 UMD)
// Author: ChatGPT for 白大俠
(function () {
  const { useEffect, useMemo, useState } = React;

  const N = 4;
  const MINV = 1;
  const MAXV = 20;
  const COPIES = 4;

  function rngShuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i++) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function makeDeck() {
    const deck = [];
    for (let c = 0; c < COPIES; c++) {
      for (let v = MINV; v <= MAXV; v++) deck.push(v);
    }
    return rngShuffle(deck);
  }

  function computeBounds(board, r, c) {
    let left = 0;
    for (let j = c - 1; j >= 0; j--) if (board[r][j] != null) { left = board[r][j]; break; }
    let right = MAXV + 1;
    for (let j = c + 1; j < N; j++) if (board[r][j] != null) { right = board[r][j]; break; }
    let up = 0;
    for (let i = r - 1; i >= 0; i--) if (board[i][c] != null) { up = board[i][c]; break; }
    let down = MAXV + 1;
    for (let i = r + 1; i < N; i++) if (board[i][c] != null) { down = board[i][c]; break; }
    return { left, right, up, down };
  }

  function isValidPlacement(board, r, c, value) {
    const { left, right, up, down } = computeBounds(board, r, c);
    return left < value && value < right && up < value && value < down;
  }

  function deepCloneBoard(b) { return b.map(row => row.slice()); }
  function emptyBoard() { return Array.from({ length: N }, () => Array.from({ length: N }, () => null)); }
  function boardFilled(board) { for (let r=0;r<N;r++) for (let c=0;c<N;c++) if (board[r][c]==null) return false; return true; }
  function countFilled(board) { let t=0; for (let r=0;r<N;r++) for (let c=0;c<N;c++) if (board[r][c]!=null) t++; return t; }

  function placementScore(board, r, c, value) {
    const { left, right, up, down } = computeBounds(board, r, c);
    if (!(left < value && value < right && up < value && value < down)) return -Infinity;
    const horizMargin = Math.min(value - left, right - value);
    const vertMargin  = Math.min(value - up,   down - value);
    let score = 0;
    score += 10 * (board[r][c] == null ? 1 : 0);
    score += 1 * (horizMargin + vertMargin);
    const rowAlmost = board[r].filter(x => x != null).length === N - 1 && board[r][c] == null;
    const colAlmost = board.map(row => row[c]).filter(x => x != null).length === N - 1 && board[r][c] == null;
    if (rowAlmost) score += 8;
    if (colAlmost) score += 8;
    const centerBias = (1 - (Math.abs(r - 1.5) + Math.abs(c - 1.5)) / 3);
    score += 2 * centerBias;
    return score;
  }

  function bestPlacement(board, value) {
    let best = null;
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const vOld = board[r][c];
        const temp = deepCloneBoard(board);
        temp[r][c] = null;
        const sc = placementScore(temp, r, c, value);
        if (sc !== -Infinity) {
          if (!best || sc > best.score) best = { r, c, score: sc, replaced: vOld };
        }
      }
    }
    return best;
  }

  function drawFromDeck(deck) {
    if (deck.length === 0) return { deck, value: null };
    const value = deck[deck.length - 1];
    const nd = deck.slice(0, deck.length - 1);
    return { deck: nd, value };
  }

  function takeFromPool(pool, idx) {
    const val = pool[idx];
    const np = pool.slice(0, idx).concat(pool.slice(idx + 1));
    return { pool: np, value: val };
  }

  const PlayerType = { HUMAN: 0, AI: 1 };

  function App() {
    const [boards, setBoards] = useState([emptyBoard(), emptyBoard()]);
    const [deck, setDeck] = useState([]);
    const [pool, setPool] = useState([]);
    const [turn, setTurn] = useState(0);
    const [inHand, setInHand] = useState(null);
    const [phase, setPhase] = useState("pick");
    const [winner, setWinner] = useState(null);
    const [hint, setHint] = useState(null);

    function newGame() {
      let d = makeDeck();
      const b0 = emptyBoard();
      const b1 = emptyBoard();
      function seedBoard(board) {
        const draw = [];
        for (let i = 0; i < N; i++) {
          const out = drawFromDeck(d);
          d = out.deck; draw.push(out.value);
        }
        draw.sort((a, b) => a - b);
        for (let i = 0; i < N; i++) board[i][i] = draw[i];
      }
      seedBoard(b0); seedBoard(b1);
      setBoards([b0, b1]);
      setDeck(d);
      setPool([]);
      setTurn(0);
      setInHand(null);
      setPhase("pick");
      setWinner(null);
      setHint(null);
    }

    useEffect(() => { newGame(); }, []);

    function checkForWinner(nextBoards) {
      if (boardFilled(nextBoards[0])) return 0;
      if (boardFilled(nextBoards[1])) return 1;
      return null;
    }

    function tryPlace(r, c) {
      if (winner != null || phase !== "place" || inHand == null) return;
      const b = deepCloneBoard(boards[turn]);
      const existing = b[r][c];
      const temp = deepCloneBoard(boards[turn]);
      temp[r][c] = null;
      if (!isValidPlacement(temp, r, c, inHand)) return;

      b[r][c] = inHand;
      const nb = boards.map((bd, idx) => (idx === turn ? b : bd));
      const np = existing != null ? pool.concat([existing]) : pool;

      setBoards(nb);
      setPool(np);
      setInHand(null);

      const w = checkForWinner(nb);
      if (w != null) { setWinner(w); setPhase("done"); return; }
      setTurn((turn + 1) % 2);
      setPhase("pick");
      setHint(null);
    }

    function discardInHand() {
      if (winner != null || phase !== "place" || inHand == null) return;
      setPool(pool.concat([inHand]));
      setInHand(null);
      setTurn((turn + 1) % 2);
      setPhase("pick");
      setHint(null);
    }

    function drawDeck() {
      if (winner != null || phase !== "pick") return;
      if (inHand != null) return;
      const out = drawFromDeck(deck);
      setDeck(out.deck);
      setInHand(out.value);
      setPhase("place");
    }

    function takePool(idx) {
      if (winner != null || phase !== "pick") return;
      if (inHand != null) return;
      if (idx < 0 || idx >= pool.length) return;
      const { pool: np, value } = takeFromPool(pool, idx);
      setPool(np);
      setInHand(value);
      setPhase("place");
    }

    function computeHint() {
      if (turn !== PlayerType.HUMAN) return;
      if (phase === "pick") {
        let best = null;
        pool.forEach((v, idx) => {
          const bp = bestPlacement(boards[0], v);
          if (bp) {
            const score = bp.score + 2;
            if (!best || score > best.score) best = { r: bp.r, c: bp.c, val: v, source: { type: "pool", idx }, score };
          }
        });
        if (best) setHint(best); else setHint({ r: null, c: null, val: null, source: { type: "deck" }, score: 0 });
      } else if (phase === "place" && inHand != null) {
        const bp = bestPlacement(boards[0], inHand);
        if (bp) setHint({ r: bp.r, c: bp.c, val: inHand, source: { type: "inHand" }, score: bp.score });
        else setHint({ r: null, c: null, val: inHand, source: { type: "inHand" }, score: -Infinity });
      }
    }

    React.useEffect(() => {
      if (winner != null) return;
      if (turn !== PlayerType.AI) return;

      const think = () => {
        const myBoard = boards[1];
        let best = null;
        pool.forEach((v, idx) => {
          const bp = bestPlacement(myBoard, v);
          if (bp) {
            const score = bp.score + 1;
            if (!best || score > best.score) best = { action: "usePool", idx, v, r: bp.r, c: bp.c, score, replaced: bp.replaced };
          }
        });

        if (best) {
          const { pool: np, value } = takeFromPool(pool, best.idx);
          const b = deepCloneBoard(myBoard);
          const existing = b[best.r][best.c];
          const temp = deepCloneBoard(b); temp[best.r][best.c] = null;
          if (isValidPlacement(temp, best.r, best.c, value)) {
            b[best.r][best.c] = value;
            const nb = [boards[0], b];
            const npool = existing != null ? np.concat([existing]) : np;
            setBoards(nb);
            setPool(npool);
            const w = checkForWinner(nb);
            if (w != null) { setWinner(w); setPhase("done"); return; }
            setTurn(PlayerType.HUMAN); setPhase("pick"); setHint(null);
            return;
          }
        }

        const out = drawFromDeck(deck);
        setDeck(out.deck);
        const v = out.value;
        if (v == null) {
          setTurn(PlayerType.HUMAN); setPhase("pick"); setHint(null);
          return;
        }
        const bp = bestPlacement(myBoard, v);
        if (bp) {
          const b = deepCloneBoard(myBoard);
          const existing = b[bp.r][bp.c];
          const temp = deepCloneBoard(b); temp[bp.r][bp.c] = null;
          if (isValidPlacement(temp, bp.r, bp.c, v)) {
            b[bp.r][bp.c] = v;
            const nb = [boards[0], b];
            const npool = existing != null ? pool.concat([existing]) : pool;
            setBoards(nb);
            setPool(npool);
            const w = checkForWinner(nb);
            if (w != null) { setWinner(w); setPhase("done"); return; }
            setTurn(PlayerType.HUMAN); setPhase("pick"); setHint(null);
            return;
          }
        }
        setPool(pool.concat([v]));
        setTurn(PlayerType.HUMAN); setPhase("pick"); setHint(null);
      };

      const t = setTimeout(think, 450);
      return () => clearTimeout(t);
    }, [turn, boards, deck, pool, winner]);

    const you = boards[0];
    const ai  = boards[1];

    const validCells = useMemo(() => {
      if (phase !== "place" || inHand == null) return new Set();
      const temp = deepCloneBoard(boards[turn]);
      const s = new Set();
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          const keep = temp[r][c];
          temp[r][c] = null;
          if (isValidPlacement(temp, r, c, inHand)) s.add(`${r},${c}`);
          temp[r][c] = keep;
        }
      }
      return s;
    }, [phase, inHand, boards, turn]);

    function cellKey(r, c) { return `${r}-${c}`; }

    function Cell({ boardIdx, r, c, val }) {
      const isYours = boardIdx === 0;
      const isTurn = turn === boardIdx;
      const canPlace = isTurn && phase === "place" && inHand != null && validCells.has(`${r},${c}`);
      const isHint = hint && hint.r === r && hint.c === c && ((hint.source?.type === "inHand" && isTurn) || (hint.source?.type === "pool" && isTurn && phase === "pick"));
      return React.createElement(
        "button",
        {
          className: [
            "w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-xl border flex items-center justify-center text-xl font-bold transition",
            val == null ? "bg-neutral-100 border-neutral-300 text-neutral-400" : "bg-white border-neutral-300 shadow",
            canPlace ? "ring-2 ring-emerald-500/70" : "",
            isHint ? "outline outline-2 outline-fuchsia-500" : "",
            isYours ? "" : "opacity-95",
          ].join(" "),
          onClick: () => { if (canPlace) tryPlace(r, c); },
          disabled: !canPlace,
          title: val == null ? "空格" : `#${val}`,
        },
        val ?? ""
      );
    }

    function Board({ title, board, idx }) {
      const filled = countFilled(board);
      const turnBadge = winner == null && turn === idx ? (
        React.createElement("span", { className: "px-2 py-0.5 text-xs rounded-full bg-emerald-500 text-white" }, "行動中")
      ) : null;
      const winBadge = winner === idx ? (
        React.createElement("span", { className: "px-2 py-0.5 text-xs rounded-full bg-amber-500 text-white" }, "完成！")
      ) : null;

      return React.createElement(
        "div",
        { className: "flex flex-col gap-3" },
        React.createElement(
          "div",
          { className: "flex items-center justify-between" },
          React.createElement(
            "div",
            { className: "flex items-center gap-2" },
            React.createElement("h2", { className: "text-lg font-semibold" }, title),
            turnBadge,
            winBadge
          ),
          React.createElement("div", { className: "text-sm text-neutral-500" }, `${filled}/16`)
        ),
        React.createElement(
          "div",
          { className: "grid grid-cols-4 gap-2" },
          board.map((row, r) => row.map((v, c) => React.createElement(Cell, { key: cellKey(r, c), boardIdx: idx, r, c, val: v })))
        )
      );
    }

    function AppUI() {
      const you = boards[0];
      const ai = boards[1];
      return React.createElement(
        "div",
        { className: "min-h-screen w-full bg-gradient-to-b from-emerald-50 to-white p-4 sm:p-6 md:p-10" },
        React.createElement(
          "div",
          { className: "max-w-6xl mx-auto flex flex-col gap-6" },
          React.createElement(
            "header",
            { className: "flex flex-col md:flex-row md:items-end md:justify-between gap-3" },
            React.createElement(
              "div",
              null,
              React.createElement("h1", { className: "text-2xl sm:text-3xl font-bold tracking-tight" }, "Lucky Numbers — 網頁版（含 AI 對戰）"),
              React.createElement("p", { className: "text-sm sm:text-base text-neutral-600 mt-1" }, "規則：每列由左到右遞增、每行由上到下遞增。你的回合先抽牌（牌庫）或拿公開池（Pool）的一張，再選一格放置（可覆蓋舊牌，舊牌丟回 Pool）。先填滿 16 格者獲勝。")
            ),
            React.createElement(
              "div",
              { className: "flex items-center gap-2" },
              React.createElement("button", { className: "px-3 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200", onClick: newGame }, "新開一局"),
              React.createElement("button", { className: "px-3 py-2 rounded-xl bg-violet-100 hover:bg-violet-200", onClick: computeHint }, "提示")
            )
          ),
          React.createElement(
            "section",
            { className: "grid grid-cols-1 lg:grid-cols-2 gap-8" },
            React.createElement(Board, { title: "你（玩家）", board: you, idx: 0 }),
            React.createElement(Board, { title: "電腦（AI）", board: ai, idx: 1 })
          ),
          React.createElement(
            "section",
            { className: "flex flex-col md:flex-row items-stretch md:items-center gap-4 justify-between bg-white rounded-2xl p-4 border shadow-sm" },
            React.createElement(
              "div",
              { className: "flex items-center gap-3" },
              React.createElement(
                "div",
                { className: "flex items-center gap-2" },
                React.createElement("span", { className: "text-sm text-neutral-500" }, "牌庫"),
                React.createElement("button", {
                  onClick: drawDeck,
                  className: "px-3 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40",
                  disabled: phase !== "pick" || turn !== PlayerType.HUMAN || inHand != null || winner != null || deck.length === 0,
                  title: deck.length === 0 ? "牌庫已空" : "從牌庫抽一張",
                }, `抽牌（剩 ${deck.length}）`)
              ),
              React.createElement("div", { className: "h-6 w-px bg-neutral-200" }),
              React.createElement(
                "div",
                { className: "flex items-center gap-2 flex-wrap" },
                React.createElement("span", { className: "text-sm text-neutral-500" }, "公開池（Pool）"),
                React.createElement(
                  "div",
                  { className: "flex items-center gap-2 flex-wrap" },
                  pool.length === 0
                    ? React.createElement("span", { className: "text-sm text-neutral-400" }, "（空）")
                    : pool.map((v, idx) => React.createElement("button", {
                        key: idx,
                        onClick: () => takePool(idx),
                        disabled: phase !== "pick" || turn !== PlayerType.HUMAN || inHand != null || winner != null,
                        className: "px-2.5 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-sm font-semibold border",
                        title: `拿取 #${v}`,
                      }, `${v}`))
                )
              )
            ),
            React.createElement(
              "div",
              { className: "flex items-center gap-3" },
              React.createElement("div", { className: "text-sm text-neutral-500" }, "手牌"),
              React.createElement("div", { className: "px-3 py-2 rounded-xl border bg-white min-w-[56px] text-center font-bold" }, inHand == null ? "—" : `${inHand}`),
              React.createElement("button", {
                onClick: discardInHand,
                className: "px-3 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 disabled:opacity-40",
                disabled: phase !== "place" || turn !== PlayerType.HUMAN || inHand == null || winner != null
              }, "棄置到 Pool")
            )
          ),
          React.createElement(
            "footer",
            { className: "text-xs text-neutral-500 leading-relaxed" },
            React.createElement("p", null, "小撇步：綠色光圈是此回合可以放置的位置。按「提示」會建議你下一步（若建議取 Pool 的某數字，該格也會以紫色外框標註）。電腦採用啟發式評分：優先從 Pool 選擇能提高完成度與邊界餘裕的落點，否則抽牌；若無法放置就丟入 Pool。")
          )
        )
      );
    }

    return AppUI();
  }

  const root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(React.createElement(App));
})();