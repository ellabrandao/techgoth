/* ==========================================================================
   Placar global do SPACE IMPACT. Usa o MESMO projeto Supabase do outro jogo,
   mas uma tabela própria (scores_jogo2) - os placares não se misturam.
   Rode o arquivo setup_jogo2.sql no Supabase uma vez.
   Deixe SUPABASE_URL vazio e o jogo usa só o placar local (localStorage).
   ========================================================================== */
window.TG_CONFIG = {
  SUPABASE_URL: 'https://mejuviyfpqtgukxuszjq.supabase.co',
  SUPABASE_KEY: 'sb_publishable_sAx4yJxM_WF9kHC7B-Dq1g_JAuHzBIl',
  TABLE: 'scores_jogo2',
  RPC: 'submit_score_jogo2',
};
