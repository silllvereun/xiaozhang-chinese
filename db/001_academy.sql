-- Review in the existing Supabase SQL editor before applying. No existing rows are deleted.
begin;
create table if not exists public.academy_sentences (
 id text primary key, chinese_text text not null, pinyin text not null default '',
 korean_text text not null, categories text[] not null default '{}',
 accepted_answers text[] not null default '{}', is_public boolean not null default true,
 status text not null default 'active' check(status in ('active','hidden')),
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);
create table if not exists public.academy_study_attempts (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 content_type text not null check(content_type in ('word','sentence')), content_id text not null,
 mode text not null check(mode in ('learn','typing','test','review')),
 hint_level smallint check(hint_level between 1 and 4), user_answer text not null,
 normalized_answer text not null, is_correct boolean not null, accuracy integer not null check(accuracy between 0 and 100),
 elapsed_ms integer not null check(elapsed_ms between 0 and 86400000), skipped boolean not null,
 created_at timestamptz not null default now()
);
create index if not exists academy_attempt_user_date on public.academy_study_attempts(user_id,created_at desc);
create table if not exists public.academy_review_items (
 user_id uuid not null references auth.users(id) on delete cascade,
 content_type text not null, content_id text not null, wrong_count integer not null default 0,
 correct_count integer not null default 0, consecutive_correct integer not null default 0,
 status text not null check(status in ('wrong','scheduled','mastered')),
 last_attempt_at timestamptz not null, next_review_at timestamptz,
 primary key(user_id,content_type,content_id)
);
alter table public.academy_sentences enable row level security;
alter table public.academy_study_attempts enable row level security;
alter table public.academy_review_items enable row level security;
drop policy if exists academy_sentences_read on public.academy_sentences;
create policy academy_sentences_read on public.academy_sentences for select using ((is_public and status='active') or created_by=auth.uid());
drop policy if exists academy_attempt_read on public.academy_study_attempts;
create policy academy_attempt_read on public.academy_study_attempts for select to authenticated using(user_id=auth.uid());
drop policy if exists academy_review_read on public.academy_review_items;
create policy academy_review_read on public.academy_review_items for select to authenticated using(user_id=auth.uid());
grant select on public.academy_sentences to anon,authenticated;
grant select on public.academy_study_attempts,public.academy_review_items to authenticated;
revoke insert,update,delete on public.academy_study_attempts,public.academy_review_items from anon,authenticated;

create or replace function public.academy_is_han(c text) returns boolean language sql immutable as $$
 select c<>'' and (ascii(c) between 13312 and 40959 or ascii(c) between 131072 and 205743 or ascii(c) between 63744 and 64255);
$$;
create or replace function public.academy_normalize(raw text) returns text language plpgsql immutable as $$
declare x text:=btrim(regexp_replace(normalize(coalesce(raw,''),NFKC),'[,，.。?？!！]','','g')); out text:=''; i int:=1; j int; c text;
begin
 while i<=char_length(x) loop
  c:=substr(x,i,1);
  if c ~ '\s' then
   j:=i; while j<=char_length(x) and substr(x,j,1) ~ '\s' loop j:=j+1; end loop;
   if not (public.academy_is_han(substr(x,i-1,1)) and public.academy_is_han(substr(x,j,1))) then out:=out||substr(x,i,j-i); end if;
   i:=j;
  else out:=out||c;i:=i+1;end if;
 end loop;
 return btrim(out);
end $$;
create or replace function public.academy_distance(a text,b text) returns integer language plpgsql immutable as $$
declare prev int[]; cur int[]; i int; j int;
begin
 select array_agg(n order by n) into prev from generate_series(0,char_length(b)) n;
 if char_length(a)=0 then return char_length(b); end if;
 for i in 1..char_length(a) loop
  cur:=array[i];
  if char_length(b)>0 then for j in 1..char_length(b) loop
   cur[j+1]:=least(prev[j+1]+1,cur[j]+1,prev[j]+case when substr(a,i,1)=substr(b,j,1) then 0 else 1 end);
  end loop;end if;
  prev:=cur;
 end loop;
 return prev[char_length(b)+1];
end $$;
create or replace function public.academy_record_attempt(payload jsonb) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); aid uuid:=(payload->>'id')::uuid; kind text:=payload->>'content_type'; cid text:=payload->>'content_id';
 answer text:=coalesce(payload->>'user_answer',''); target text; py text; alternatives text[]; norm text; correct boolean; acc int;
 skipped boolean:=coalesce((payload->>'skipped')::boolean,false); t timestamptz:=now(); practice_mode text:=payload->>'mode';
begin
 if uid is null then raise exception 'Authentication required';end if;
 if char_length(answer)>1000 then raise exception 'Answer too long';end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 if exists(select 1 from public.academy_study_attempts where id=aid and user_id=uid) then return aid;end if;
 if kind='word' then select hanzi,pinyin into target,py from public.words where id::text=cid;
 elsif kind='sentence' then
  select chinese_text,accepted_answers into target,alternatives from public.academy_sentences where id=cid and status='active' and (is_public or created_by=uid);
  if target is null then select content into target from public.sentences where id::text=cid and user_id=uid;end if;
 else raise exception 'Invalid content type';end if;
 if target is null or char_length(target)>1000 then raise exception 'Reference unavailable';end if;
 norm:=public.academy_normalize(answer);
 correct:=norm<>'' and (norm=public.academy_normalize(target) or exists(select 1 from unnest(alternatives) a where public.academy_normalize(a)=norm));
 if kind='word' and practice_mode='test' then
  if btrim(answer) ~ '[一-鿿]' then correct:=btrim(answer)=target;
  else correct:=btrim(answer)<>'' and regexp_replace(lower(normalize(btrim(answer),NFD)),'[̀-ͯ''’\s-]','','g')=regexp_replace(lower(normalize(btrim(py),NFD)),'[̀-ͯ''’\s-]','','g');end if;
 end if;
 correct:=correct and not skipped;
 acc:=case when skipped or norm='' then 0 when correct then 100 else greatest(0,round((1-public.academy_distance(public.academy_normalize(target),norm)::numeric/greatest(char_length(public.academy_normalize(target)),char_length(norm),1))*100))::int end;
 insert into public.academy_study_attempts values(aid,uid,kind,cid,practice_mode,case when practice_mode='test' then null else (payload->>'hint_level')::smallint end,answer,norm,correct,acc,least(86400000,greatest(0,coalesce((payload->>'elapsed_ms')::int,0))),skipped,t);
 if not correct then
  insert into public.academy_review_items values(uid,kind,cid,1,0,0,'wrong',t,t)
  on conflict(user_id,content_type,content_id) do update set wrong_count=academy_review_items.wrong_count+1,consecutive_correct=0,status='wrong',last_attempt_at=t,next_review_at=t;
 else
  update public.academy_review_items set correct_count=correct_count+1,consecutive_correct=consecutive_correct+1,status=case when consecutive_correct+1>=3 then 'mastered' else 'scheduled' end,last_attempt_at=t,next_review_at=t+interval '1 day' where user_id=uid and content_type=kind and content_id=cid;
 end if;
 return aid;
end $$;
revoke all on function public.academy_record_attempt(jsonb) from public,anon;
grant execute on function public.academy_record_attempt(jsonb) to authenticated;
commit;
