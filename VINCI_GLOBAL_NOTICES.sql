-- ============================================
-- VINCI — AVISOS GLOBAIS
-- Execute uma vez no SQL Editor do Supabase.
-- ============================================

create table if not exists public.vinci_global_notices (
  id uuid primary key default gen_random_uuid(),
  singleton_key text not null default 'global' unique,
  enabled boolean not null default false,
  title text not null default 'Aviso do Vinci',
  message text not null default '',
  background_color text not null default '#171717',
  text_color text not null default '#ffffff',
  accent_color text not null default '#f28b3c',
  border_color text not null default '#f28b3c',
  font_family text not null default 'system',
  position text not null default 'top-center',
  size text not null default 'medium',
  animation text not null default 'slide',
  icon text not null default 'info',
  border_radius integer not null default 18,
  opacity numeric(4,3) not null default 1,
  dismissible boolean not null default true,
  auto_close_seconds integer not null default 0,
  action_enabled boolean not null default false,
  action_label text not null default 'Saiba mais',
  action_url text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,

  constraint vinci_global_notice_singleton
    check (singleton_key = 'global'),
  constraint vinci_global_notice_title_len
    check (char_length(title) between 1 and 90),
  constraint vinci_global_notice_message_len
    check (char_length(message) <= 1200),
  constraint vinci_global_notice_font
    check (font_family in ('system','serif','mono','rounded','elegant')),
  constraint vinci_global_notice_position
    check (position in ('top-left','top-center','top-right','bottom-left','bottom-center','bottom-right')),
  constraint vinci_global_notice_size
    check (size in ('small','medium','large')),
  constraint vinci_global_notice_animation
    check (animation in ('slide','fade','scale','none')),
  constraint vinci_global_notice_icon
    check (icon in ('info','warning','success','maintenance','none')),
  constraint vinci_global_notice_radius
    check (border_radius between 0 and 40),
  constraint vinci_global_notice_opacity
    check (opacity between 0.65 and 1),
  constraint vinci_global_notice_autoclose
    check (auto_close_seconds between 0 and 120)
);

alter table public.vinci_global_notices enable row level security;

-- O aviso é público por natureza: qualquer visitante pode LER.
-- Nenhum navegador recebe policy de escrita.
drop policy if exists "Vinci global notices read" on public.vinci_global_notices;
create policy "Vinci global notices read"
on public.vinci_global_notices
for select
to anon, authenticated
using (true);

revoke all on table public.vinci_global_notices from anon, authenticated;
grant select on table public.vinci_global_notices to anon, authenticated;
grant all on table public.vinci_global_notices to service_role;

insert into public.vinci_global_notices (
  singleton_key,
  enabled,
  title,
  message
)
values (
  'global',
  false,
  'Aviso do Vinci',
  'Sistema de avisos globais configurado.'
)
on conflict (singleton_key) do nothing;

-- Atualizações aparecem em telas abertas sem recarregar.
do $$
begin
  alter publication supabase_realtime
    add table public.vinci_global_notices;
exception
  when duplicate_object then null;
end $$;
