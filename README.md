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
| Trocar nome (tela inicial / game over) | `N` | toque no campo de nome |

## Estrutura

```
techgoth-runner/
├── index.html      # página + canvas
├── supabase/
│   └── setup.sql   # cria o banco do placar global (rodar 1x no Supabase)
├── style.css       # fundo preto, scanlines leves
├── assets/         # sprites em PNG (fundo transparente)
│   ├── girl_run_a.png   # boneca correndo (frame 1, também usado no pulo)
│   ├── girl_run_b.png   # boneca correndo (frame 2)
│   ├── girl_duck.png    # boneca abaixada
│   └── cdj.png          # CDJ Pioneer (obstáculo)
└── js/
    ├── sprites.js  # arte em texto: disco voador e lua
    ├── audio.js    # bips 8-bit (WebAudio)
    ├── config.js   # URL e chave do Supabase (placar global)
    ├── online.js   # envia/busca recordes no Supabase
    └── game.js     # lógica, física, colisão, cenário, HUD
```

## Personalizar

- **Boneca e CDJ**: são PNGs em `assets/` (traço branco, fundo transparente). Troque o arquivo pra trocar o desenho; o tamanho na tela é `GIRL_SCALE` e `CDJ_SCALE` no `js/game.js`.
- **Disco voador e lua**: arte em texto em `js/sprites.js`.
- **Dificuldade**: constantes no topo de `js/game.js` (`START_SPEED`, `MAX_SPEED`, `ACCEL`, `GRAVITY`, `JUMP_V`...).
- **Placar e nome**: o jogador digita o nome na tela inicial (`ENTER` começa). Ao morrer, a pontuação entra no top 10, salvo no `localStorage` do navegador na chave `highscores` (JSON: `[{"name":"lis","hiscore":999999}, ...]`). O último nome fica em `techgoth_name`. `HS_SHOW`, `HS_MAX` e `NAME_MAX` no topo de `js/game.js` controlam quantos recordes aparecem, quantos são guardados e o tamanho do nome. O placar é por navegador/aparelho, não é compartilhado entre jogadores.

## Placar global (todo mundo vê a mesma tabela)

Sem configurar nada, o placar é local (só no navegador de cada pessoa). Pra ser global:

1. Crie um projeto grátis em https://supabase.com
2. No projeto: **SQL Editor > New query**, cole o conteúdo de `supabase/setup.sql` e clique em **Run**.
3. Em **Project Settings > API**, copie o **Project URL** e a chave **anon** (ou *publishable*) e cole em `js/config.js`.
4. Suba pro GitHub. Pronto.

Como funciona: a tabela guarda o melhor placar de cada nome; o jogo só **lê** a tabela e **envia** pontuações por uma função (`submit_score`) que valida nome (até 12 caracteres), faixa de pontos (1 a 150000) e limita envios. Ninguém escreve direto na tabela. A chave do `config.js` é pública por natureza, pode ficar no repositório.

Se o servidor cair ou a pessoa estiver sem internet, o jogo continua normal com o placar local. A tela mostra `GLOBAL` ou `LOCAL` no título da tabela.

Limite: num jogo de navegador não dá pra impedir 100% de trapaça (alguém pode chamar a função com uma pontuação falsa dentro da faixa permitida). Pra moderar, apague linhas no painel do Supabase (Table Editor > scores).
