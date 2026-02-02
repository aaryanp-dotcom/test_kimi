-- MindSpace Teletherapy Platform - Supabase Database Schema
-- Run this in the Supabase SQL Editor

-- =====================================================
-- EXTENSIONS
-- =====================================================
extension if not exists "uuid-ossp";

-- =====================================================
-- TABLE: profiles (lowercase)
-- Purpose: Stores user and therapist profile information (extends Supabase Auth)
-- =====================================================
create table if not exists public.profiles (
    user_id uuid primary key not null references auth.users(id) on delete cascade,
    email text not null,
    role text not null check (role in ('user', 'therapist', 'admin')),
    full_name text null,
    phone text null,
    date_of_birth date null,
    gender text null,
    city text null,
    address text null,
    emergency_contact_name text null,
    emergency_contact_phone text null,
    profile_picture_url text null,
    status text null,
    approved boolean null,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- =====================================================
-- TABLE: Therapists (Capital T)
-- Purpose: Therapist-specific professional information
-- =====================================================
create table if not exists public."Therapists" (
    id uuid primary key not null,  -- same value as auth user id
    user_id uuid not null references public.profiles(user_id) on delete cascade,
    "Name" text not null,
    email text not null,
    phone text null,
    "Specialization" text not null,
    fee integer not null check (fee >= 0),
    bio text null,
    experience integer null check (experience >= 0),
    license text null,
    "Active" boolean default true,
    approval_status text default 'pending' check (approval_status in ('pending', 'approved', 'rejected')),
    created_at timestamp with time zone default now()
);

-- =====================================================
-- TABLE: Bookings (Capital B)
-- Purpose: Stores all therapy session bookings/appointments
-- =====================================================
create table if not exists public."Bookings" (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(user_id) on delete cascade,
    therapist_id uuid not null references public."Therapists"(id) on delete cascade,
    session_date date not null,
    start_time text not null,
    end_time text null,
    amount integer not null check (amount >= 0),
    status text default 'pending' check (status in ('pending', 'confirmed', 'completed', 'cancelled', 'rejected')),
    patient_name text null,
    patient_email text null,
    problem_description text null,
    meeting_link text null,
    session_notes text null,
    next_session_notes text null,
    reschedule_requested boolean default false,
    reschedule_new_date date null,
    reschedule_new_start_time text null,
    reschedule_reason text null,
    therapist_reschedule_requested boolean default false,
    therapist_reschedule_date date null,
    therapist_reschedule_time text null,
    therapist_reschedule_reason text null,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_email on public.profiles(email);

create index if not exists idx_therapists_user_id on public."Therapists"(user_id);
create index if not exists idx_therapists_approval_status on public."Therapists"(approval_status);
create index if not exists idx_therapists_active on public."Therapists"("Active");
create index if not exists idx_therapists_specialization on public."Therapists"("Specialization");

create index if not exists idx_bookings_user_id on public."Bookings"(user_id);
create index if not exists idx_bookings_therapist_id on public."Bookings"(therapist_id);
create index if not exists idx_bookings_status on public."Bookings"(status);
create index if not exists idx_bookings_session_date on public."Bookings"(session_date);

-- =====================================================
-- TRIGGER FUNCTION: auto-update updated_at
-- =====================================================
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Apply trigger to profiles
create trigger update_profiles_updated_at
    before update on public.profiles
    for each row
    execute function public.update_updated_at_column();

-- Apply trigger to Bookings
create trigger update_bookings_updated_at
    before update on public."Bookings"
    for each row
    execute function public.update_updated_at_column();

-- =====================================================
-- TRIGGER: Auto-create profile on auth user creation
-- =====================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (user_id, email, role, full_name)
    values (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data->>'role', 'user'),
        coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
    );
    return new;
end;
$$ language plpgsql security definer;

-- Trigger on auth.users
create trigger on_auth_user_created
    after insert on auth.users
    for each row
    execute function public.handle_new_user();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) - Enable on all tables
-- =====================================================

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Enable RLS on Therapists
alter table public."Therapists" enable row level security;

-- Enable RLS on Bookings
alter table public."Bookings" enable row level security;

-- =====================================================
-- RLS POLICIES: profiles
-- =====================================================

-- Policy: Users can select their own profile
create policy "Users can view own profile"
    on public.profiles
    for select
    using (auth.uid() = user_id);

-- Policy: Users can update their own profile
create policy "Users can update own profile"
    on public.profiles
    for update
    using (auth.uid() = user_id);

-- Policy: Admin can select all profiles
create policy "Admin can view all profiles"
    on public.profiles
    for select
    using (
        exists (
            select 1 from public.profiles
            where user_id = auth.uid() and role = 'admin'
        )
    );

-- Policy: Admin can update all profiles
create policy "Admin can update all profiles"
    on public.profiles
    for update
    using (
        exists (
            select 1 from public.profiles
            where user_id = auth.uid() and role = 'admin'
        )
    );

-- Policy: Allow insert during signup (handled by trigger, but explicit policy for safety)
create policy "Allow insert during signup"
    on public.profiles
    for insert
    with check (auth.uid() = user_id);

-- =====================================================
-- RLS POLICIES: Therapists
-- =====================================================

-- Policy: Public can select approved and active therapists
create policy "Public can view approved active therapists"
    on public."Therapists"
    for select
    using (approval_status = 'approved' and "Active" = true);

-- Policy: Therapist can select their own therapist row
create policy "Therapist can view own therapist record"
    on public."Therapists"
    for select
    using (auth.uid() = id or auth.uid() = user_id);

-- Policy: Therapist can update their own therapist row
create policy "Therapist can update own therapist record"
    on public."Therapists"
    for update
    using (auth.uid() = id or auth.uid() = user_id);

-- Policy: Admin can select all therapists
create policy "Admin can view all therapists"
    on public."Therapists"
    for select
    using (
        exists (
            select 1 from public.profiles
            where user_id = auth.uid() and role = 'admin'
        )
    );

-- Policy: Admin can update all therapists (including approval_status)
create policy "Admin can update all therapists"
    on public."Therapists"
    for update
    using (
        exists (
            select 1 from public.profiles
            where user_id = auth.uid() and role = 'admin'
        )
    );

-- Policy: Allow insert during therapist signup
create policy "Allow insert during therapist signup"
    on public."Therapists"
    for insert
    with check (auth.uid() = id);

-- =====================================================
-- RLS POLICIES: Bookings
-- =====================================================

-- Policy: User can insert bookings for themselves
create policy "Users can insert own bookings"
    on public."Bookings"
    for insert
    with check (auth.uid() = user_id);

-- Policy: User can select their own bookings
create policy "Users can view own bookings"
    on public."Bookings"
    for select
    using (auth.uid() = user_id);

-- Policy: User can update their own bookings (cancel, request reschedule)
create policy "Users can update own bookings"
    on public."Bookings"
    for update
    using (auth.uid() = user_id);

-- Policy: Therapist can select bookings assigned to them
create policy "Therapist can view assigned bookings"
    on public."Bookings"
    for select
    using (auth.uid() = therapist_id);

-- Policy: Therapist can update bookings assigned to them
create policy "Therapist can update assigned bookings"
    on public."Bookings"
    for update
    using (auth.uid() = therapist_id);

-- Policy: Admin can select all bookings
create policy "Admin can view all bookings"
    on public."Bookings"
    for select
    using (
        exists (
            select 1 from public.profiles
            where user_id = auth.uid() and role = 'admin'
        )
    );

-- Policy: Admin can update all bookings
create policy "Admin can update all bookings"
    on public."Bookings"
    for update
    using (
        exists (
            select 1 from public.profiles
            where user_id = auth.uid() and role = 'admin'
        )
    );

-- Policy: Admin can delete bookings
create policy "Admin can delete bookings"
    on public."Bookings"
    for delete
    using (
        exists (
            select 1 from public.profiles
            where user_id = auth.uid() and role = 'admin'
        )
    );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to check if user is admin
create or replace function public.is_admin(user_uuid uuid)
returns boolean as $$
begin
    return exists (
        select 1 from public.profiles
        where user_id = user_uuid and role = 'admin'
    );
end;
$$ language plpgsql security definer;

-- Function to get user role
create or replace function public.get_user_role(user_uuid uuid)
returns text as $$
declare
    user_role text;
begin
    select role into user_role from public.profiles
    where user_id = user_uuid;
    return user_role;
end;
$$ language plpgsql security definer;

-- =====================================================
-- SAMPLE DATA (Optional - for testing)
-- =====================================================

-- Note: To create an admin user:
-- 1. Sign up a user through the app
-- 2. Run this SQL in Supabase SQL Editor:
--    UPDATE public.profiles SET role = 'admin' WHERE email = 'your-email@example.com';

-- =====================================================
-- END OF SCHEMA
-- =====================================================
