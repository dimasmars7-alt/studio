create extension if not exists pgcrypto;

create type public.organization_role as enum ('owner', 'photographer', 'director', 'observer');
create type public.member_status as enum ('pending', 'active', 'disabled');
create type public.approval_status as enum ('draft', 'pending', 'changes_requested', 'approved');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 160),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.organization_role not null,
  status public.member_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 200),
  description text not null default '',
  color text not null default '#7561df',
  stage text not null default '',
  start_date date,
  target_end_date date,
  archived boolean not null default false,
  created_by uuid not null default auth.uid() references auth.users(id),
  updated_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version bigint not null default 1,
  deleted_at timestamptz,
  unique (id, organization_id)
);

-- Переходный слой для синхронизации текущего интерфейса без потери данных.
create table public.workspace_snapshots (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  schema_version integer not null default 1,
  created_by uuid not null default auth.uid() references auth.users(id),
  updated_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version bigint not null default 1
);

create table public.project_works (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null,
  name text not null check (length(trim(name)) between 1 and 240),
  description text not null default '',
  stage text not null default '',
  start_date date,
  deadline date,
  status text not null default '',
  irreversible boolean not null default false,
  external_id text,
  created_by uuid not null default auth.uid() references auth.users(id),
  updated_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version bigint not null default 1,
  deleted_at timestamptz,
  foreign key (project_id, organization_id) references public.projects(id, organization_id) on delete cascade,
  unique (id, organization_id)
);

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null,
  title text not null check (length(trim(title)) between 1 and 300),
  rubric text not null default '',
  script text not null default '',
  common_publication_date date,
  approval_status public.approval_status not null default 'draft',
  approval_note text not null default '',
  answers jsonb not null default '{}'::jsonb check (jsonb_typeof(answers) = 'object'),
  ai_brief jsonb not null default '{}'::jsonb check (jsonb_typeof(ai_brief) = 'object'),
  created_by uuid not null default auth.uid() references auth.users(id),
  updated_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version bigint not null default 1,
  deleted_at timestamptz,
  foreign key (project_id, organization_id) references public.projects(id, organization_id) on delete cascade,
  unique (id, organization_id)
);

create table public.topic_work_links (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  topic_id uuid not null,
  work_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (topic_id, work_id),
  foreign key (topic_id, organization_id) references public.topics(id, organization_id) on delete cascade,
  foreign key (work_id, organization_id) references public.project_works(id, organization_id) on delete cascade
);

create table public.scenes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  topic_id uuid not null,
  position integer not null default 0 check (position >= 0),
  title text not null check (length(trim(title)) between 1 and 300),
  time_start integer check (time_start is null or time_start >= 0),
  time_end integer check (time_end is null or time_end >= 0),
  shot_plan text not null default '',
  action text not null default '',
  host_speech text not null default '',
  voice_over text not null default '',
  b_roll text not null default '',
  overlay_text text not null default '',
  shoot_date date,
  deadline date,
  status text not null default 'Запланирован',
  stage text not null default '',
  before_work boolean not null default false,
  before_note text not null default '',
  shoot_note text not null default '',
  created_by uuid not null default auth.uid() references auth.users(id),
  updated_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version bigint not null default 1,
  deleted_at timestamptz,
  check (time_end is null or time_start is null or time_end >= time_start),
  foreign key (topic_id, organization_id) references public.topics(id, organization_id) on delete cascade,
  unique (id, organization_id)
);

create table public.publication_variants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  topic_id uuid not null,
  platform text not null default '',
  format text not null default '',
  body text not null default '',
  publication_date date,
  readiness text not null default 'Черновик',
  published_url text not null default '',
  created_by uuid not null default auth.uid() references auth.users(id),
  updated_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version bigint not null default 1,
  deleted_at timestamptz,
  foreign key (topic_id, organization_id) references public.topics(id, organization_id) on delete cascade,
  unique (id, organization_id)
);

create table public.preparation_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  topic_id uuid not null,
  body text not null check (length(trim(body)) between 1 and 500),
  deadline date,
  done boolean not null default false,
  position integer not null default 0,
  created_by uuid not null default auth.uid() references auth.users(id),
  updated_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version bigint not null default 1,
  deleted_at timestamptz,
  foreign key (topic_id, organization_id) references public.topics(id, organization_id) on delete cascade
);

create table public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  topic_id uuid not null,
  publication_variant_id uuid,
  requested_by uuid not null default auth.uid() references auth.users(id),
  assigned_to uuid references auth.users(id),
  status public.approval_status not null default 'pending',
  material_version bigint not null default 1,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (topic_id, organization_id) references public.topics(id, organization_id) on delete cascade,
  foreign key (publication_variant_id, organization_id) references public.publication_variants(id, organization_id) on delete cascade,
  unique (id, organization_id)
);

create table public.approval_comments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  approval_request_id uuid not null,
  author_id uuid not null default auth.uid() references auth.users(id),
  body text not null check (length(trim(body)) between 1 and 5000),
  material_version bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (approval_request_id, organization_id) references public.approval_requests(id, organization_id) on delete cascade
);

create table public.activity_log (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid default auth.uid() references auth.users(id),
  entity_type text not null,
  entity_id uuid,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null,
  topic_id uuid,
  scene_id uuid,
  publication_variant_id uuid,
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null default 'application/octet-stream',
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  duration_seconds numeric,
  upload_status text not null default 'ready',
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (project_id, organization_id) references public.projects(id, organization_id) on delete cascade,
  foreign key (topic_id, organization_id) references public.topics(id, organization_id),
  foreign key (scene_id, organization_id) references public.scenes(id, organization_id),
  foreign key (publication_variant_id, organization_id) references public.publication_variants(id, organization_id)
);

create index projects_organization_idx on public.projects (organization_id) where deleted_at is null;
create index topics_project_idx on public.topics (project_id) where deleted_at is null;
create index scenes_topic_position_idx on public.scenes (topic_id, position) where deleted_at is null;
create index variants_topic_date_idx on public.publication_variants (topic_id, publication_date) where deleted_at is null;
create index works_project_idx on public.project_works (project_id) where deleted_at is null;
create index media_project_idx on public.media_assets (project_id) where deleted_at is null;
create index activity_organization_created_idx on public.activity_log (organization_id, created_at desc);

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.touch_versioned_row()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  new.version = old.version + 1;
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger organizations_touch before update on public.organizations for each row execute function public.touch_updated_at();
create trigger members_touch before update on public.organization_members for each row execute function public.touch_updated_at();
create trigger approvals_touch before update on public.approval_requests for each row execute function public.touch_updated_at();
create trigger approval_comments_touch before update on public.approval_comments for each row execute function public.touch_updated_at();
create trigger media_touch before update on public.media_assets for each row execute function public.touch_updated_at();
create trigger projects_version before update on public.projects for each row execute function public.touch_versioned_row();
create trigger snapshots_version before update on public.workspace_snapshots for each row execute function public.touch_versioned_row();
create trigger works_version before update on public.project_works for each row execute function public.touch_versioned_row();
create trigger topics_version before update on public.topics for each row execute function public.touch_versioned_row();
create trigger scenes_version before update on public.scenes for each row execute function public.touch_versioned_row();
create trigger variants_version before update on public.publication_variants for each row execute function public.touch_versioned_row();
create trigger preparation_version before update on public.preparation_items for each row execute function public.touch_versioned_row();

create or replace function public.guard_approval_decision()
returns trigger language plpgsql set search_path = public as $$
begin
  if public.has_org_role(old.organization_id, array['owner']::public.organization_role[]) then return new; end if;
  if not public.has_org_role(old.organization_id, array['director']::public.organization_role[]) then raise exception 'FORBIDDEN'; end if;
  if new.organization_id is distinct from old.organization_id
    or new.topic_id is distinct from old.topic_id
    or new.publication_variant_id is distinct from old.publication_variant_id
    or new.requested_by is distinct from old.requested_by
    or new.assigned_to is distinct from old.assigned_to
    or new.material_version is distinct from old.material_version
    or new.created_at is distinct from old.created_at
  then raise exception 'DIRECTOR_CAN_ONLY_DECIDE'; end if;
  return new;
end;
$$;

create trigger approval_requests_guard before update on public.approval_requests
for each row execute function public.guard_approval_decision();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', new.email, ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_org_member(p_organization_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  );
$$;

create or replace function public.has_org_role(p_organization_id uuid, p_roles public.organization_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role = any(p_roles)
  );
$$;

create or replace function public.safe_uuid(p_value text)
returns uuid language plpgsql immutable as $$
begin
  return p_value::uuid;
exception when others then
  return null;
end;
$$;

revoke all on function public.is_org_member(uuid) from public, anon;
revoke all on function public.has_org_role(uuid, public.organization_role[]) from public, anon;
revoke all on function public.safe_uuid(text) from public, anon;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.has_org_role(uuid, public.organization_role[]) to authenticated;
grant execute on function public.safe_uuid(text) to authenticated;

create or replace function public.claim_organization(p_organization_id uuid, p_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare existing_creator uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if length(trim(p_name)) not between 1 and 160 then raise exception 'INVALID_NAME'; end if;
  select created_by into existing_creator from public.organizations where id = p_organization_id;
  if existing_creator is not null and not public.is_org_member(p_organization_id) then
    raise exception 'ORGANIZATION_ALREADY_EXISTS';
  end if;
  insert into public.organizations (id, name, created_by)
  values (p_organization_id, trim(p_name), auth.uid())
  on conflict (id) do update set name = excluded.name
    where public.organizations.created_by = auth.uid();
  insert into public.organization_members (organization_id, user_id, role, status)
  values (p_organization_id, auth.uid(), 'owner', 'active')
  on conflict (organization_id, user_id) do nothing;
  return p_organization_id;
end;
$$;

create or replace function public.save_workspace_snapshot(
  p_organization_id uuid,
  p_payload jsonb,
  p_expected_version bigint default 0
)
returns public.workspace_snapshots
language plpgsql security definer set search_path = public as $$
declare
  current_row public.workspace_snapshots;
  saved_row public.workspace_snapshots;
begin
  if not public.has_org_role(p_organization_id, array['owner','photographer']::public.organization_role[]) then
    raise exception 'FORBIDDEN';
  end if;
  if jsonb_typeof(p_payload) <> 'object' then raise exception 'INVALID_PAYLOAD'; end if;
  select * into current_row from public.workspace_snapshots
    where organization_id = p_organization_id for update;
  if not found then
    if p_expected_version <> 0 then raise exception 'SYNC_CONFLICT' using errcode = '40001'; end if;
    insert into public.workspace_snapshots (organization_id, payload, created_by, updated_by)
    values (p_organization_id, p_payload, auth.uid(), auth.uid()) returning * into saved_row;
  else
    if current_row.version <> p_expected_version then raise exception 'SYNC_CONFLICT' using errcode = '40001'; end if;
    update public.workspace_snapshots set payload = p_payload
      where organization_id = p_organization_id returning * into saved_row;
  end if;
  return saved_row;
end;
$$;

revoke all on function public.claim_organization(uuid, text) from public, anon;
revoke all on function public.save_workspace_snapshot(uuid, jsonb, bigint) from public, anon;
grant execute on function public.claim_organization(uuid, text) to authenticated;
grant execute on function public.save_workspace_snapshot(uuid, jsonb, bigint) to authenticated;

revoke all on function public.touch_updated_at() from public, anon, authenticated;
revoke all on function public.touch_versioned_row() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.guard_approval_decision() from public, anon, authenticated;

grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.organizations to authenticated;
grant select, insert, update, delete on public.organization_members to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select on public.workspace_snapshots to authenticated;
grant select, insert, update, delete on public.project_works to authenticated;
grant select, insert, update, delete on public.topics to authenticated;
grant select, insert, update, delete on public.topic_work_links to authenticated;
grant select, insert, update, delete on public.scenes to authenticated;
grant select, insert, update, delete on public.publication_variants to authenticated;
grant select, insert, update, delete on public.preparation_items to authenticated;
grant select, insert, update on public.approval_requests to authenticated;
grant select, insert, update on public.approval_comments to authenticated;
grant select, insert on public.activity_log to authenticated;
grant select, insert, update, delete on public.media_assets to authenticated;
grant usage, select on sequence public.activity_log_id_seq to authenticated;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.projects enable row level security;
alter table public.workspace_snapshots enable row level security;
alter table public.project_works enable row level security;
alter table public.topics enable row level security;
alter table public.topic_work_links enable row level security;
alter table public.scenes enable row level security;
alter table public.publication_variants enable row level security;
alter table public.preparation_items enable row level security;
alter table public.approval_requests enable row level security;
alter table public.approval_comments enable row level security;
alter table public.activity_log enable row level security;
alter table public.media_assets enable row level security;

create policy profiles_read_self on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_update_self on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy organizations_read_member on public.organizations for select to authenticated using (public.is_org_member(id));
create policy organizations_create on public.organizations for insert to authenticated with check (created_by = auth.uid());
create policy organizations_update_owner on public.organizations for update to authenticated using (public.has_org_role(id, array['owner']::public.organization_role[])) with check (public.has_org_role(id, array['owner']::public.organization_role[]));
create policy organizations_delete_owner on public.organizations for delete to authenticated using (public.has_org_role(id, array['owner']::public.organization_role[]));
create policy members_read_member on public.organization_members for select to authenticated using (public.is_org_member(organization_id));
create policy members_create_owner on public.organization_members for insert to authenticated with check (public.has_org_role(organization_id, array['owner']::public.organization_role[]));
create policy members_update_owner on public.organization_members for update to authenticated using (public.has_org_role(organization_id, array['owner']::public.organization_role[])) with check (public.has_org_role(organization_id, array['owner']::public.organization_role[]));
create policy members_delete_owner on public.organization_members for delete to authenticated using (public.has_org_role(organization_id, array['owner']::public.organization_role[]));

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'projects','project_works','topics','topic_work_links','scenes',
    'publication_variants','preparation_items','media_assets'
  ] loop
    execute format('create policy %I on public.%I for select to authenticated using (public.is_org_member(organization_id))', table_name || '_read_member', table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.has_org_role(organization_id, array[''owner'',''photographer'']::public.organization_role[]))', table_name || '_create_editor', table_name);
    execute format('create policy %I on public.%I for update to authenticated using (public.has_org_role(organization_id, array[''owner'',''photographer'']::public.organization_role[])) with check (public.has_org_role(organization_id, array[''owner'',''photographer'']::public.organization_role[]))', table_name || '_update_editor', table_name);
    execute format('create policy %I on public.%I for delete to authenticated using (public.has_org_role(organization_id, array[''owner'',''photographer'']::public.organization_role[]))', table_name || '_delete_editor', table_name);
  end loop;
end;
$$;

create policy workspace_snapshots_read_member on public.workspace_snapshots
for select to authenticated using (public.is_org_member(organization_id));

create policy approval_requests_read_member on public.approval_requests for select to authenticated using (public.is_org_member(organization_id));
create policy approval_requests_create_editor on public.approval_requests for insert to authenticated with check (public.has_org_role(organization_id, array['owner','photographer']::public.organization_role[]));
create policy approval_requests_decide on public.approval_requests for update to authenticated using (public.has_org_role(organization_id, array['owner','director']::public.organization_role[])) with check (public.has_org_role(organization_id, array['owner','director']::public.organization_role[]));
create policy approval_comments_read_member on public.approval_comments for select to authenticated using (public.is_org_member(organization_id));
create policy approval_comments_create_member on public.approval_comments for insert to authenticated with check (public.is_org_member(organization_id) and author_id = auth.uid());
create policy approval_comments_update_author on public.approval_comments for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid() and public.is_org_member(organization_id));
create policy activity_read_member on public.activity_log for select to authenticated using (public.is_org_member(organization_id));
create policy activity_create_editor on public.activity_log for insert to authenticated with check (public.has_org_role(organization_id, array['owner','photographer','director']::public.organization_role[]));

insert into storage.buckets (id, name, public, file_size_limit)
values ('project-media', 'project-media', false, 524288000)
on conflict (id) do update set public = false;

create policy project_media_read on storage.objects for select to authenticated
using (bucket_id = 'project-media' and public.is_org_member(public.safe_uuid((storage.foldername(name))[1])));
create policy project_media_upload on storage.objects for insert to authenticated
with check (bucket_id = 'project-media' and public.has_org_role(public.safe_uuid((storage.foldername(name))[1]), array['owner','photographer']::public.organization_role[]));
create policy project_media_update on storage.objects for update to authenticated
using (bucket_id = 'project-media' and public.has_org_role(public.safe_uuid((storage.foldername(name))[1]), array['owner','photographer']::public.organization_role[]))
with check (bucket_id = 'project-media' and public.has_org_role(public.safe_uuid((storage.foldername(name))[1]), array['owner','photographer']::public.organization_role[]));
create policy project_media_delete on storage.objects for delete to authenticated
using (bucket_id = 'project-media' and public.has_org_role(public.safe_uuid((storage.foldername(name))[1]), array['owner','photographer']::public.organization_role[]));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'workspace_snapshots'
  ) then
    alter publication supabase_realtime add table public.workspace_snapshots;
  end if;
end;
$$;
