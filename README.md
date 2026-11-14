# TECHGOTH.exe

Jogo estilo "dinossauro do Chrome" (offline), todo desenhado em ASCII.
Sem dependências, sem build, sem internet.

## Como rodar

Abra o `index.html` no navegador (duplo clique). Pronto.

Se preferir um servidor local:

```bash
python3 -m http.server 8000
# depois abra http://localhost:8000
```

## Controles

| Ação | Teclado | Toque |
|---|---|---|
| Pular / iniciar / reiniciar | `ESPAÇO`, `↑` ou `W` | toque na tela |
| Abaixar (e cair mais rápido no ar) | `↓` ou `S` | arrastar pra baixo |
| Pausar | `P` ou `ESC` | — |
| Mudo | `M` | — |

## Estrutura

```
techgoth-runner/
├── index.html      # página + canvas
├── style.css       # fundo preto, scanlines leves
├── assets/         # sprites em PNG (fundo transparente)
│   ├── girl_run_a.png   # boneca correndo (frame 1, também usado no pulo)
│   ├── girl_run_b.png   # boneca correndo (frame 2)
│   ├── girl_duck.png    # boneca abaixada
│   └── cdj.png          # CDJ Pioneer (obstáculo)
└── js/
    ├── sprites.js  # arte em texto: disco voador e lua
    ├── audio.js    # bips 8-bit (WebAudio)
    └── game.js     # lógica, física, colisão, cenário, HUD
```

## Personalizar

- **Boneca e CDJ**: são PNGs em `assets/` (traço branco, fundo transparente). Troque o arquivo pra trocar o desenho; o tamanho na tela é `GIRL_SCALE` e `CDJ_SCALE` no `js/game.js`.
- **Disco voador e lua**: arte em texto em `js/sprites.js`.
- **Dificuldade**: constantes no topo de `js/game.js` (`START_SPEED`, `MAX_SPEED`, `ACCEL`, `GRAVITY`, `JUMP_V`...).
- **Recorde (HI)**: salvo no `localStorage` do navegador (`techgoth_hi`).
