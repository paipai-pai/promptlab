-- PromptLab P2-02: private prompt assets, immutable versions, and manual experiments.

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

create table public.prompts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text not null default '',
  category text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prompts_id_user_id_key unique (id, user_id),
  constraint prompts_title_length_check
    check (char_length(title) between 1 and 120 and btrim(title) <> ''),
  constraint prompts_description_length_check
    check (
      char_length(description) <= 1000
      and (description = '' or btrim(description) <> '')
    ),
  constraint prompts_category_check
    check (category in ('coding', 'product', 'content', 'image', 'research', 'other'))
);

create table public.prompt_versions (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid not null,
  user_id uuid not null,
  version_number integer not null,
  content text not null,
  change_note text,
  created_at timestamptz not null default now(),
  constraint prompt_versions_id_user_id_key unique (id, user_id),
  constraint prompt_versions_prompt_version_key unique (prompt_id, version_number),
  constraint prompt_versions_prompt_owner_fkey
    foreign key (prompt_id, user_id)
    references public.prompts (id, user_id)
    on delete cascade,
  constraint prompt_versions_version_number_check check (version_number > 0),
  constraint prompt_versions_content_length_check
    check (char_length(content) between 1 and 50000 and btrim(content) <> ''),
  constraint prompt_versions_change_note_length_check
    check (
      change_note is null
      or (char_length(change_note) between 1 and 500 and btrim(change_note) <> '')
    )
);

create table public.experiments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  prompt_version_id uuid not null,
  status text not null,
  input_variables jsonb not null default '{}'::jsonb,
  model_name text not null,
  rendered_prompt text not null,
  output_text text,
  failure_reason text,
  rating smallint,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint experiments_prompt_version_owner_fkey
    foreign key (prompt_version_id, user_id)
    references public.prompt_versions (id, user_id)
    on delete cascade,
  constraint experiments_status_check check (status in ('completed', 'failed')),
  constraint experiments_input_variables_check
    check (
      jsonb_typeof(input_variables) = 'object'
      and char_length(input_variables::text) <= 50000
    ),
  constraint experiments_model_name_length_check
    check (char_length(model_name) between 1 and 120 and btrim(model_name) <> ''),
  constraint experiments_rendered_prompt_length_check
    check (
      char_length(rendered_prompt) between 1 and 100000
      and btrim(rendered_prompt) <> ''
    ),
  constraint experiments_output_text_length_check
    check (
      output_text is null
      or (char_length(output_text) between 1 and 200000 and btrim(output_text) <> '')
    ),
  constraint experiments_failure_reason_length_check
    check (
      failure_reason is null
      or (char_length(failure_reason) between 1 and 4000 and btrim(failure_reason) <> '')
    ),
  constraint experiments_rating_check check (rating is null or rating between 1 and 5),
  constraint experiments_notes_length_check
    check (
      notes is null
      or (char_length(notes) between 1 and 4000 and btrim(notes) <> '')
    ),
  constraint experiments_outcome_check
    check (
      (
        status = 'completed'
        and output_text is not null
        and failure_reason is null
      )
      or
      (
        status = 'failed'
        and failure_reason is not null
        and rating is null
      )
    )
);

create index prompts_user_updated_idx
  on public.prompts (user_id, updated_at desc);

create index prompt_versions_user_created_idx
  on public.prompt_versions (user_id, created_at desc);

create index experiments_user_created_idx
  on public.experiments (user_id, created_at desc);

create index experiments_version_created_idx
  on public.experiments (prompt_version_id, created_at desc);

create function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := statement_timestamp();
  return new;
end;
$$;

create trigger prompts_set_updated_at
before update on public.prompts
for each row execute function private.set_updated_at();

create trigger experiments_set_updated_at
before update on public.experiments
for each row execute function private.set_updated_at();

alter table public.prompts enable row level security;
alter table public.prompt_versions enable row level security;
alter table public.experiments enable row level security;

create policy prompts_select_own
on public.prompts
for select
to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy prompts_update_own
on public.prompts
for update
to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()))
with check ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy prompts_delete_own
on public.prompts
for delete
to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy prompt_versions_select_own
on public.prompt_versions
for select
to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy experiments_select_own
on public.experiments
for select
to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy experiments_insert_own
on public.experiments
for insert
to authenticated
with check ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy experiments_update_own
on public.experiments
for update
to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()))
with check ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy experiments_delete_own
on public.experiments
for delete
to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()));

create function public.create_prompt_with_initial_version(
  p_title text,
  p_description text,
  p_category text,
  p_content text,
  p_change_note text default null
)
returns table (prompt_id uuid, prompt_version_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_prompt_id uuid;
  v_prompt_version_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise insufficient_privilege using message = 'Authentication required';
  end if;

  insert into public.prompts (user_id, title, description, category)
  values (v_user_id, p_title, p_description, p_category)
  returning id into v_prompt_id;

  insert into public.prompt_versions (
    prompt_id,
    user_id,
    version_number,
    content,
    change_note
  )
  values (
    v_prompt_id,
    v_user_id,
    1,
    p_content,
    p_change_note
  )
  returning id into v_prompt_version_id;

  return query select v_prompt_id, v_prompt_version_id;
end;
$$;

create function public.append_prompt_version(
  p_prompt_id uuid,
  p_content text,
  p_change_note text default null
)
returns table (prompt_version_id uuid, version_number integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_owned_prompt_id uuid;
  v_prompt_version_id uuid;
  v_version_number integer;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise insufficient_privilege using message = 'Authentication required';
  end if;

  select p.id
  into v_owned_prompt_id
  from public.prompts as p
  where p.id = p_prompt_id
    and p.user_id = v_user_id
  for update;

  if v_owned_prompt_id is null then
    raise insufficient_privilege using message = 'Prompt not found or not owned by caller';
  end if;

  select coalesce(max(pv.version_number), 0) + 1
  into v_version_number
  from public.prompt_versions as pv
  where pv.prompt_id = v_owned_prompt_id;

  insert into public.prompt_versions (
    prompt_id,
    user_id,
    version_number,
    content,
    change_note
  )
  values (
    v_owned_prompt_id,
    v_user_id,
    v_version_number,
    p_content,
    p_change_note
  )
  returning id into v_prompt_version_id;

  return query select v_prompt_version_id, v_version_number;
end;
$$;

revoke all on public.prompts from public, anon, authenticated;
revoke all on public.prompt_versions from public, anon, authenticated;
revoke all on public.experiments from public, anon, authenticated;

grant usage on schema public to authenticated;

grant select, delete on public.prompts to authenticated;
grant update (title, description, category) on public.prompts to authenticated;

grant select on public.prompt_versions to authenticated;

grant select, delete on public.experiments to authenticated;
grant insert (
  user_id,
  prompt_version_id,
  status,
  input_variables,
  model_name,
  rendered_prompt,
  output_text,
  failure_reason,
  rating,
  notes
) on public.experiments to authenticated;
grant update (rating, notes) on public.experiments to authenticated;

revoke execute on function private.set_updated_at() from public, anon, authenticated;

revoke execute on function public.create_prompt_with_initial_version(
  text,
  text,
  text,
  text,
  text
) from public, anon, authenticated;
grant execute on function public.create_prompt_with_initial_version(
  text,
  text,
  text,
  text,
  text
) to authenticated;

revoke execute on function public.append_prompt_version(uuid, text, text)
from public, anon, authenticated;
grant execute on function public.append_prompt_version(uuid, text, text)
to authenticated;
