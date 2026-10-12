-- Read-only audit for the role matrix installed by the cloud foundation migration.
-- Expected result: every check is true.
select 'all organization tables use RLS' as check_name,
       count(*) = 15 as passed
from pg_class c
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public'
  and c.relname in ('profiles','organizations','organization_members','projects','workspace_snapshots','project_works','topics','topic_work_links','scenes','publication_variants','preparation_items','approval_requests','approval_comments','activity_log','media_assets')
  and c.relrowsecurity;

select 'member roles can read project content' as check_name,
       count(*) >= 8 as passed
from pg_policies
where schemaname='public' and policyname like '%_read_member';

select 'only owner manages members' as check_name,
       count(*) = 3 as passed
from pg_policies
where schemaname='public' and tablename='organization_members'
  and policyname in ('members_create_owner','members_update_owner','members_delete_owner');

select 'owner and photographer edit content' as check_name,
       count(*) >= 8 as passed
from pg_policies
where schemaname='public' and policyname like '%_update_editor%'
  and coalesce(qual,'') like '%photographer%';

select 'owner and director decide approvals' as check_name,
       count(*) = 1 as passed
from pg_policies
where schemaname='public' and policyname='approval_requests_decide'
  and coalesce(qual,'') like '%director%';

select 'project media bucket is private' as check_name,
       count(*) = 1 as passed
from storage.buckets where id='project-media' and public=false;
