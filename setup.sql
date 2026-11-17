-- =========================================================================
--  TECHGOTH.exe - placar global (Supabase)
--  Cole este arquivo inteiro em: Supabase > SQL Editor > New query > Run
--  Pode rodar de novo sem medo (é idempotente).
-- =========================================================================

-- 1) tabela: UM registro por nome (guarda o melhor placar de cada pessoa)
create table if not exists public.scores (
  name_key   text primary key,                                   -- nome em minúsculas
  name       text    not null check (char_length(name) between 1 and 12),
  hiscore    integer not null check (hiscore between 1 and 150000),
  updated_at timestamptz not null default now()
);

-- 2) segurança: todo mundo LÊ, ninguém escreve direto na tabela
alter table public.scores enable row level security;

drop policy if exists "leitura publica" on public.scores;
create policy "leitura publica" on public.scores
  for select to anon, authenticated using (true);

revoke all on public.scores from anon, authenticated;
grant select on public.scores to anon, authenticated;

-- 3) única porta de escrita: esta função, que valida tudo
create or replace function public.submit_score(p_name text, p_score integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := left(btrim(regexp_replace(coalesce(p_name, ''), '[[:cntrl:][:space:]]+', ' ', 'g')), 12);
begin
  if v_name = '' then
    raise exception 'nome vazio';
  end if;
  if p_score is null or p_score < 1 or p_score > 150000 then
    raise exception 'pontuacao invalida';
  end if;

  -- anti-flood: no máximo 30 nomes novos por minuto
  if not exists (select 1 from public.scores where name_key = lower(v_name))
     and (select count(*) from public.scores where updated_at > now() - interval '1 minute') >= 30 then
    raise exception 'muitos envios, tente de novo em instantes';
  end if;

  -- só grava se for recorde do nome; no máximo 1 atualização a cada 5 s
  insert into public.scores (name_key, name, hiscore)
  values (lower(v_name), v_name, p_score)
  on conflict (name_key) do update
    set hiscore = excluded.hiscore,
        name = excluded.name,
        updated_at = now()
    where excluded.hiscore > public.scores.hiscore
      and public.scores.updated_at < now() - interval '5 seconds';
end;
$$;

revoke all on function public.submit_score(text, integer) from public;
grant execute on function public.submit_score(text, integer) to anon, authenticated;
