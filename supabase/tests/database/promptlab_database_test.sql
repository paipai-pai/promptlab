begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(80);

-- Stable identities used across the RLS matrix.
insert into auth.users (id, email)
values
  ('00000000-0000-0000-0000-00000000000a', 'user-a@promptlab.test'),
  ('00000000-0000-0000-0000-00000000000b', 'user-b@promptlab.test');

insert into public.prompts (id, user_id, title, description, category)
values
  (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-00000000000a',
    'User A prompt',
    'Owned by user A',
    'coding'
  ),
  (
    '20000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-00000000000b',
    'User B prompt',
    'Owned by user B',
    'product'
  );

insert into public.prompt_versions (
  id,
  prompt_id,
  user_id,
  version_number,
  content,
  change_note
)
values
  (
    '11000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-00000000000a',
    1,
    'User A version one',
    'Initial version'
  ),
  (
    '21000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-00000000000b',
    1,
    'User B version one',
    'Initial version'
  );

insert into public.experiments (
  id,
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
)
values
  (
    '12000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-00000000000a',
    '11000000-0000-0000-0000-000000000001',
    'completed',
    '{"language":"TypeScript"}'::jsonb,
    'test-model-a',
    'Rendered A',
    'Output A',
    null,
    4,
    'Keep for cascade test'
  ),
  (
    '12000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-00000000000a',
    '11000000-0000-0000-0000-000000000001',
    'completed',
    '{}'::jsonb,
    'test-model-a',
    'Rendered A2',
    'Output A2',
    null,
    null,
    'Delete independently'
  ),
  (
    '22000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-00000000000b',
    '21000000-0000-0000-0000-000000000001',
    'failed',
    '{}'::jsonb,
    'test-model-b',
    'Rendered B',
    null,
    'Provider timeout',
    null,
    'User B experiment'
  );

-- Schema, RLS, grants, and function privilege baseline (01-16).
select has_table('public', 'prompts', '01 prompts table exists');
select has_table('public', 'prompt_versions', '02 prompt_versions table exists');
select has_table('public', 'experiments', '03 experiments table exists');
select is(
  (select relrowsecurity from pg_class where oid = 'public.prompts'::regclass),
  true,
  '04 prompts has RLS enabled'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.prompt_versions'::regclass),
  true,
  '05 prompt_versions has RLS enabled'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.experiments'::regclass),
  true,
  '06 experiments has RLS enabled'
);
select ok(
  not has_table_privilege('anon', 'public.prompts', 'select'),
  '07 anon has no SELECT grant on prompts'
);
select ok(
  has_table_privilege('authenticated', 'public.prompts', 'select'),
  '08 authenticated can SELECT prompts subject to RLS'
);
select ok(
  not has_table_privilege('authenticated', 'public.prompts', 'insert'),
  '09 authenticated cannot directly INSERT prompts'
);
select ok(
  not has_table_privilege('authenticated', 'public.prompt_versions', 'insert'),
  '10 authenticated cannot directly INSERT versions'
);
select ok(
  not has_table_privilege('authenticated', 'public.prompt_versions', 'update'),
  '11 authenticated cannot UPDATE versions'
);
select ok(
  not has_table_privilege('authenticated', 'public.prompt_versions', 'delete'),
  '12 authenticated cannot DELETE versions'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.create_prompt_with_initial_version(text,text,text,text,text)',
    'execute'
  ),
  '13 authenticated can execute atomic prompt creation'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.create_prompt_with_initial_version(text,text,text,text,text)',
    'execute'
  ),
  '14 anon cannot execute atomic prompt creation'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.append_prompt_version(uuid,text,text)',
    'execute'
  ),
  '15 authenticated can execute append_prompt_version'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.append_prompt_version(uuid,text,text)',
    'execute'
  ),
  '16 anon cannot execute append_prompt_version'
);

-- Constraint matrix, executed as the migration owner so grants do not mask checks (17-39).
select throws_ok(
  $$insert into public.prompts (user_id, title, description, category) values ('00000000-0000-0000-0000-00000000000a', 'Bad category', '', 'invalid')$$,
  '23514',
  null,
  '17 invalid category is rejected'
);
select throws_ok(
  $$insert into public.prompts (user_id, title, description, category) values ('00000000-0000-0000-0000-00000000000a', '   ', '', 'coding')$$,
  '23514',
  null,
  '18 whitespace-only title is rejected'
);
select throws_ok(
  $$insert into public.prompts (user_id, title, description, category) values ('00000000-0000-0000-0000-00000000000a', repeat('t', 121), '', 'coding')$$,
  '23514',
  null,
  '19 title longer than 120 characters is rejected'
);
select throws_ok(
  $$insert into public.prompts (user_id, title, description, category) values ('00000000-0000-0000-0000-00000000000a', 'Description too long', repeat('d', 1001), 'coding')$$,
  '23514',
  null,
  '20 description longer than 1000 characters is rejected'
);
select throws_ok(
  $$insert into public.prompt_versions (prompt_id, user_id, version_number, content) values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 0, 'Content')$$,
  '23514',
  null,
  '21 non-positive version number is rejected'
);
select throws_ok(
  $$insert into public.prompt_versions (prompt_id, user_id, version_number, content) values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 2, '   ')$$,
  '23514',
  null,
  '22 whitespace-only version content is rejected'
);
select throws_ok(
  $$insert into public.prompt_versions (prompt_id, user_id, version_number, content) values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 2, repeat('c', 50001))$$,
  '23514',
  null,
  '23 content longer than 50000 characters is rejected'
);
select throws_ok(
  $$insert into public.prompt_versions (prompt_id, user_id, version_number, content, change_note) values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 2, 'Content', repeat('n', 501))$$,
  '23514',
  null,
  '24 change note longer than 500 characters is rejected'
);
select throws_ok(
  $$insert into public.prompt_versions (prompt_id, user_id, version_number, content) values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 1, 'Duplicate version')$$,
  '23505',
  null,
  '25 duplicate prompt version number is rejected'
);
select throws_ok(
  $$insert into public.experiments (user_id, prompt_version_id, status, input_variables, model_name, rendered_prompt, output_text) values ('00000000-0000-0000-0000-00000000000a', '11000000-0000-0000-0000-000000000001', 'unknown', '{}'::jsonb, 'model', 'Rendered', 'Output')$$,
  '23514',
  null,
  '26 invalid experiment status is rejected'
);
select throws_ok(
  $$insert into public.experiments (user_id, prompt_version_id, status, input_variables, model_name, rendered_prompt) values ('00000000-0000-0000-0000-00000000000a', '11000000-0000-0000-0000-000000000001', 'completed', '{}'::jsonb, 'model', 'Rendered')$$,
  '23514',
  null,
  '27 completed experiment requires output'
);
select throws_ok(
  $$insert into public.experiments (user_id, prompt_version_id, status, input_variables, model_name, rendered_prompt) values ('00000000-0000-0000-0000-00000000000a', '11000000-0000-0000-0000-000000000001', 'failed', '{}'::jsonb, 'model', 'Rendered')$$,
  '23514',
  null,
  '28 failed experiment requires failure reason'
);
select throws_ok(
  $$insert into public.experiments (user_id, prompt_version_id, status, input_variables, model_name, rendered_prompt, failure_reason, rating) values ('00000000-0000-0000-0000-00000000000a', '11000000-0000-0000-0000-000000000001', 'failed', '{}'::jsonb, 'model', 'Rendered', 'Timeout', 1)$$,
  '23514',
  null,
  '29 failed experiment rating must be NULL'
);
select throws_ok(
  $$insert into public.experiments (user_id, prompt_version_id, status, input_variables, model_name, rendered_prompt, output_text, rating) values ('00000000-0000-0000-0000-00000000000a', '11000000-0000-0000-0000-000000000001', 'completed', '{}'::jsonb, 'model', 'Rendered', 'Output', 6)$$,
  '23514',
  null,
  '30 rating outside 1 through 5 is rejected'
);
select throws_ok(
  $$insert into public.experiments (user_id, prompt_version_id, status, input_variables, model_name, rendered_prompt, output_text) values ('00000000-0000-0000-0000-00000000000a', '11000000-0000-0000-0000-000000000001', 'completed', '[]'::jsonb, 'model', 'Rendered', 'Output')$$,
  '23514',
  null,
  '31 input_variables must be a JSON object'
);
select throws_ok(
  $$insert into public.experiments (user_id, prompt_version_id, status, input_variables, model_name, rendered_prompt, output_text) values ('00000000-0000-0000-0000-00000000000a', '11000000-0000-0000-0000-000000000001', 'completed', jsonb_build_object('value', repeat('x', 50001)), 'model', 'Rendered', 'Output')$$,
  '23514',
  null,
  '32 serialized input_variables over 50000 characters is rejected'
);
select throws_ok(
  $$insert into public.experiments (user_id, prompt_version_id, status, input_variables, model_name, rendered_prompt, output_text) values ('00000000-0000-0000-0000-00000000000a', '11000000-0000-0000-0000-000000000001', 'completed', '{}'::jsonb, '   ', 'Rendered', 'Output')$$,
  '23514',
  null,
  '33 whitespace-only model name is rejected'
);
select throws_ok(
  $$insert into public.experiments (user_id, prompt_version_id, status, input_variables, model_name, rendered_prompt, output_text) values ('00000000-0000-0000-0000-00000000000a', '11000000-0000-0000-0000-000000000001', 'completed', '{}'::jsonb, repeat('m', 121), 'Rendered', 'Output')$$,
  '23514',
  null,
  '34 model name longer than 120 characters is rejected'
);
select throws_ok(
  $$insert into public.experiments (user_id, prompt_version_id, status, input_variables, model_name, rendered_prompt, output_text) values ('00000000-0000-0000-0000-00000000000a', '11000000-0000-0000-0000-000000000001', 'completed', '{}'::jsonb, 'model', '   ', 'Output')$$,
  '23514',
  null,
  '35 whitespace-only rendered prompt is rejected'
);
select throws_ok(
  $$insert into public.experiments (user_id, prompt_version_id, status, input_variables, model_name, rendered_prompt, output_text) values ('00000000-0000-0000-0000-00000000000a', '11000000-0000-0000-0000-000000000001', 'completed', '{}'::jsonb, 'model', repeat('r', 100001), 'Output')$$,
  '23514',
  null,
  '36 rendered prompt longer than 100000 characters is rejected'
);
select throws_ok(
  $$insert into public.experiments (user_id, prompt_version_id, status, input_variables, model_name, rendered_prompt, output_text) values ('00000000-0000-0000-0000-00000000000a', '11000000-0000-0000-0000-000000000001', 'completed', '{}'::jsonb, 'model', 'Rendered', repeat('o', 200001))$$,
  '23514',
  null,
  '37 output longer than 200000 characters is rejected'
);
select throws_ok(
  $$insert into public.experiments (user_id, prompt_version_id, status, input_variables, model_name, rendered_prompt, output_text, notes) values ('00000000-0000-0000-0000-00000000000a', '11000000-0000-0000-0000-000000000001', 'completed', '{}'::jsonb, 'model', 'Rendered', 'Output', repeat('n', 4001))$$,
  '23514',
  null,
  '38 notes longer than 4000 characters is rejected'
);
select throws_ok(
  $$insert into public.experiments (user_id, prompt_version_id, status, input_variables, model_name, rendered_prompt, output_text) values ('00000000-0000-0000-0000-00000000000a', '21000000-0000-0000-0000-000000000001', 'completed', '{}'::jsonb, 'model', 'Rendered', 'Output')$$,
  '23503',
  null,
  '39 composite foreign key rejects mismatched version owner'
);

-- User A: allowed operations, RLS zero-row behavior, and column privileges (40-58).
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';

select results_eq(
  $$select count(*) from public.prompts$$,
  array[1::bigint],
  '40 user A sees only their prompt'
);
select results_eq(
  $$select count(*) from public.prompt_versions$$,
  array[1::bigint],
  '41 user A sees only their version'
);
select results_eq(
  $$select count(*) from public.experiments$$,
  array[2::bigint],
  '42 user A sees only their experiments'
);
select results_eq(
  $$select count(*) from public.prompts where id = '20000000-0000-0000-0000-000000000001'$$,
  array[0::bigint],
  '43 user A cannot read user B prompt'
);
select results_eq(
  $$select count(*) from public.prompt_versions where id = '21000000-0000-0000-0000-000000000001'$$,
  array[0::bigint],
  '44 user A cannot read user B version'
);
select results_eq(
  $$select count(*) from public.experiments where id = '22000000-0000-0000-0000-000000000001'$$,
  array[0::bigint],
  '45 user A cannot read user B experiment'
);
select throws_ok(
  $$insert into public.prompts (user_id, title, description, category) values ('00000000-0000-0000-0000-00000000000a', 'Direct insert', '', 'coding')$$,
  '42501',
  null,
  '46 direct prompt INSERT is denied by grants'
);
select throws_ok(
  $$insert into public.prompt_versions (prompt_id, user_id, version_number, content) values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 2, 'Direct insert')$$,
  '42501',
  null,
  '47 direct version INSERT is denied by grants'
);
select results_eq(
  $$with changed as (update public.prompts set title = 'User A updated' where id = '10000000-0000-0000-0000-000000000001' returning 1) select count(*) from changed$$,
  array[1::bigint],
  '48 user A can update their prompt metadata'
);
select results_eq(
  $$with changed as (update public.prompts set title = 'Cross update' where id = '20000000-0000-0000-0000-000000000001' returning 1) select count(*) from changed$$,
  array[0::bigint],
  '49 cross-user prompt UPDATE affects zero rows through RLS'
);
select results_eq(
  $$with removed as (delete from public.prompts where id = '20000000-0000-0000-0000-000000000001' returning 1) select count(*) from removed$$,
  array[0::bigint],
  '50 cross-user prompt DELETE affects zero rows through RLS'
);
select throws_ok(
  $$update public.prompts set user_id = '00000000-0000-0000-0000-00000000000b' where id = '10000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  '51 user_id cannot be changed because the column is not granted'
);
select throws_ok(
  $$insert into public.experiments (user_id, prompt_version_id, status, input_variables, model_name, rendered_prompt, output_text) values ('00000000-0000-0000-0000-00000000000b', '21000000-0000-0000-0000-000000000001', 'completed', '{}'::jsonb, 'model', 'Rendered', 'Output')$$,
  '42501',
  null,
  '52 user A cannot forge user B ownership on experiment INSERT'
);
select throws_ok(
  $$insert into public.experiments (user_id, prompt_version_id, status, input_variables, model_name, rendered_prompt, output_text) values ('00000000-0000-0000-0000-00000000000a', '21000000-0000-0000-0000-000000000001', 'completed', '{}'::jsonb, 'model', 'Rendered', 'Output')$$,
  '23503',
  null,
  '53 user A cannot attach an experiment to user B version'
);
select throws_ok(
  $$update public.prompt_versions set content = 'Mutated' where id = '11000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  '54 historical version UPDATE is denied'
);
select throws_ok(
  $$delete from public.prompt_versions where id = '11000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  '55 standalone historical version DELETE is denied'
);
select throws_ok(
  $$update public.experiments set model_name = 'mutated-model' where id = '12000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  '56 immutable experiment source fields cannot be updated'
);
select results_eq(
  $$with changed as (update public.experiments set rating = 5, notes = 'Updated evaluation' where id = '12000000-0000-0000-0000-000000000001' returning 1) select count(*) from changed$$,
  array[1::bigint],
  '57 rating and notes can be updated for an owned experiment'
);
select results_eq(
  $$with removed as (delete from public.experiments where id = '12000000-0000-0000-0000-000000000002' returning 1) select count(*) from removed$$,
  array[1::bigint],
  '58 an owned experiment can be deleted independently'
);

-- RPC authorization, atomicity, and version sequencing (59-67).
reset role;
set local role anon;
set local request.jwt.claim.sub = '';

select throws_ok(
  $$select * from public.create_prompt_with_initial_version('Anon prompt', '', 'other', 'Content', null)$$,
  '42501',
  null,
  '59 anon cannot execute prompt creation RPC'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';

select lives_ok(
  $$select * from public.create_prompt_with_initial_version('Function prompt', 'Atomic creation', 'research', 'Version one content')$$,
  '60 authenticated user can atomically create prompt and v1'
);
select results_eq(
  $$select user_id::text from public.prompts where title = 'Function prompt'$$,
  array['00000000-0000-0000-0000-00000000000a'::text],
  '61 creation RPC derives owner from auth.uid()'
);
select results_eq(
  $$select count(*) from public.prompt_versions as pv join public.prompts as p on p.id = pv.prompt_id where p.title = 'Function prompt' and pv.version_number = 1$$,
  array[1::bigint],
  '62 creation RPC always creates exactly one v1'
);
select throws_ok(
  $$select * from public.create_prompt_with_initial_version('Atomic failure', '', 'coding', '   ', null)$$,
  '23514',
  null,
  '63 invalid initial version makes the RPC fail'
);
select results_eq(
  $$select count(*) from public.prompts where title = 'Atomic failure'$$,
  array[0::bigint],
  '64 failed RPC leaves no prompt without v1'
);
select lives_ok(
  $$select * from public.append_prompt_version((select id from public.prompts where title = 'Function prompt'), 'Version two content')$$,
  '65 owner can append a version through the RPC'
);
select results_eq(
  $$select pv.version_number from public.prompt_versions as pv join public.prompts as p on p.id = pv.prompt_id where p.title = 'Function prompt' order by pv.version_number$$,
  array[1, 2],
  '66 append RPC allocates the next unique version number'
);
select throws_ok(
  $$select * from public.append_prompt_version('20000000-0000-0000-0000-000000000001', 'Cross-user version', null)$$,
  '42501',
  null,
  '67 user A cannot append a version to user B prompt'
);

-- Prompt cascade behavior (68-72).
select lives_ok(
  $$delete from public.prompts where id = '10000000-0000-0000-0000-000000000001'$$,
  '68 owner can delete a prompt'
);

reset role;

select results_eq(
  $$select count(*) from public.prompts where id = '10000000-0000-0000-0000-000000000001'$$,
  array[0::bigint],
  '69 deleted prompt row is gone'
);
select results_eq(
  $$select count(*) from public.prompt_versions where prompt_id = '10000000-0000-0000-0000-000000000001'$$,
  array[0::bigint],
  '70 deleting prompt cascades to versions'
);
select results_eq(
  $$select count(*) from public.experiments where id = '12000000-0000-0000-0000-000000000001'$$,
  array[0::bigint],
  '71 deleting prompt cascades through versions to experiments'
);
select results_eq(
  $$select count(*) from public.prompts where id = '20000000-0000-0000-0000-000000000001'$$,
  array[1::bigint],
  '72 cross-user prompt remains intact'
);

-- User B positive isolation and anonymous table operations (73-80).
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';

select results_eq(
  $$select count(*) from public.prompts$$,
  array[1::bigint],
  '73 user B sees their remaining prompt'
);
select results_eq(
  $$select count(*) from public.prompts where title = 'Function prompt'$$,
  array[0::bigint],
  '74 user B cannot read user A function-created prompt'
);
select results_eq(
  $$select count(*) from public.prompt_versions$$,
  array[1::bigint],
  '75 user B sees only their version'
);
select results_eq(
  $$select count(*) from public.experiments$$,
  array[1::bigint],
  '76 user B sees only their experiment'
);

reset role;
set local role anon;
set local request.jwt.claim.sub = '';

select throws_ok(
  $$select * from public.prompts$$,
  '42501',
  null,
  '77 anon SELECT is denied by table privileges'
);
select throws_ok(
  $$insert into public.experiments (user_id, prompt_version_id, status, input_variables, model_name, rendered_prompt, output_text) values ('00000000-0000-0000-0000-00000000000b', '21000000-0000-0000-0000-000000000001', 'completed', '{}'::jsonb, 'model', 'Rendered', 'Output')$$,
  '42501',
  null,
  '78 anon INSERT is denied by table privileges'
);
select throws_ok(
  $$update public.prompts set title = 'Anon update' where id = '20000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  '79 anon UPDATE is denied by table privileges'
);
select throws_ok(
  $$delete from public.experiments where id = '22000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  '80 anon DELETE is denied by table privileges'
);

reset role;

select * from finish();
rollback;
