-- Inspect existing policies first. Apply with the service owner, after 001/002.
-- Existing rows remain untouched. Legacy words without an owner are admin-editable only.
begin;
alter table public.words add column if not exists created_by uuid references auth.users(id) on delete set null default auth.uid();
alter table public.words enable row level security;
alter table public.characters enable row level security;
alter table public.word_progress enable row level security;
alter table public.sentences enable row level security;
alter table public.sentence_words enable row level security;
-- PostgreSQL permissive policies combine with OR; old permissive policies must be replaced.
do $$ declare p record; begin
 for p in select schemaname,tablename,policyname from pg_policies where schemaname='public' and tablename in ('words','characters','word_progress','sentences','sentence_words') loop
  execute format('drop policy %I on %I.%I',p.policyname,p.schemaname,p.tablename);
 end loop;
end $$;
create policy words_public_read on public.words for select using(true);
create policy words_owner_insert on public.words for insert to authenticated with check(created_by=auth.uid());
create policy words_owner_update on public.words for update to authenticated using(created_by=auth.uid() or auth.jwt()->'app_metadata'->>'role'='admin') with check(created_by=auth.uid() or auth.jwt()->'app_metadata'->>'role'='admin');
create policy words_owner_delete on public.words for delete to authenticated using(created_by=auth.uid() or auth.jwt()->'app_metadata'->>'role'='admin');
create policy characters_public_read on public.characters for select using(true);
create policy characters_admin_write on public.characters for all to authenticated using(auth.jwt()->'app_metadata'->>'role'='admin') with check(auth.jwt()->'app_metadata'->>'role'='admin');
create policy progress_owner on public.word_progress for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy sentences_owner on public.sentences for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy sentence_words_owner on public.sentence_words for all to authenticated using(exists(select 1 from public.sentences s where s.id=sentence_id and s.user_id=auth.uid())) with check(exists(select 1 from public.sentences s where s.id=sentence_id and s.user_id=auth.uid()));
revoke insert,update,delete on public.words,public.characters,public.word_progress,public.sentences,public.sentence_words from anon;
commit;
