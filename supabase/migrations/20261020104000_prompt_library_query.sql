-- PromptLab P2-03: RLS-aware Prompt library search and stable pagination.

create index prompts_user_updated_id_idx
  on public.prompts (user_id, updated_at desc, id desc);

create function public.list_prompts(
  p_query text default null,
  p_category text default null,
  p_page integer default 1,
  p_page_size integer default 12
)
returns table (
  id uuid,
  title text,
  description text,
  category text,
  created_at timestamptz,
  updated_at timestamptz,
  latest_version_id uuid,
  latest_version_number integer,
  latest_content text,
  latest_version_created_at timestamptz,
  total_count bigint
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_query text := nullif(btrim(p_query), '');
  v_pattern text;
begin
  if v_query is not null and char_length(v_query) > 500 then
    raise invalid_parameter_value using message = 'Search query is too long';
  end if;

  if p_category is not null
    and p_category not in ('coding', 'product', 'content', 'image', 'research', 'other') then
    raise invalid_parameter_value using message = 'Invalid Prompt category';
  end if;

  if p_page < 1 then
    raise invalid_parameter_value using message = 'Page must be at least 1';
  end if;

  if p_page_size < 1 or p_page_size > 50 then
    raise invalid_parameter_value using message = 'Page size must be between 1 and 50';
  end if;

  if v_query is not null then
    v_pattern := '%' || replace(
      replace(replace(v_query, E'\\', E'\\\\'), '%', E'\\%'),
      '_',
      E'\\_'
    ) || '%';
  end if;

  return query
  with filtered as (
    select
      p.id,
      p.title,
      p.description,
      p.category,
      p.created_at,
      p.updated_at,
      latest.id as latest_version_id,
      latest.version_number as latest_version_number,
      latest.content as latest_content,
      latest.created_at as latest_version_created_at
    from public.prompts as p
    join lateral (
      select pv.id, pv.version_number, pv.content, pv.created_at
      from public.prompt_versions as pv
      where pv.prompt_id = p.id
      order by pv.version_number desc
      limit 1
    ) as latest on true
    where (p_category is null or p.category = p_category)
      and (
        v_pattern is null
        or p.title ilike v_pattern escape E'\\'
        or p.description ilike v_pattern escape E'\\'
        or latest.content ilike v_pattern escape E'\\'
      )
  )
  select
    filtered.id,
    filtered.title,
    filtered.description,
    filtered.category,
    filtered.created_at,
    filtered.updated_at,
    filtered.latest_version_id,
    filtered.latest_version_number,
    filtered.latest_content,
    filtered.latest_version_created_at,
    count(*) over () as total_count
  from filtered
  order by filtered.updated_at desc, filtered.id desc
  offset (p_page - 1) * p_page_size
  limit p_page_size;
end;
$$;

revoke execute on function public.list_prompts(text, text, integer, integer)
from public, anon, authenticated;

grant execute on function public.list_prompts(text, text, integer, integer)
to authenticated;
