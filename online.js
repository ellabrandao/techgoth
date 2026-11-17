/* ==========================================================================
   Placar global via Supabase (REST). Sem biblioteca, só fetch.
   ========================================================================== */
(function () {
  'use strict';

  const cfg = window.TG_CONFIG || {};
  const BASE = String(cfg.SUPABASE_URL || '').replace(/\/+$/, '');
  const KEY = String(cfg.SUPABASE_KEY || '');
  const enabled = !!(BASE && KEY);
  const TIMEOUT = 6000;

  function call(path, method, body) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), TIMEOUT);
    const init = {
      method: method,
      signal: ctl.signal,
      headers: { apikey: KEY, 'Content-Type': 'application/json' },
    };
    if (body !== undefined) init.body = JSON.stringify(body);
    return fetch(BASE + '/rest/v1/' + path, init)
      .then(res => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.status === 204 ? null : res.text().then(t => (t ? JSON.parse(t) : null));
      })
      .finally(() => clearTimeout(timer));
  }

  // melhores N pontuações -> [{ name, hiscore }]
  function top(n) {
    return call('scores?select=name,hiscore&order=hiscore.desc,updated_at.asc&limit=' + (n | 0), 'GET')
      .then(rows => {
        if (!Array.isArray(rows)) throw new Error('resposta inesperada');
        return rows
          .filter(r => r && typeof r.name === 'string' && Number.isFinite(r.hiscore))
          .map(r => ({ name: r.name, hiscore: Math.floor(r.hiscore) }));
      });
  }

  // envia uma pontuação (o servidor valida e só guarda se for recorde do nome)
  function submit(name, pts) {
    return call('rpc/submit_score', 'POST', { p_name: name, p_score: pts });
  }

  window.ONLINE = { enabled: enabled, top: top, submit: submit };
})();
