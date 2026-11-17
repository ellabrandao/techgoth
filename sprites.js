/* ==========================================================================
   SPRITES ASCII  -  TECHGOTH.exe
   Arte em texto: disco voador e lua. A boneca e a CDJ são imagens PNG na
   pasta assets/ (troque o arquivo pra trocar o desenho).
   Cada linha do texto é uma linha do sprite. Não use o caractere ` (crase).
   ========================================================================== */

(function (global) {
  'use strict';

  // transforma o template em array de linhas (descarta a 1ª e a última, vazias)
  // e deixa todas com a mesma largura
  function art(str) {
    const lines = str.split('\n').slice(1, -1);
    const w = Math.max.apply(null, lines.map(l => l.length));
    return lines.map(l => l.padEnd(w, ' '));
  }

  /* ---------------------------- DISCO VOADOR ----------------------------- */

  const BAT_A = art(String.raw`
 /\ .-. /\
<  (@@@)  >
 \/ '-' \/
`);

  const BAT_B = art(String.raw`
    .-.
 \ (@@@) /
  \'-'/
`);

  /* ------------------------------- CENÁRIO ------------------------------- */

  const MOON = art(String.raw`
   _.--
  /  /
 /  /
|  |
|  |
|  |
 \  \
  \  \
   '-._
`);

  global.SPRITES = { BAT_A, BAT_B, MOON };
})(typeof window !== 'undefined' ? window : globalThis);
