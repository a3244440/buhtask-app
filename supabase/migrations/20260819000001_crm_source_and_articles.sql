-- ===== CRM: откуда пришёл пользователь (first-touch атрибуция) =====
-- Заполняется один раз при регистрации из данных, накопленных на клиенте
-- (см. lib/attribution.ts): UTM-метки рекламных кампаний, реферер и первая
-- страница входа. Это позволяет админу видеть в CRM, откуда пришёл каждый
-- клиент — реклама, поиск, соцсети или прямой заход.
alter table profiles add column if not exists utm_source text;
alter table profiles add column if not exists utm_medium text;
alter table profiles add column if not exists utm_campaign text;
alter table profiles add column if not exists utm_term text;
alter table profiles add column if not exists utm_content text;
alter table profiles add column if not exists referrer text;
alter table profiles add column if not exists landing_page text;

create index if not exists idx_profiles_utm_source on profiles(utm_source);

-- ===== SEO: статьи / новости для блога =====
create table if not exists articles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  meta_description text,
  excerpt text,
  content text not null,               -- markdown
  category text default 'news',        -- 'news' | 'guide' | 'update'
  source_name text,                    -- напр. "salyk.kz" — если новость по мотивам официального источника
  source_url text,
  cover_emoji text,                    -- маленькая эмодзи-иконка вместо картинки, чтобы не тянуть медиатеку
  author_id uuid references profiles(id) on delete set null,
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_articles_published on articles(published, published_at desc);
create index if not exists idx_articles_slug on articles(slug);

create trigger update_articles_updated_at before update on articles
  for each row execute function update_updated_at_column();

alter table articles enable row level security;

drop policy if exists "public_read_published_articles" on articles;
create policy "public_read_published_articles" on articles
  for select using (published = true);

drop policy if exists "admin_all_articles" on articles;
create policy "admin_all_articles" on articles
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  ) with check (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );
