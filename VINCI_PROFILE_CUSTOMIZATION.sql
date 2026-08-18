-- =========================================================
-- VINCI 0.7.4 TESTE — PERSONALIZAÇÃO DE PERFIL
-- Rode este arquivo UMA VEZ no SQL Editor do Supabase.
-- =========================================================

create table if not exists public.profile_customization (
    user_id uuid primary key references public.profiles(id) on delete cascade,
    accent_color text not null default '#f28b3c',
    banner_url text,
    name_font text not null default 'default',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint profile_customization_accent_color_check
        check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),

    constraint profile_customization_name_font_check
        check (name_font in ('default', 'elegant', 'mono', 'soft', 'classic', 'pixel', 'arcade', 'cute', 'bubble', 'script', 'hand'))
);

alter table public.profile_customization enable row level security;

-- Qualquer usuário autenticado pode VER a aparência de perfis.
drop policy if exists "Vinci profile customization - select" on public.profile_customization;
create policy "Vinci profile customization - select"
on public.profile_customization
for select
to authenticated
using (true);

-- Só o próprio usuário cria sua personalização.
drop policy if exists "Vinci profile customization - insert" on public.profile_customization;
create policy "Vinci profile customization - insert"
on public.profile_customization
for insert
to authenticated
with check (auth.uid() = user_id);

-- Só o próprio usuário altera sua personalização.
drop policy if exists "Vinci profile customization - update" on public.profile_customization;
create policy "Vinci profile customization - update"
on public.profile_customization
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Só o próprio usuário pode resetar/deletar sua personalização.
drop policy if exists "Vinci profile customization - delete" on public.profile_customization;
create policy "Vinci profile customization - delete"
on public.profile_customization
for delete
to authenticated
using (auth.uid() = user_id);

grant select, insert, update, delete
on table public.profile_customization
to authenticated;

-- OBSERVAÇÃO:
-- O código de teste reutiliza o bucket público "avatars" e grava o banner em:
--   <user_id>/banner.ext
-- Como o avatar atual já usa esse mesmo diretório, as policies existentes do
-- bucket normalmente já permitem o upload. Se seu bucket tiver policies muito
-- restritivas, será necessário permitir ao usuário gravar arquivos dentro da
-- própria pasta.
