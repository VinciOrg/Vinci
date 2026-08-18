-- =========================================================
-- VINCI 0.7.5 — MAIS FONTES NO PERFIL
-- Use este arquivo se você JÁ rodou o SQL da personalização 0.7.4.
-- Ele NÃO apaga personalizações existentes.
-- =========================================================

alter table public.profile_customization
    drop constraint if exists profile_customization_name_font_check;

alter table public.profile_customization
    add constraint profile_customization_name_font_check
    check (name_font in (
        'default',
        'elegant',
        'mono',
        'soft',
        'classic',
        'pixel',
        'arcade',
        'cute',
        'bubble',
        'script',
        'hand'
    ));
