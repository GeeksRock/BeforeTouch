-- Applied manually via the Supabase SQL editor on 2026-07-29.
-- The database was empty; the test-row deletes run beforehand are
-- intentionally not reproduced here.

alter table company
  drop column rotation_length,
  drop column rotation_start_day,
  drop column rotation_start_time,
  drop column rotation_end_day,
  drop column rotation_end_time,
  drop column has_backup,
  drop column allowed_volunteer_types,
  drop column approval_approver,
  drop column is_active;

alter table company
  add column state text not null check (state in ('setup', 'live')),
  alter column owner_id set not null;

alter table rotation_group
  alter column rotation_length set not null,
  alter column rotation_start_day set not null,
  alter column rotation_start_time set not null,
  alter column rotation_end_day set not null,
  alter column rotation_end_time set not null,
  alter column allowed_volunteer_types set not null,
  alter column approval_approver set not null,
  add constraint rotation_group_approver_valid
    check (approval_approver in ('on_call', 'manager')),
  add constraint rotation_group_types_not_empty
    check (array_length(allowed_volunteer_types, 1) >= 1);

-- (company_id, name) was already unique via rotation_group_company_id_name_key.
-- A second constraint was added here in error and dropped; do not re-add it.

alter table company add constraint company_owner_unique unique (owner_id);

alter table rotation alter column rotation_group_id set not null;
