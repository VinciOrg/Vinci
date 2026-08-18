-- ============================================================
-- VINCI 0.7.0 — GRANDE ATUALIZAÇÃO
-- Círculos + Notificações + Álbuns + Destaques + Respostas com foto
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- ============================================================

begin;

-- ============================================================
-- 1. CÍRCULOS DE ACESSO
-- ============================================================

create table if not exists public.vinci_circles (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    created_at timestamptz not null default now(),
    constraint vinci_circles_name_length
        check (char_length(trim(name)) between 1 and 40)
);

create unique index if not exists vinci_circles_owner_name_unique
    on public.vinci_circles (owner_id, lower(name));

create table if not exists public.vinci_circle_members (
    circle_id uuid not null references public.vinci_circles(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (circle_id, user_id)
);

create index if not exists vinci_circle_members_user_idx
    on public.vinci_circle_members (user_id);

-- Helpers SECURITY DEFINER evitam recursão entre policies de círculos/membros.
create or replace function public.vinci_is_circle_owner(
    p_circle_id uuid,
    p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select p_user_id = auth.uid()
       and exists (
        select 1 from public.vinci_circles c
        where c.id = p_circle_id
          and c.owner_id = p_user_id
    );
$$;

create or replace function public.vinci_is_circle_member(
    p_circle_id uuid,
    p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select p_user_id = auth.uid()
       and exists (
        select 1 from public.vinci_circle_members m
        where m.circle_id = p_circle_id
          and m.user_id = p_user_id
    );
$$;

alter table public.posts
    add column if not exists audience_type text not null default 'public';

alter table public.posts
    add column if not exists circle_id uuid null references public.vinci_circles(id) on delete set null;

alter table public.posts
    drop constraint if exists posts_audience_type_check;

alter table public.posts
    add constraint posts_audience_type_check
    check (audience_type in ('public', 'circle', 'private'));

create index if not exists posts_circle_id_idx
    on public.posts (circle_id);

-- Garante que o círculo usado pela publicação pertence ao autor.
create or replace function public.vinci_validate_post_audience()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if new.audience_type in ('public', 'private') then
        new.circle_id := null;
        return new;
    end if;

    if new.circle_id is null then
        raise exception 'Escolha um círculo para esta publicação.';
    end if;

    if not exists (
        select 1
        from public.vinci_circles c
        where c.id = new.circle_id
          and c.owner_id = new.user_id
    ) then
        raise exception 'Círculo inválido para esta publicação.';
    end if;

    return new;
end;
$$;

drop trigger if exists vinci_validate_post_audience_trigger on public.posts;
create trigger vinci_validate_post_audience_trigger
before insert or update of audience_type, circle_id, user_id
on public.posts
for each row execute function public.vinci_validate_post_audience();

-- Função central de privacidade do Vinci.
create or replace function public.vinci_can_view_post(
    p_post_id uuid,
    p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select p_user_id = auth.uid()
       and exists (
        select 1
        from public.posts p
        where p.id = p_post_id
          and (
              p.user_id = p_user_id
              or coalesce(p.audience_type, 'public') = 'public'
              or (
                  p.audience_type = 'circle'
                  and exists (
                      select 1
                      from public.vinci_circle_members m
                      where m.circle_id = p.circle_id
                        and m.user_id = p_user_id
                  )
              )
          )
    );
$$;

alter table public.vinci_circles enable row level security;
alter table public.vinci_circle_members enable row level security;
alter table public.posts enable row level security;

-- Círculos: só o dono administra; membros podem ver o círculo ao qual pertencem.
drop policy if exists "Vinci circles - select" on public.vinci_circles;
drop policy if exists "Vinci circles - insert" on public.vinci_circles;
drop policy if exists "Vinci circles - update" on public.vinci_circles;
drop policy if exists "Vinci circles - delete" on public.vinci_circles;

create policy "Vinci circles - select"
on public.vinci_circles for select to authenticated
using (
    owner_id = auth.uid()
    or public.vinci_is_circle_member(id, auth.uid())
);

create policy "Vinci circles - insert"
on public.vinci_circles for insert to authenticated
with check (owner_id = auth.uid());

create policy "Vinci circles - update"
on public.vinci_circles for update to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "Vinci circles - delete"
on public.vinci_circles for delete to authenticated
using (owner_id = auth.uid());

drop policy if exists "Vinci circle members - select" on public.vinci_circle_members;
drop policy if exists "Vinci circle members - insert" on public.vinci_circle_members;
drop policy if exists "Vinci circle members - delete" on public.vinci_circle_members;

create policy "Vinci circle members - select"
on public.vinci_circle_members for select to authenticated
using (
    user_id = auth.uid()
    or public.vinci_is_circle_owner(circle_id, auth.uid())
);

create policy "Vinci circle members - insert"
on public.vinci_circle_members for insert to authenticated
with check (
    user_id <> auth.uid()
    and public.vinci_is_circle_owner(circle_id, auth.uid())
);

create policy "Vinci circle members - delete"
on public.vinci_circle_members for delete to authenticated
using (
    public.vinci_is_circle_owner(circle_id, auth.uid())
);

-- A policy restritiva é aplicada em AND com qualquer policy antiga.
-- Assim Círculos continua seguro sem remover policies de insert/update/delete existentes.
drop policy if exists "Vinci posts - authenticated select" on public.posts;
drop policy if exists "Vinci posts - audience restrictive" on public.posts;

create policy "Vinci posts - authenticated select"
on public.posts
for select
to authenticated
using (true);

create policy "Vinci posts - audience restrictive"
on public.posts
as restrictive
for select
to public
using (
    user_id = auth.uid()
    or coalesce(audience_type, 'public') = 'public'
    or (
        audience_type = 'circle'
        and public.vinci_is_circle_member(circle_id, auth.uid())
    )
);

-- Círculos também protegem os Posts de texto do perfil.
alter table public.profile_posts
    add column if not exists audience_type text not null default 'public';

alter table public.profile_posts
    add column if not exists circle_id uuid null references public.vinci_circles(id) on delete set null;

alter table public.profile_posts
    drop constraint if exists profile_posts_audience_type_check;

alter table public.profile_posts
    add constraint profile_posts_audience_type_check
    check (audience_type in ('public', 'circle', 'private'));

create index if not exists profile_posts_circle_id_idx
    on public.profile_posts (circle_id);

create or replace function public.vinci_validate_profile_post_audience()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if new.audience_type in ('public', 'private') then
        new.circle_id := null;
        return new;
    end if;

    if new.circle_id is null then
        raise exception 'Escolha um círculo para este post.';
    end if;

    if not public.vinci_is_circle_owner(new.circle_id, new.user_id) then
        raise exception 'Círculo inválido para este post.';
    end if;

    return new;
end;
$$;

drop trigger if exists vinci_validate_profile_post_audience_trigger on public.profile_posts;
create trigger vinci_validate_profile_post_audience_trigger
before insert or update of audience_type, circle_id, user_id
on public.profile_posts
for each row execute function public.vinci_validate_profile_post_audience();

create or replace function public.vinci_can_view_profile_post(
    p_profile_post_id uuid,
    p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select p_user_id = auth.uid()
       and exists (
        select 1
        from public.profile_posts p
        where p.id = p_profile_post_id
          and (
              p.user_id = p_user_id
              or coalesce(p.audience_type, 'public') = 'public'
              or (
                  p.audience_type = 'circle'
                  and public.vinci_is_circle_member(p.circle_id, p_user_id)
              )
          )
    );
$$;

alter table public.profile_posts enable row level security;

drop policy if exists "Vinci profile posts - authenticated select" on public.profile_posts;
drop policy if exists "Vinci profile posts - audience restrictive" on public.profile_posts;

create policy "Vinci profile posts - authenticated select"
on public.profile_posts
for select
to authenticated
using (true);

create policy "Vinci profile posts - audience restrictive"
on public.profile_posts
as restrictive
for select
to public
using (
    user_id = auth.uid()
    or coalesce(audience_type, 'public') = 'public'
    or (
        audience_type = 'circle'
        and public.vinci_is_circle_member(circle_id, auth.uid())
    )
);

-- Exclusão segura: conteúdo do círculo vira privado antes do círculo sumir.
create or replace function public.vinci_delete_circle(
    p_circle_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    if not public.vinci_is_circle_owner(p_circle_id, auth.uid()) then
        raise exception 'Você só pode excluir seus próprios círculos.';
    end if;

    update public.posts
    set audience_type = 'private', circle_id = null
    where user_id = auth.uid()
      and circle_id = p_circle_id;

    update public.profile_posts
    set audience_type = 'private', circle_id = null
    where user_id = auth.uid()
      and circle_id = p_circle_id;

    delete from public.vinci_circles
    where id = p_circle_id
      and owner_id = auth.uid();
end;
$$;

-- ============================================================
-- 2. POSTS EM DESTAQUE
-- ============================================================

alter table public.posts
    add column if not exists is_featured boolean not null default false;

alter table public.posts
    add column if not exists featured_at timestamptz null;

create index if not exists posts_user_featured_idx
    on public.posts (user_id, is_featured, featured_at desc);

create or replace function public.vinci_set_featured_post(
    p_post_id uuid,
    p_featured boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_owner uuid;
    v_count integer;
begin
    select user_id into v_owner
    from public.posts
    where id = p_post_id;

    if v_owner is null or v_owner <> auth.uid() then
        raise exception 'Você só pode destacar suas próprias publicações.';
    end if;

    if p_featured then
        select count(*) into v_count
        from public.posts
        where user_id = auth.uid()
          and is_featured = true
          and id <> p_post_id;

        if v_count >= 3 then
            raise exception 'Você pode ter no máximo 3 publicações em destaque.';
        end if;

        update public.posts
        set is_featured = true,
            featured_at = now()
        where id = p_post_id;
    else
        update public.posts
        set is_featured = false,
            featured_at = null
        where id = p_post_id;
    end if;
end;
$$;

grant execute on function public.vinci_set_featured_post(uuid, boolean)
to authenticated;

-- ============================================================
-- 3. ÁLBUNS
-- ============================================================

create table if not exists public.vinci_albums (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    title text not null,
    description text not null default '',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint vinci_albums_title_length
        check (char_length(trim(title)) between 1 and 60),
    constraint vinci_albums_description_length
        check (char_length(description) <= 300)
);

create index if not exists vinci_albums_user_idx
    on public.vinci_albums (user_id, created_at desc);

create table if not exists public.vinci_album_posts (
    album_id uuid not null references public.vinci_albums(id) on delete cascade,
    post_id uuid not null references public.posts(id) on delete cascade,
    position integer not null default 0,
    added_at timestamptz not null default now(),
    primary key (album_id, post_id)
);

create index if not exists vinci_album_posts_post_idx
    on public.vinci_album_posts (post_id);

alter table public.vinci_albums enable row level security;
alter table public.vinci_album_posts enable row level security;

drop policy if exists "Vinci albums - select" on public.vinci_albums;
drop policy if exists "Vinci albums - insert" on public.vinci_albums;
drop policy if exists "Vinci albums - update" on public.vinci_albums;
drop policy if exists "Vinci albums - delete" on public.vinci_albums;

create policy "Vinci albums - select"
on public.vinci_albums for select to authenticated
using (true);

create policy "Vinci albums - insert"
on public.vinci_albums for insert to authenticated
with check (user_id = auth.uid());

create policy "Vinci albums - update"
on public.vinci_albums for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Vinci albums - delete"
on public.vinci_albums for delete to authenticated
using (user_id = auth.uid());

drop policy if exists "Vinci album posts - select" on public.vinci_album_posts;
drop policy if exists "Vinci album posts - insert" on public.vinci_album_posts;
drop policy if exists "Vinci album posts - delete" on public.vinci_album_posts;

create policy "Vinci album posts - select"
on public.vinci_album_posts for select to authenticated
using (public.vinci_can_view_post(post_id, auth.uid()));

create policy "Vinci album posts - insert"
on public.vinci_album_posts for insert to authenticated
with check (
    exists (
        select 1 from public.vinci_albums a
        where a.id = vinci_album_posts.album_id
          and a.user_id = auth.uid()
    )
    and exists (
        select 1 from public.posts p
        where p.id = vinci_album_posts.post_id
          and p.user_id = auth.uid()
    )
);

create policy "Vinci album posts - delete"
on public.vinci_album_posts for delete to authenticated
using (
    exists (
        select 1 from public.vinci_albums a
        where a.id = vinci_album_posts.album_id
          and a.user_id = auth.uid()
    )
);

-- ============================================================
-- 4. RESPOSTAS COM FOTO
-- ============================================================

alter table public.post_replies
    add column if not exists image_url text null;

alter table public.post_replies
    alter column content drop not null;

alter table public.post_replies
    drop constraint if exists post_replies_content_length;

alter table public.post_replies
    add constraint post_replies_content_length
    check (
        content is null
        or char_length(trim(content)) between 1 and 500
    );

alter table public.post_replies
    drop constraint if exists post_replies_has_content;

alter table public.post_replies
    add constraint post_replies_has_content
    check (
        nullif(trim(coalesce(content, '')), '') is not null
        or nullif(trim(coalesce(image_url, '')), '') is not null
    );

-- Respostas também respeitam a privacidade de visualização da fotografia.
drop policy if exists "Vinci post replies - select" on public.post_replies;
drop policy if exists "Vinci post replies - insert" on public.post_replies;
drop policy if exists "Vinci post replies - delete" on public.post_replies;

create policy "Vinci post replies - select"
on public.post_replies
for select
to authenticated
using (public.vinci_can_view_post(post_id, auth.uid()));

drop policy if exists "Vinci post replies - audience restrictive" on public.post_replies;
create policy "Vinci post replies - audience restrictive"
on public.post_replies
as restrictive
for select
to public
using (public.vinci_can_view_post(post_id, auth.uid()));

create policy "Vinci post replies - insert"
on public.post_replies
for insert
to authenticated
with check (
    user_id = auth.uid()
    and public.vinci_can_view_post(post_id, auth.uid())
    and (
        exists (
            select 1 from public.posts p
            where p.id = post_replies.post_id
              and p.user_id = auth.uid()
        )
        or exists (
            select 1 from public.post_reply_permissions prp
            where prp.post_id = post_replies.post_id
              and prp.user_id = auth.uid()
        )
    )
);

drop policy if exists "Vinci post replies - insert audience restrictive" on public.post_replies;
create policy "Vinci post replies - insert audience restrictive"
on public.post_replies
as restrictive
for insert
to public
with check (public.vinci_can_view_post(post_id, auth.uid()));

create policy "Vinci post replies - delete"
on public.post_replies
for delete
to authenticated
using (
    user_id = auth.uid()
    or exists (
        select 1 from public.posts p
        where p.id = post_replies.post_id
          and p.user_id = auth.uid()
    )
);

-- Curtidas de fotografias também respeitam Círculos, caso a tabela exista.
do $$
begin
    if to_regclass('public.post_likes') is not null then
        execute 'alter table public.post_likes enable row level security';
        execute 'drop policy if exists "Vinci post likes - audience restrictive" on public.post_likes';
        execute 'drop policy if exists "Vinci post likes - insert audience restrictive" on public.post_likes';
        execute 'create policy "Vinci post likes - audience restrictive" on public.post_likes as restrictive for select to public using (public.vinci_can_view_post(post_id, auth.uid()))';
        execute 'create policy "Vinci post likes - insert audience restrictive" on public.post_likes as restrictive for insert to public with check (public.vinci_can_view_post(post_id, auth.uid()))';
    end if;

    if to_regclass('public.profile_post_likes') is not null then
        execute 'alter table public.profile_post_likes enable row level security';
        execute 'drop policy if exists "Vinci profile post likes - audience restrictive" on public.profile_post_likes';
        execute 'drop policy if exists "Vinci profile post likes - insert audience restrictive" on public.profile_post_likes';
        execute 'create policy "Vinci profile post likes - audience restrictive" on public.profile_post_likes as restrictive for select to public using (public.vinci_can_view_profile_post(profile_post_id, auth.uid()))';
        execute 'create policy "Vinci profile post likes - insert audience restrictive" on public.profile_post_likes as restrictive for insert to public with check (public.vinci_can_view_profile_post(profile_post_id, auth.uid()))';
    end if;
end $$;

-- ============================================================
-- 5. NOTIFICAÇÕES
-- ============================================================

create table if not exists public.vinci_notifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    actor_id uuid null references auth.users(id) on delete cascade,
    type text not null,
    post_id uuid null references public.posts(id) on delete cascade,
    profile_post_id uuid null references public.profile_posts(id) on delete cascade,
    reply_id uuid null references public.post_replies(id) on delete cascade,
    circle_id uuid null references public.vinci_circles(id) on delete cascade,
    is_read boolean not null default false,
    created_at timestamptz not null default now()
);

create index if not exists vinci_notifications_user_idx
    on public.vinci_notifications (user_id, is_read, created_at desc);

alter table public.vinci_notifications enable row level security;

drop policy if exists "Vinci notifications - select" on public.vinci_notifications;
drop policy if exists "Vinci notifications - update" on public.vinci_notifications;
drop policy if exists "Vinci notifications - delete" on public.vinci_notifications;

create policy "Vinci notifications - select"
on public.vinci_notifications for select to authenticated
using (user_id = auth.uid());

create policy "Vinci notifications - update"
on public.vinci_notifications for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Vinci notifications - delete"
on public.vinci_notifications for delete to authenticated
using (user_id = auth.uid());

-- Curtiu fotografia.
create or replace function public.vinci_notify_post_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_owner uuid;
begin
    select user_id into v_owner from public.posts where id = new.post_id;
    if v_owner is not null and v_owner <> new.user_id then
        insert into public.vinci_notifications(user_id, actor_id, type, post_id)
        values (v_owner, new.user_id, 'photo_like', new.post_id);
    end if;
    return new;
end;
$$;

-- Curtiu post de texto.
create or replace function public.vinci_notify_profile_post_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_owner uuid;
begin
    select user_id into v_owner from public.profile_posts where id = new.profile_post_id;
    if v_owner is not null and v_owner <> new.user_id then
        insert into public.vinci_notifications(user_id, actor_id, type, profile_post_id)
        values (v_owner, new.user_id, 'text_like', new.profile_post_id);
    end if;
    return new;
end;
$$;

-- Respondeu uma fotografia.
create or replace function public.vinci_notify_post_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_owner uuid;
    v_type text;
begin
    select user_id into v_owner from public.posts where id = new.post_id;
    v_type := case when new.image_url is not null then 'photo_reply' else 'reply' end;
    if v_owner is not null and v_owner <> new.user_id then
        insert into public.vinci_notifications(user_id, actor_id, type, post_id, reply_id)
        values (v_owner, new.user_id, v_type, new.post_id, new.id);
    end if;
    return new;
end;
$$;

-- Você foi adicionado a um círculo.
create or replace function public.vinci_notify_circle_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_owner uuid;
begin
    select owner_id into v_owner from public.vinci_circles where id = new.circle_id;
    if v_owner is not null and v_owner <> new.user_id then
        insert into public.vinci_notifications(user_id, actor_id, type, circle_id)
        values (new.user_id, v_owner, 'circle_added', new.circle_id);
    end if;
    return new;
end;
$$;

-- Cria triggers só quando as tabelas de curtidas existem.
do $$
begin
    if to_regclass('public.post_likes') is not null then
        execute 'drop trigger if exists vinci_notification_post_like on public.post_likes';
        execute 'create trigger vinci_notification_post_like after insert on public.post_likes for each row execute function public.vinci_notify_post_like()';
    end if;

    if to_regclass('public.profile_post_likes') is not null then
        execute 'drop trigger if exists vinci_notification_profile_post_like on public.profile_post_likes';
        execute 'create trigger vinci_notification_profile_post_like after insert on public.profile_post_likes for each row execute function public.vinci_notify_profile_post_like()';
    end if;
end $$;

drop trigger if exists vinci_notification_post_reply on public.post_replies;
create trigger vinci_notification_post_reply
after insert on public.post_replies
for each row execute function public.vinci_notify_post_reply();

drop trigger if exists vinci_notification_circle_member on public.vinci_circle_members;
create trigger vinci_notification_circle_member
after insert on public.vinci_circle_members
for each row execute function public.vinci_notify_circle_member();

-- ============================================================
-- 6. GRANTS
-- ============================================================

grant select, insert, update, delete on public.vinci_circles to authenticated;
grant select, insert, delete on public.vinci_circle_members to authenticated;
grant select, insert, update, delete on public.vinci_albums to authenticated;
grant select, insert, delete on public.vinci_album_posts to authenticated;
grant select, update, delete on public.vinci_notifications to authenticated;
grant select, insert, delete on public.post_replies to authenticated;
grant execute on function public.vinci_can_view_post(uuid, uuid) to authenticated;
grant execute on function public.vinci_is_circle_owner(uuid, uuid) to authenticated;
grant execute on function public.vinci_is_circle_member(uuid, uuid) to authenticated;
grant execute on function public.vinci_can_view_profile_post(uuid, uuid) to authenticated;
grant execute on function public.vinci_delete_circle(uuid) to authenticated;

commit;

-- ============================================================
-- VINCI 0.7.0 PRONTO NO BANCO.
-- ============================================================
