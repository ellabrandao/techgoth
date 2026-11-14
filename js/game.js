/* ==========================================================================
   TECHGOTH.exe  -  runner infinito em ASCII (estilo dinossauro do Chrome)
   ========================================================================== */

(function () {
  "use strict";

  const S = window.SPRITES;
  const SFX = window.SFX;

  /* ----------------------------- CONFIGURAÇÃO ---------------------------- */

  const W = 1000; // largura lógica do canvas
  const H = 500; // altura lógica do canvas
  const GROUND = 395; // y da linha do chão
  const FONT =
    '"JetBrains Mono","Fira Code","Cascadia Mono",Consolas,"Courier New",monospace';
  const SPRITE_PX = 8; // tamanho da fonte dos sprites
  const LH = 8; // altura de cada linha de sprite (px)
  const SKY_PX = 12; // fonte do skyline
  const SKY_LH = 11;

  const GRAVITY = 2600; // px/s²
  const JUMP_V = 830; // px/s
  const FAST_FALL = 2.6; // multiplicador de gravidade segurando ↓ no ar
  const START_SPEED = 380; // px/s
  const MAX_SPEED = 980;
  const ACCEL = 7; // px/s a cada segundo
  const SCORE_RATE = 0.025; // pontos por pixel percorrido
  const MILESTONE = 100; // pisca + som a cada N pontos
  const BAT_MIN_SCORE = 150;
  const DOUBLE_MIN_SCORE = 300;

  /* ------------------------------- CANVAS -------------------------------- */

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  let CW = 4.8; // largura de um caractere do sprite (medido em runtime)
  let SKY_CW = 7.2; // idem, skyline

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const rect = canvas.getBoundingClientRect();
    const scale = (rect.width || W) / W;
    canvas.width = Math.round(W * scale * dpr);
    canvas.height = Math.round(H * scale * dpr);
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.font = SPRITE_PX + "px " + FONT;
    CW = ctx.measureText("M").width || 4.8;
    ctx.font = SKY_PX + "px " + FONT;
    SKY_CW = ctx.measureText("M").width || 7.2;
  }
  window.addEventListener("resize", resize);

  /* ------------------------------- ESTADO -------------------------------- */

  const rand = (a, b) => a + Math.random() * (b - a);
  const pad6 = (n) => String(Math.floor(n)).padStart(6, "0");

  let state = "ready"; // ready | running | paused | dead
  let speed = START_SPEED;
  let dist = 0; // pixels percorridos
  let score = 0;
  let hi = 0;
  let time = 0; // tempo total (s) - animações
  let deadAt = 0;
  let flashUntil = 0;
  let lastMilestone = 0;
  let spawnGap = 500;

  try {
    hi = parseInt(localStorage.getItem("techgoth_hi") || "0", 10) || 0;
  } catch (e) {
    /* ok */
  }

  const player = { x: 110, y: 0, vy: 0, duck: false, wantDuck: false, step: 0 };
  let obstacles = [];

  /* ------------------------------- CENÁRIO ------------------------------- */

  // estrelas
  const stars = [];
  for (let i = 0; i < 38; i++) {
    stars.push({
      x: rand(0, W),
      y: rand(30, 290),
      ch:
        Math.random() < 0.28 ? "+"
        : Math.random() < 0.5 ? "."
        : "·",
      tw: rand(0, 6.28),
    });
  }

  // skyline: colunas com altura; uma delas tem as "torres gêmeas"
  const SKY_COLS = 260;
  const skyline = [];
  const towers = new Set();
  (function buildSkyline() {
    let i = 0;
    while (i < SKY_COLS) {
      const w = Math.floor(rand(6, 18));
      const h = Math.random() < 0.25 ? 0 : Math.floor(rand(1, 5));
      for (let k = 0; k < w && i < SKY_COLS; k++, i++) skyline[i] = h;
    }
    const t = 150; // posição das torres
    for (let k = 0; k < 12; k++) {
      skyline[t + k] = 0;
    }
    towers.add(t + 3); // torre esquerda (3 colunas de largura)
    towers.add(t + 8); // torre direita
  })();

  // detritos do chão
  const debris = [];
  const DEBRIS_CH = ["-", "_", ".", ",", "·", "-", "="];
  for (let i = 0; i < 46; i++) newDebris(rand(0, W));
  function newDebris(x) {
    debris.push({
      x: x,
      y: GROUND + rand(8, 44),
      ch: DEBRIS_CH[Math.floor(rand(0, DEBRIS_CH.length))],
      big: Math.random() < 0.3,
    });
  }

  /* ------------------------------- SPRITES ------------------------------- */

  // --- sprites ASCII (texto): usados pelos discos voadores
  function sprW(lines) {
    return lines[0].length * CW;
  }
  function sprH(lines) {
    return lines.length * LH;
  }

  function drawSprite(lines, x, y, color) {
    ctx.fillStyle = color || "#fff";
    ctx.textBaseline = "top";
    ctx.font = SPRITE_PX + "px " + FONT;
    for (let i = 0; i < lines.length; i++)
      ctx.fillText(lines[i], x, y + i * LH);
  }

  // --- sprites em imagem (PNG de fundo transparente, na pasta assets/)
  const GIRL_SCALE = 0.55; // tamanho da boneca (1 = tamanho original do PNG)
  const CDJ_SCALE = 0.42; // tamanho da CDJ (todas iguais)
  const IMG_FILES = {
    runA: "assets/girl_run_a.png",
    runB: "assets/girl_run_b.png",
    duck: "assets/girl_duck.png",
    cdj: "assets/cdj.png",
  };
  const IMG = {};

  function loadImages(done) {
    const keys = Object.keys(IMG_FILES);
    let left = keys.length;
    keys.forEach((k) => {
      const im = new Image();
      im.onload = im.onerror = () => {
        if (--left === 0) done();
      };
      im.src = IMG_FILES[k];
      IMG[k] = im;
    });
  }

  function imgSprite(key, scale) {
    const im = IMG[key];
    return {
      img: im,
      w: (im.naturalWidth || 100) * scale,
      h: (im.naturalHeight || 100) * scale,
    };
  }

  function drawImg(spr, x, y) {
    if (spr.img.naturalWidth) ctx.drawImage(spr.img, x, y, spr.w, spr.h);
  }

  // frame atual do personagem
  function playerSprite() {
    const frame = Math.floor(player.step) % 2;
    if (player.y > 0) return imgSprite("runA", GIRL_SCALE); // no ar: pose de passada
    if (player.duck) return imgSprite("duck", GIRL_SCALE);
    return imgSprite(frame ? "runA" : "runB", GIRL_SCALE);
  }

  function playerBox(spr) {
    const top = GROUND - player.y - spr.h;
    return {
      x: player.x + spr.w * 0.45,
      y: top + spr.h * 0.1,
      w: spr.w * 0.43,
      h: spr.h * 0.88,
      top: top,
    };
  }

  /* ------------------------------ OBSTÁCULOS ----------------------------- */

  function spawn() {
    const bat = score > BAT_MIN_SCORE && Math.random() < 0.28;
    if (bat) {
      const high = Math.random() < 0.5;
      const lines = S.BAT_A;
      obstacles.push({
        kind: "bat",
        x: W + 40,
        lift: high ? 84 : 34, // distância do chão até a base
        w: sprW(lines),
        h: sprH(lines),
        t: rand(0, 1),
      });
      spawnGap = speed * 0.8 + rand(160, 420);
      return;
    }
    const spr = imgSprite("cdj", CDJ_SCALE);
    const ob = {
      kind: "cdj",
      x: W + 40,
      lift: 0,
      w: spr.w,
      h: spr.h,
      spr: spr,
    };
    obstacles.push(ob);
    let extra = 0;
    if (score > DOUBLE_MIN_SCORE && Math.random() < 0.25) {
      // às vezes vêm duas coladas
      obstacles.push({
        kind: "cdj",
        x: W + 40 + ob.w + 14,
        lift: 0,
        w: spr.w,
        h: spr.h,
        spr: spr,
      });
      extra = spr.w + 14;
    }
    spawnGap = ob.w + extra + speed * 0.72 + rand(140, 400);
  }

  function obstacleLines(o) {
    return Math.floor(time * 7 + o.t * 10) % 2 ? S.BAT_A : S.BAT_B;
  }

  function obstacleBox(o) {
    const top = GROUND - o.lift - o.h;
    return {
      x: o.x + o.w * 0.12,
      y: top + o.h * 0.14,
      w: o.w * 0.76,
      h: o.h * 0.84,
    };
  }

  function hit(a, b) {
    return (
      a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
    );
  }

  /* ------------------------------ CONTROLE -------------------------------- */

  function reset() {
    state = "running";
    speed = START_SPEED;
    dist = 0;
    score = 0;
    lastMilestone = 0;
    flashUntil = 0;
    obstacles = [];
    spawnGap = 520;
    player.y = 0;
    player.vy = 0;
    player.duck = false;
    player.step = 0;
  }

  function jump() {
    SFX.unlock();
    if (state === "ready") {
      reset();
    }
    if (state === "dead") {
      if (time - deadAt > 0.45) reset();
      else return;
    }
    if (state !== "running") return;
    if (player.y === 0) {
      player.vy = JUMP_V;
      player.duck = false;
      SFX.jump();
    }
  }

  function setDuck(on) {
    player.wantDuck = on;
    if (state !== "running") return;
    player.duck = on && player.y === 0;
  }

  function die() {
    state = "dead";
    deadAt = time;
    SFX.die();
    if (Math.floor(score) > hi) {
      hi = Math.floor(score);
      try {
        localStorage.setItem("techgoth_hi", String(hi));
      } catch (e) {
        /* ok */
      }
    }
  }

  function togglePause() {
    if (state === "running") state = "paused";
    else if (state === "paused") state = "running";
  }

  window.addEventListener("keydown", (e) => {
    const k = e.code;
    if (k === "Space" || k === "ArrowUp" || k === "KeyW") {
      e.preventDefault();
      if (!e.repeat) jump();
    } else if (k === "ArrowDown" || k === "KeyS") {
      e.preventDefault();
      setDuck(true);
    } else if (k === "KeyP" || k === "Escape") {
      togglePause();
    } else if (k === "KeyM") {
      SFX.toggleMute();
    } else if (k === "Enter" && state === "dead") {
      jump();
    }
  });

  window.addEventListener("keyup", (e) => {
    if (e.code === "ArrowDown" || e.code === "KeyS") setDuck(false);
  });

  // toque / mouse: toque = pular, arrastar pra baixo = abaixar
  let touchY = null;
  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    touchY = e.clientY;
    if (state === "paused") {
      togglePause();
      return;
    }
    jump();
  });
  canvas.addEventListener("pointermove", (e) => {
    if (touchY === null) return;
    if (e.clientY - touchY > 40) setDuck(true);
  });
  const endTouch = () => {
    touchY = null;
    setDuck(false);
  };
  canvas.addEventListener("pointerup", endTouch);
  canvas.addEventListener("pointercancel", endTouch);

  // pausa sozinho se a aba perder o foco
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state === "running") state = "paused";
  });

  /* ------------------------------- UPDATE -------------------------------- */

  function update(dt) {
    time += dt;

    // estrelas e cenário andam um pouquinho mesmo parado
    const bgSpeed =
      state === "running" ? speed
      : state === "dead" ? 0
      : 40;

    for (const s of stars) {
      s.x -= bgSpeed * 0.02 * dt + 3 * dt;
      if (s.x < -10) {
        s.x = W + 10;
        s.y = rand(30, 290);
      }
    }

    if (state !== "running") return;

    speed = Math.min(MAX_SPEED, speed + ACCEL * dt);
    dist += speed * dt;
    score += speed * dt * SCORE_RATE;

    // marco de 100 pontos
    const m = Math.floor(score / MILESTONE);
    if (m > lastMilestone) {
      lastMilestone = m;
      flashUntil = time + 0.9;
      SFX.milestone();
    }

    // física do personagem
    if (player.y > 0 || player.vy > 0) {
      const g = GRAVITY * (player.wantDuck ? FAST_FALL : 1);
      player.vy -= g * dt;
      player.y += player.vy * dt;
      if (player.y <= 0) {
        player.y = 0;
        player.vy = 0;
        player.duck = player.wantDuck;
      }
    }
    player.step += dt * (4 + speed / 110);

    // obstáculos
    spawnGap -= speed * dt;
    if (spawnGap <= 0) spawn();

    for (const o of obstacles) o.x -= speed * dt;
    obstacles = obstacles.filter((o) => o.x + o.w > -40);

    // colisão
    const pb = playerBox(playerSprite());
    for (const o of obstacles) {
      if (hit(pb, obstacleBox(o))) {
        die();
        break;
      }
    }

    // detritos do chão
    for (const d of debris) {
      d.x -= speed * dt;
      if (d.x < -10) {
        d.x = W + rand(0, 80);
        d.y = GROUND + rand(8, 44);
      }
    }
  }

  /* -------------------------------- DRAW --------------------------------- */

  function drawMoon() {
    drawSprite(S.MOON, 86, 100, "#fff");
  }

  function drawStars() {
    ctx.font = "16px " + FONT;
    ctx.textBaseline = "middle";
    for (const s of stars) {
      const a = 0.55 + 0.45 * Math.sin(time * 1.6 + s.tw);
      ctx.globalAlpha = a;
      ctx.fillStyle = "#fff";
      ctx.fillText(s.ch, s.x, s.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawSkyline() {
    const base = GROUND - 108;
    const off = dist * 0.18;
    const first = Math.floor(off / SKY_CW);
    const shift = off - first * SKY_CW;
    const cols = Math.ceil(W / SKY_CW) + 2;

    ctx.font = SKY_PX + "px " + FONT;
    ctx.textBaseline = "top";
    ctx.fillStyle = "#fff";
    ctx.globalAlpha = 0.75;

    for (let k = 0; k < cols; k++) {
      const c = (first + k) % SKY_COLS;
      const p = (c + SKY_COLS - 1) % SKY_COLS;
      const x = k * SKY_CW - shift;
      const h = skyline[c];
      const hp = skyline[p];
      const y = base - h * SKY_LH;

      if (h !== hp) {
        // degrau entre prédios
        const y1 = base - Math.min(h, hp) * SKY_LH;
        const y2 = base - Math.max(h, hp) * SKY_LH;
        for (let yy = y2; yy < y1; yy += SKY_LH) ctx.fillText("¦", x, yy);
      }
      if (k % 2 === 0) ctx.fillText("-", x, y);
      else if (k % 3 === 0) ctx.fillText(".", x, y);
    }

    // torres gêmeas
    const tw = 3;
    const firstMod = first % SKY_COLS;
    for (const t of towers) {
      const left = t - firstMod;
      for (let n = -SKY_COLS; n <= SKY_COLS; n += SKY_COLS) {
        const x0 = (left + n) * SKY_CW - shift;
        if (x0 < -tw * SKY_CW || x0 > W) continue;
        const top = base - 13 * SKY_LH;
        ctx.fillText("_" + "_" + "_", x0, top - 2);
        for (let r = 0; r < 12; r++) {
          const yy = top + (r + 1) * SKY_LH - 2;
          ctx.fillText("|", x0, yy);
          ctx.fillText("|", x0 + (tw - 1) * SKY_CW, yy);
          if (r % 3 === 1) ctx.fillText(":", x0 + SKY_CW, yy);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawGround() {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, GROUND, W, 2);
    ctx.font = "12px " + FONT;
    ctx.textBaseline = "top";
    for (const d of debris) {
      ctx.fillText(d.big ? d.ch + d.ch : d.ch, d.x, d.y);
    }
  }

  function drawHUD() {
    ctx.font = "22px " + FONT;
    ctx.textBaseline = "top";
    ctx.fillStyle = "#fff";
    ctx.textAlign = "left";
    ctx.fillText("TECHGOTH", 28, 24);

    const blink = time < flashUntil && Math.floor(time * 6) % 2 === 0;
    const sc = blink ? " ".repeat(9) : "SC " + pad6(score);
    ctx.textAlign = "right";
    ctx.fillText("HI " + pad6(hi) + "  " + sc, W - 24, 24);
    ctx.textAlign = "left";
  }

  function drawCentered(text, y, size, alpha) {
    ctx.font = size + "px " + FONT;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.globalAlpha = alpha === undefined ? 1 : alpha;
    ctx.fillStyle = "#fff";
    ctx.fillText(text, W / 2, y);
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
  }

  function drawOverlay() {
    if (state === "ready") {
      drawCentered(
        "> PRESSIONE [ESPAÇO] PARA INICIAR_",
        190,
        22,
        Math.floor(time * 2) % 2 ? 1 : 0.35,
      );
      drawCentered(
        "[↑] pular    [↓] abaixar    [P] pausa    [M] mudo",
        225,
        14,
        0.6,
      );
    } else if (state === "paused") {
      drawCentered("|| PAUSADO", 200, 28);
      drawCentered("[P] continuar", 235, 14, 0.6);
    } else if (state === "dead") {
      drawCentered("G A M E   O V E R", 175, 32);
      drawCentered("VOCÊ MORREU)", 208, 13, 0.55);
      const ready = time - deadAt > 0.45;
      drawCentered(
        "[ ↻  ESPAÇO PARA REINICIAR ]",
        245,
        18,
        ready ?
          Math.floor(time * 2) % 2 ?
            1
          : 0.4
        : 0.15,
      );
    }
  }

  function draw() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    drawStars();
    drawMoon();
    drawSkyline();
    drawGround();

    // obstáculos
    for (const o of obstacles) {
      if (o.spr) drawImg(o.spr, o.x, GROUND - o.h + 1);
      else drawSprite(obstacleLines(o), o.x, GROUND - o.lift - o.h);
    }

    // personagem (pisca quando morre)
    const spr = playerSprite();
    if (state === "dead" && Math.floor(time * 8) % 2) ctx.globalAlpha = 0.35;
    drawImg(spr, player.x, GROUND - player.y - spr.h + 1);
    ctx.globalAlpha = 1;

    drawHUD();
    drawOverlay();
  }

  /* ------------------------------- LOOP ---------------------------------- */

  let last = 0;
  function frame(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000 || 0);
    last = ts;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  resize();
  loadImages(() =>
    requestAnimationFrame((t) => {
      last = t;
      frame(t);
    }),
  );

  // exposto só pra depuração / testes
  window.__techgoth = {
    get state() {
      return state;
    },
    get score() {
      return score;
    },
  };
})();
