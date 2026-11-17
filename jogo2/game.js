/* ==========================================================================
   TECHGOTH SPACE IMPACT.exe  -  nave estilo Space Impact (canvas puro)
   ========================================================================== */
(() => {
'use strict';
const ONLINE = window.ONLINE || { enabled: false };

/* ------------------------------ CONFIGURAÇÃO ----------------------------- */
const HS_KEY = 'highscores_jogo2';  // placar local DESTE jogo (o outro jogo usa 'highscores')
const NAME_KEY = 'techgoth_name';   // nome compartilhado entre os dois jogos
const HS_MAX = 10;                  // quantos recordes guardar
const HS_SHOW = 5;                  // quantos aparecem na tela
const NAME_MAX = 12;
const FONT = '"JetBrains Mono","Fira Code","Cascadia Mono",Consolas,"Courier New",monospace';

/* -------------------------------- CANVAS --------------------------------- */
const c = document.querySelector('#game'), ctx = c.getContext('2d');
const W = 960, H = 480;
function resize() { c.width = W; c.height = H; }
resize(); addEventListener('resize', resize);

const girl = new Image(), girl2 = new Image(), cdj = new Image();
girl.src = 'assets/girl.png'; girl2.src = 'assets/girl_alt.png'; cdj.src = 'assets/cdj.png';

const pad5 = n => String(Math.floor(n)).padStart(5, '0');

/* -------------------------------- ESTADO --------------------------------- */
let keys = {}, touch = null, shots = [], enemies = [], sparks = [];
let score = 0, lives = 3, frame = 0, spawn = 0;
let paused = false, over = false, ready = true, muted = true;
let overAt = 0;                      // frame em que morreu
const player = { x: 105, y: 240, w: 55, h: 58, speed: 4.4, inv: 0 };

/* --------------------------- PLACAR + NOME ------------------------------- */
const nameBox = document.getElementById('namebox');
const nameInput = document.getElementById('name');

function cleanName(s) {
  return String(s || '').replace(/[\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
}

// junta uma pontuação numa lista: vale o melhor de cada nome (sem diferenciar maiúsculas)
function mergeScore(list, name, pts) {
  const key = name.toLowerCase();
  const out = list.map(r => ({ name: r.name, hiscore: r.hiscore }));
  const i = out.findIndex(r => r.name.toLowerCase() === key);
  if (i >= 0) {
    if (pts <= out[i].hiscore) return { list: out, rank: -1 };   // não bateu o próprio recorde
    out.splice(i, 1);
  }
  const entry = { name: name, hiscore: pts };
  out.push(entry);
  out.sort((a, b) => b.hiscore - a.hiscore);                     // sort estável: empate fica atrás
  const rank = out.indexOf(entry);
  return { list: out.slice(0, HS_MAX), rank: rank >= HS_MAX ? -1 : rank };
}

function loadScores() {
  let list = [];
  try {
    const raw = localStorage.getItem(HS_KEY);
    if (raw) {
      list = JSON.parse(raw);
    } else {
      // migra o recorde da versão antiga (uma pontuação só)
      const old = parseInt(localStorage.getItem('spaceImpactBest') || '0', 10) || 0;
      if (old > 0) list = [{ name: 'TECHGOTH', hiscore: old }];
    }
  } catch (e) { list = []; }
  if (!Array.isArray(list)) list = [];
  let out = [];
  list.forEach(r => {
    if (r && typeof r.name === 'string' && Number.isFinite(r.hiscore)) {
      out = mergeScore(out, cleanName(r.name) || 'ANON', Math.floor(r.hiscore)).list;
    }
  });
  return out;
}

function storeScores() {
  try { localStorage.setItem(HS_KEY, JSON.stringify(scores)); } catch (e) { /* ok */ }
}

let scores = loadScores();   // placar local (este navegador)
let remote = null;           // placar global (null = indisponível)
let deaths = 0;              // evita resposta atrasada sobrescrever partida nova
let lastRank = -1;           // posição da última partida no placar
let lastPts = 0;
let playerName = '';
try { playerName = cleanName(localStorage.getItem(NAME_KEY)); } catch (e) { /* ok */ }
nameInput.value = playerName;

const board = () => remote || scores;                 // global se der, senão local
const hiScore = () => { const l = board(); return l.length ? l[0].hiscore : 0; };

function refreshRemote() {
  if (!ONLINE.enabled) return;
  ONLINE.top(HS_MAX).then(list => { remote = list; }).catch(() => { /* fica no local */ });
}

// lê o campo, guarda e devolve o nome (ANON se estiver vazio)
function saveName() {
  playerName = cleanName(nameInput.value) || 'ANON';
  nameInput.value = playerName;
  try { localStorage.setItem(NAME_KEY, playerName); } catch (e) { /* ok */ }
  return playerName;
}

let boxShown = null;
function syncNameBox() {
  if (ready === boxShown) return;
  boxShown = ready;
  nameBox.style.visibility = ready ? 'visible' : 'hidden';
  if (!ready && document.activeElement === nameInput) nameInput.blur();
}
function focusName() { nameInput.focus(); nameInput.select(); }

/* -------------------------------- CONTROLE ------------------------------- */
function startGame() { saveName(); restart(); ready = false; }

function backToReady() {          // volta pra tela inicial sem começar (pra trocar o nome)
  ready = true; over = false; paused = false;
  shots = []; enemies = []; sparks = [];
  syncNameBox(); focusName(); refreshRemote();
}

function restart() {
  score = 0; lives = 3; shots = []; enemies = []; sparks = []; spawn = 0;
  over = false; paused = false; player.y = H / 2; player.inv = 0;
}

function gameOver() {
  over = true; overAt = frame;
  lastPts = score; lastRank = -1;
  if (lastPts > 0) {
    const loc = mergeScore(scores, playerName, lastPts);
    scores = loc.list; storeScores(); lastRank = loc.rank;
    if (ONLINE.enabled) {
      if (remote) {                                   // mostra já, antes do servidor responder
        const r = mergeScore(remote, playerName, lastPts);
        remote = r.list; lastRank = r.rank;
      }
      const token = ++deaths, name = playerName, pts = lastPts;
      ONLINE.submit(name, pts)
        .then(() => ONLINE.top(HS_MAX))
        .then(list => {
          remote = list;
          if (token === deaths) {
            lastRank = list.findIndex(r => r.name.toLowerCase() === name.toLowerCase() && r.hiscore === pts);
          }
        })
        .catch(() => { /* sem rede: fica o placar local */ });
    }
  }
}

addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  // digitando o nome: o jogo não reage às teclas
  if (e.target === nameInput) {
    if (k === 'enter') { e.preventDefault(); nameInput.blur(); if (ready) startGame(); }
    else if (k === 'escape') nameInput.blur();
    return;
  }
  if (k === 'n' && (ready || over)) { e.preventDefault(); backToReady(); return; }
  keys[k] = true;
  if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
  if ((k === ' ' || k === 'enter') && !e.repeat) {
    if (ready) startGame();
    else if (over && frame - overAt > 27) restart();   // ~0,45 s: evita reiniciar sem querer
  }
  if (k === 'p' && !ready && !over) paused = !paused;
  if (k === 'm') muted = !muted;
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

c.addEventListener('pointerdown', e => {
  if (document.activeElement === nameInput) nameInput.blur();
  touch = { x: e.offsetX / c.clientWidth * W, y: e.offsetY / c.clientHeight * H };
  if (ready) { startGame(); return; }
  if (over) { if (frame - overAt > 27) restart(); return; }
  shoot();
});
c.addEventListener('pointermove', e => {
  if (e.buttons && touch) touch = { x: e.offsetX / c.clientWidth * W, y: e.offsetY / c.clientHeight * H };
});

/* -------------------------------- JOGO ----------------------------------- */
function shoot() { if (!over && !paused && !ready) shots.push({ x: player.x + 45, y: player.y + 26, v: 8 }); }
function enemy() { enemies.push({ x: W + 30, y: 35 + Math.random() * (H - 100), w: 62, h: 34, v: 2.2 + Math.min(score / 400, 3), hp: 1 }); }
function boom(x, y) { for (let i = 0; i < 12; i++) sparks.push({ x, y, vx: (Math.random() - .5) * 5, vy: (Math.random() - .5) * 5, t: 18 + Math.random() * 15 }); }
function hit(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

function update() {
  frame++;
  if (paused || over || ready) return;
  let dx = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
  let dy = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0);
  if (touch) { player.x += (touch.x - player.x - 25) * .12; player.y += (touch.y - player.y - 25) * .12; }
  player.x = Math.max(15, Math.min(W - 90, player.x + dx * player.speed));
  player.y = Math.max(48, Math.min(H - 75, player.y + dy * player.speed));
  if (keys[' '] && frame % 9 === 0) shoot();
  if (player.inv > 0) player.inv--;
  shots.forEach(s => s.x += s.v); shots = shots.filter(s => s.x < W + 20);
  if (++spawn > Math.max(22, 68 - score / 35)) { enemy(); spawn = 0; }
  enemies.forEach(e => { e.x -= e.v; e.y += Math.sin(frame / 20 + e.x / 60) * .55; });
  for (const e of enemies) {
    for (const s of shots) {
      if (!s.dead && hit({ x: s.x, y: s.y - 2, w: 12, h: 4 }, e)) { s.dead = true; e.hp--; boom(e.x, e.y + 15); score += 10; }
    }
    if (e.hp <= 0) e.dead = true;
    if (!e.dead && player.inv === 0 && hit({ x: player.x + 8, y: player.y + 10, w: 35, h: 42 }, e)) {
      e.dead = true; lives--; player.inv = 70; boom(player.x + 25, player.y + 25);
      if (lives <= 0) gameOver();
    }
    if (e.x < -90) e.dead = true;
  }
  shots = shots.filter(s => !s.dead); enemies = enemies.filter(e => !e.dead);
  sparks.forEach(p => { p.x += p.vx; p.y += p.vy; p.t--; }); sparks = sparks.filter(p => p.t > 0);
}

/* -------------------------------- DESENHO -------------------------------- */
function text(t, x, y, size = 16, align = 'left', alpha = 1) {
  ctx.font = `${size}px ${FONT}`; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  ctx.globalAlpha = alpha; ctx.fillStyle = '#fff'; ctx.fillText(t, x, y); ctx.globalAlpha = 1;
}
// texto centralizado na vertical em y (pros painéis)
function ctext(t, y, size, alpha = 1) {
  ctx.font = `${size}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.globalAlpha = alpha; ctx.fillStyle = '#fff'; ctx.fillText(t, W / 2, y); ctx.globalAlpha = 1;
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

// moldura estilo terminal: borda fina, cantos reforçados e título "vazado" na borda
function drawFrame(x, y, w, h, label, strong) {
  ctx.fillStyle = 'rgba(0,0,0,0.93)'; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = strong ? '#9a9a9a' : '#5c5c5c'; ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
  const k = 10;
  ctx.beginPath();
  ctx.moveTo(x, y + k);         ctx.lineTo(x, y);         ctx.lineTo(x + k, y);
  ctx.moveTo(x + w - k, y);     ctx.lineTo(x + w, y);     ctx.lineTo(x + w, y + k);
  ctx.moveTo(x, y + h - k);     ctx.lineTo(x, y + h);     ctx.lineTo(x + k, y + h);
  ctx.moveTo(x + w - k, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - k);
  ctx.stroke(); ctx.lineWidth = 1;
  if (label) {
    ctx.font = `12px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = '#000'; ctx.fillRect(x + 18, y - 8, tw + 16, 16);   // abre um vão na borda
    ctx.fillStyle = '#fff'; ctx.fillText(label, x + 26, y);
    ctx.textBaseline = 'alphabetic';
  }
}

// tabela de recordes: posição + nome ........ pontos (a sua partida fica em vídeo invertido)
function drawBoard(x0, y0, w, step) {
  const rows = HS_SHOW, list = board();
  const h = 24 + rows * step + 10;
  const tag = ONLINE.enabled ? (remote ? ' · GLOBAL' : ' · LOCAL') : '';
  drawFrame(x0, y0, w, h, 'TOP ' + rows + tag, false);
  const pad = 18, t = frame / 60;
  ctx.textBaseline = 'middle';
  for (let i = 0; i < rows; i++) {
    const y = y0 + 24 + step * i + step / 2, r = list[i];
    const mine = over && i === lastRank;
    const inv = mine && (t - overAt / 60 > 1.2 || Math.floor(t * 6) % 2 === 0);
    if (inv) { ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.fillRect(x0 + 6, y - step / 2 + 1, w - 12, step - 2); }
    const fg = inv ? '#000' : '#fff';
    const label = (i + 1) + '. ' + (r ? r.name : '------');
    const sc = r ? pad5(r.hiscore) : '-----';
    ctx.font = (i === 0 && r ? '700 ' : '') + `14px ${FONT}`;
    ctx.globalAlpha = r ? (i === 0 || mine ? 1 : 0.8) : 0.28;
    ctx.fillStyle = fg;
    ctx.textAlign = 'left';  ctx.fillText(label, x0 + pad, y);
    ctx.textAlign = 'right'; ctx.fillText(sc, x0 + w - pad, y);
    if (r) {                                          // pontilhado entre nome e pontos
      const a = x0 + pad + ctx.measureText(label).width + 8;
      const b = x0 + w - pad - ctx.measureText(sc).width - 8;
      if (b > a) {
        ctx.strokeStyle = fg; ctx.globalAlpha = 0.3; ctx.setLineDash([1, 4]);
        ctx.beginPath(); ctx.moveTo(a, y + 6.5); ctx.lineTo(b, y + 6.5); ctx.stroke(); ctx.setLineDash([]);
      }
    }
  }
  ctx.globalAlpha = 1; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

// game over: "janela de erro" com a pontuação e o placar dentro
function drawOverPanel() {
  drawFrame(240, 48, 480, 350, 'fatal_error.log', true);
  ctext('G A M E   O V E R', 92, 30);
  ctext('SINAL PERDIDO (core dumped)', 120, 12, 0.5);
  ctext('SC ' + pad5(lastPts), 150, 22);
  let note = '';
  if (lastRank === 0) note = '** NOVO RECORDE! **';
  else if (lastRank > 0 && lastRank < HS_SHOW) note = 'ENTROU NO TOP ' + HS_SHOW + '!';
  else if (lastRank >= HS_SHOW) note = '#' + (lastRank + 1) + ' no ranking';
  if (note) ctext(note, 174, 12);
  drawBoard(270, 194, 420, 17);
  const rdy = frame - overAt > 27;
  ctext('[ ↻  ESPAÇO PARA REINICIAR ]', 342, 16, rdy ? (Math.floor(frame / 30) % 2 ? 1 : 0.4) : 0.15);
  ctext('jogando como ' + playerName + '   ·   [N] trocar nome', 368, 11, 0.5);
}

function draw() {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  // stars
  for (let i = 0; i < 90; i++) {
    const x = (i * 137 + frame * (i % 3 + 1) * .35) % W, y = (i * 71) % H;
    ctx.fillStyle = i % 5 ? '#333' : '#aaa'; ctx.fillRect(x, y, 1.5, 1.5);
  }
  ctx.strokeStyle = '#333'; ctx.strokeRect(12, 12, W - 24, H - 24);
  text('TECHGOTH', 28, 34, 18); text('SPACE IMPACT.exe', 28, 52, 10);
  text('SCORE ' + pad5(score), W - 28, 32, 14, 'right'); text('HI ' + pad5(hiScore()), W - 28, 49, 10, 'right');
  text('♥ '.repeat(lives), 28, 75, 16);
  ctx.globalAlpha = player.inv && frame % 8 < 4 ? .3 : 1;
  if (girl.complete) ctx.drawImage(frame % 18 < 9 ? girl : girl2, player.x, player.y, 54, 56);
  else text('◢█◣', player.x, player.y + 30, 25);
  ctx.globalAlpha = 1;
  shots.forEach(s => { ctx.fillStyle = '#fff'; ctx.fillRect(s.x, s.y, 13, 3); ctx.fillRect(s.x + 4, s.y - 2, 4, 7); });
  enemies.forEach(e => { if (cdj.complete) ctx.drawImage(cdj, e.x, e.y, e.w, e.h); else text('[CDJ]', e.x, e.y + 20, 18); });
  sparks.forEach(p => { ctx.fillStyle = '#fff'; ctx.fillRect(p.x, p.y, 2, 2); });

  if (ready) {
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, W, H);
    const typing = document.activeElement === nameInput;
    ctext(typing ? '> DIGITE SEU NOME E TECLE [ENTER]_' : '> PRESSIONE [ESPAÇO] PARA INICIAR_',
      130, 22, Math.floor(frame / 30) % 2 ? 1 : 0.35);
    ctext('WASD / SETAS mover    [ESPAÇO] atirar    [P] pausa', 160, 13, 0.6);
    drawBoard(270, 252, 420, 20);
  } else if (over) {
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, W, H);
    drawOverPanel();
  } else if (paused) {
    ctx.fillStyle = 'rgba(0,0,0,.72)'; ctx.fillRect(0, 0, W, H);
    ctext('PAUSED', H / 2 - 10, 30); ctext('[ P ] RESUME', H / 2 + 24, 14);
  }
  if (!over) text('WASD MOVE  ·  SPACE FIRE  ·  P PAUSE  ·  M SOUND', W / 2, H - 20, 10, 'center');
}

function loop() { update(); draw(); syncNameBox(); requestAnimationFrame(loop); }
syncNameBox(); refreshRemote();
if (!playerName) focusName();
loop();

// exposto só pra depuração / testes
window.__space = { get ready() { return ready; }, get over() { return over; }, get score() { return score; } };
})();
