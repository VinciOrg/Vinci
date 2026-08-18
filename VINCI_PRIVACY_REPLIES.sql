-- ============================================================
-- ARQUIVO LEGADO DA VINCI 0.6
-- NÃO RODE ESTE ARQUIVO DEPOIS DA 0.7.
-- Para a versão atual, use VINCI_0_7_GRANDE_ATUALIZACAO.sql
-- ============================================================

-- ============================================================
-- VINCI — PRIVACY / PHOTO REPLIES 1.0
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- ============================================================


-- ============================================================
-- 1. QUEM PODE RESPONDER CADA FOTOGRAFIA
-- ============================================================

create table if not exists public.post_reply_permissions (
    post_id uuid not null references public.posts(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (post_id, user_id)
);

create index if not exists post_reply_permissions_user_id_idx
    on public.post_reply_permissions (user_id);

create index if not exists post_reply_permissions_post_id_idx
    on public.post_reply_permissions (post_id);


-- ============================================================
-- 2. RESPOSTAS DAS FOTOGRAFIAS
-- ============================================================

create table if not exists public.post_replies (
    id uuid primary key default gen_random_uuid(),
    post_id uuid not null references public.posts(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    content text not null,
    created_at timestamptz not null default now(),

    constraint post_replies_content_length
        check (
            char_length(trim(content)) between 1 and 500
        )
);

create index if not exists post_replies_post_created_idx
    on public.post_replies (post_id, created_at);

create index if not exists post_replies_user_id_idx
    on public.post_replies (user_id);


-- ============================================================
-- 3. RLS
-- ============================================================

alter table public.post_reply_permissions enable row level security;
alter table public.post_replies enable row level security;


-- ============================================================
-- 4. POLICIES — PERMISSÕES DE RESPOSTA
--
-- O autor do post pode ver e administrar TODA a lista.
-- A pessoa autorizada só consegue ver a própria autorização.
-- Outros usuários não conseguem descobrir quem está na lista.
-- ============================================================

drop policy if exists "Vinci reply permissions - select" 
    on public.post_reply_permissions;

drop policy if exists "Vinci reply permissions - insert" 
    on public.post_reply_permissions;

drop policy if exists "Vinci reply permissions - delete" 
    on public.post_reply_permissions;


create policy "Vinci reply permissions - select"
on public.post_reply_permissions
for select
to authenticated
using (
    user_id = auth.uid()
    or exists (
        select 1
        from public.posts p
        where p.id = post_reply_permissions.post_id
          and p.user_id = auth.uid()
    )
);


create policy "Vinci reply permissions - insert"
on public.post_reply_permissions
for insert
to authenticated
with check (
    exists (
        select 1
        from public.posts p
        where p.id = post_reply_permissions.post_id
          and p.user_id = auth.uid()
    )
    and user_id <> auth.uid()
);


create policy "Vinci reply permissions - delete"
on public.post_reply_permissions
for delete
to authenticated
using (
    exists (
        select 1
        from public.posts p
        where p.id = post_reply_permissions.post_id
          and p.user_id = auth.uid()
    )
);


-- ============================================================
-- 5. POLICIES — RESPOSTAS
--
-- Todos os usuários autenticados podem VER respostas.
-- Só responde quem:
--   a) é o autor da fotografia; OU
--   b) foi adicionado pelo autor em post_reply_permissions.
--
-- Uma resposta pode ser apagada por:
--   a) quem escreveu a resposta; OU
--   b) o autor da fotografia.
-- ============================================================

drop policy if exists "Vinci post replies - select"
    on public.post_replies;

drop policy if exists "Vinci post replies - insert"
    on public.post_replies;

drop policy if exists "Vinci post replies - delete"
    on public.post_replies;


create policy "Vinci post replies - select"
on public.post_replies
for select
to authenticated
using (true);


create policy "Vinci post replies - insert"
on public.post_replies
for insert
to authenticated
with check (
    user_id = auth.uid()
    and (
        exists (
            select 1
            from public.posts p
            where p.id = post_replies.post_id
              and p.user_id = auth.uid()
        )
        or exists (
            select 1
            from public.post_reply_permissions prp
            where prp.post_id = post_replies.post_id
              and prp.user_id = auth.uid()
        )
    )
);


create policy "Vinci post replies - delete"
on public.post_replies
for delete
to authenticated
using (
    user_id = auth.uid()
    or exists (
        select 1
        from public.posts p
        where p.id = post_replies.post_id
          and p.user_id = auth.uid()
    )
);


-- ============================================================
-- 6. GRANTS
-- ============================================================

grant select, insert, delete
on public.post_reply_permissions
to authenticated;

grant select, insert, delete
on public.post_replies
to authenticated;


-- ============================================================
-- PRONTO.
--
-- COMPORTAMENTO:
-- - lista vazia = só o autor pode responder;
-- - usuário adicionado = pode responder;
-- - usuário removido = não pode enviar novas respostas;
-- - apagar o post apaga permissões e respostas automaticamente;
-- - RLS protege o sistema mesmo se alguém tentar usar o console.
-- ============================================================
