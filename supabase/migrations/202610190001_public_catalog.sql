-- A public link exposes a deliberately small projection, never a workspace snapshot.
create table if not exists public.public_catalogs (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  share_token uuid not null unique default gen_random_uuid(),
  payload jsonb not null default '{}'::jsonb,
  is_published boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.public_catalogs enable row level security;
revoke all on public.public_catalogs from public, anon, authenticated;

create or replace function public.project_catalog_payload(p_snapshot jsonb)
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object(
    'organization', left(coalesce(p_snapshot #>> '{state,orgs,0,name}', ''), 160),
    'projects', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', left(coalesce(project.value ->> 'name', ''), 240),
        'description', left(coalesce(project.value ->> 'description', ''), 600),
        'topics', coalesce((
          select jsonb_agg(jsonb_build_object(
            'title', left(coalesce(topic.value ->> 'title', ''), 240)
          ) order by topic.position)
          from jsonb_array_elements(
            case when jsonb_typeof(p_snapshot #> '{state,planner,topics}') = 'array'
              then p_snapshot #> '{state,planner,topics}' else '[]'::jsonb end
          ) with ordinality as topic(value, position)
          where topic.value ->> 'projId' = project.value ->> 'id'
            and coalesce(topic.value ->> 'title', '') <> ''
        ), '[]'::jsonb)
      ) order by project.position)
      from jsonb_array_elements(
        case when jsonb_typeof(p_snapshot #> '{state,projects}') = 'array'
          then p_snapshot #> '{state,projects}' else '[]'::jsonb end
      ) with ordinality as project(value, position)
      where project.value ->> 'archived' is distinct from 'true'
        and coalesce(project.value ->> 'name', '') <> ''
    ), '[]'::jsonb)
  );
$$;

create or replace function public.publish_organization_catalog(p_organization_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare snapshot_payload jsonb; token uuid;
begin
  if not public.has_org_role(p_organization_id, array['owner']::public.organization_role[]) then
    raise exception 'FORBIDDEN';
  end if;
  select payload into snapshot_payload from public.workspace_snapshots
    where organization_id = p_organization_id;
  if snapshot_payload is null then raise exception 'SYNC_REQUIRED'; end if;
  insert into public.public_catalogs (organization_id, payload, is_published)
    values (p_organization_id, public.project_catalog_payload(snapshot_payload), true)
    on conflict (organization_id) do update set
      payload = excluded.payload, is_published = true, updated_at = now()
    returning share_token into token;
  return token;
end;
$$;

create or replace function public.unpublish_organization_catalog(p_organization_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_org_role(p_organization_id, array['owner']::public.organization_role[]) then
    raise exception 'FORBIDDEN';
  end if;
  update public.public_catalogs set is_published = false, updated_at = now()
    where organization_id = p_organization_id;
end;
$$;

create or replace function public.get_public_catalog(p_share_token uuid)
returns jsonb language sql security definer set search_path = public as $$
  select payload from public.public_catalogs
  where share_token = p_share_token and is_published = true;
$$;

create or replace function public.refresh_public_catalog()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.public_catalogs set
    payload = public.project_catalog_payload(new.payload), updated_at = now()
  where organization_id = new.organization_id and is_published = true;
  return new;
end;
$$;

drop trigger if exists workspace_snapshot_public_catalog on public.workspace_snapshots;
create trigger workspace_snapshot_public_catalog
after insert or update of payload on public.workspace_snapshots
for each row execute function public.refresh_public_catalog();

revoke all on function public.project_catalog_payload(jsonb) from public, anon, authenticated;
revoke all on function public.publish_organization_catalog(uuid) from public, anon;
revoke all on function public.unpublish_organization_catalog(uuid) from public, anon;
revoke all on function public.get_public_catalog(uuid) from public;
revoke all on function public.refresh_public_catalog() from public, anon, authenticated;
grant usage on schema public to anon;
grant execute on function public.publish_organization_catalog(uuid) to authenticated;
grant execute on function public.unpublish_organization_catalog(uuid) to authenticated;
grant execute on function public.get_public_catalog(uuid) to anon, authenticated;
