begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(13);

insert into auth.users (id, email)
values
  ('00000000-0000-0000-0000-00000000000c', 'query-c@promptlab.test'),
  ('00000000-0000-0000-0000-00000000000d', 'query-d@promptlab.test');

insert into public.prompts (id, user_id, title, description, category, updated_at)
values
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', 'Alpha prompt', 'First description', 'coding', '2026-10-20 01:00:00+00'),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000c', 'Beta prompt', 'Second description', 'product', '2026-10-20 02:00:00+00'),
  ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000000c', 'Gamma prompt', 'Third description', 'coding', '2026-10-20 02:00:00+00'),
  ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000d', 'Private user D prompt', 'Must remain isolated', 'coding', '2026-10-20 03:00:00+00');

insert into public.prompt_versions (id, prompt_id, user_id, version_number, content)
values
  ('31000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', 1, 'obsolete-search-token'),
  ('31000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', 2, 'latest alpha body'),
  ('32000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000c', 1, 'needle in latest body'),
  ('33000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000000c', 1, 'gamma body'),
  ('41000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000d', 1, 'user D secret body');

select has_function(
  'public',
  'list_prompts',
  array['text', 'text', 'integer', 'integer'],
  '01 list_prompts function exists'
);

select ok(
  has_function_privilege('authenticated', 'public.list_prompts(text,text,integer,integer)', 'execute'),
  '02 authenticated can execute list_prompts'
);

select ok(
  not has_function_privilege('anon', 'public.list_prompts(text,text,integer,integer)', 'execute'),
  '03 anon cannot execute list_prompts'
);

set local role anon;
select throws_ok(
  $$ select * from public.list_prompts(null, null, 1, 12) $$,
  '42501',
  null,
  '04 anon execution is denied'
);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}',
  true
);

select results_eq(
  $$ select id from public.list_prompts(null, null, 1, 12) $$,
  $$ values
    ('30000000-0000-0000-0000-000000000003'::uuid),
    ('30000000-0000-0000-0000-000000000002'::uuid),
    ('30000000-0000-0000-0000-000000000001'::uuid) $$,
  '05 results are RLS isolated and stably sorted'
);

select results_eq(
  $$ select id from public.list_prompts('needle', null, 1, 12) $$,
  $$ values ('30000000-0000-0000-0000-000000000002'::uuid) $$,
  '06 search includes latest version body'
);

select results_eq(
  $$ select count(*)::bigint from public.list_prompts('obsolete-search-token', null, 1, 12) $$,
  $$ values (0::bigint) $$,
  '07 search excludes older version bodies'
);

select results_eq(
  $$ select id from public.list_prompts(null, 'coding', 1, 12) $$,
  $$ values
    ('30000000-0000-0000-0000-000000000003'::uuid),
    ('30000000-0000-0000-0000-000000000001'::uuid) $$,
  '08 category filter composes with RLS and sorting'
);

select results_eq(
  $$ select id, total_count from public.list_prompts(null, null, 2, 1) $$,
  $$ values ('30000000-0000-0000-0000-000000000002'::uuid, 3::bigint) $$,
  '09 pagination returns stable page and total count'
);

select throws_ok(
  $$ select * from public.list_prompts(null, 'invalid', 1, 12) $$,
  '22023',
  'Invalid Prompt category',
  '10 invalid category is rejected'
);

select throws_ok(
  $$ select * from public.list_prompts(null, null, 0, 12) $$,
  '22023',
  'Page must be at least 1',
  '11 invalid page is rejected'
);

select throws_ok(
  $$ select * from public.list_prompts(null, null, 1, 51) $$,
  '22023',
  'Page size must be between 1 and 50',
  '12 oversized page is rejected'
);

select throws_ok(
  $$ select * from public.list_prompts(repeat('x', 501), null, 1, 12) $$,
  '22023',
  'Search query is too long',
  '13 oversized search is rejected'
);

select * from finish();
rollback;
