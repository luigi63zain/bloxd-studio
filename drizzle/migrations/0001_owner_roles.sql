create type public.app_role as enum ('owner', 'admin', 'user');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "Users can read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create or replace function public.handle_new_user_role()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  if lower(new.email) = 'luigi64zain@gmail.com' then
    insert into public.user_roles (user_id, role) values (new.id, 'owner');
  end if;
  return new;
end $$;

create trigger on_auth_user_created_role after insert on auth.users
for each row execute function public.handle_new_user_role();

insert into public.user_roles (user_id, role)
select id, 'owner' from auth.users where lower(email) = 'luigi64zain@gmail.com'
on conflict do nothing;