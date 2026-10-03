-- شغّل هذا السكريبت داخل Supabase: SQL Editor > New Query

create table if not exists candidates (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  email text not null,
  linkedin_url text,
  current_title text,
  current_employer text,
  years_of_experience text not null,
  field text not null,
  category text not null check (category in ('توظيف', 'إعارة')),
  cv_file_url text not null,
  cv_file_path text not null,
  ai_score numeric,
  ai_summary text,
  ai_strengths jsonb default '[]'::jsonb,
  ai_concerns jsonb default '[]'::jsonb,
  status text default 'pending', -- pending | analyzed
  created_at timestamptz default now()
);

-- تفعيل أمان مستوى الصف
alter table candidates enable row level security;

-- السماح لأي شخص (حتى بدون تسجيل دخول) بإدخال بياناته عبر فورم التقديم
create policy "Anyone can insert their application"
  on candidates for insert
  to anon
  with check (true);

-- السماح فقط للمستخدمين المسجلين (الأخصائية) بقراءة/تعديل البيانات
create policy "Authenticated users can view candidates"
  on candidates for select
  to authenticated
  using (true);

create policy "Authenticated users can update candidates"
  on candidates for update
  to authenticated
  using (true);

-- ==========================================
-- إعداد تخزين ملفات السيرة الذاتية (Storage)
-- ==========================================
-- من واجهة Supabase: Storage > Create a new bucket باسم "cvs" واجعله Public
-- بعد إنشاء الـ bucket، شغّل السياسات التالية:

insert into storage.buckets (id, name, public)
values ('cvs', 'cvs', true)
on conflict (id) do nothing;

create policy "Anyone can upload a CV"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'cvs');

create policy "Anyone can read CV files via public URL"
  on storage.objects for select
  to public
  using (bucket_id = 'cvs');
