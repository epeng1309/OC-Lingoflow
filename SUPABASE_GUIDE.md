# Supabase Integration Guide

## Overview

Supabase is an open-source Firebase alternative that provides a relational database (PostgreSQL), Authentication, and Realtime subscriptions—everything you need for a robust backend.

## Prerequisite

You will need a Supabase account. You can sign up for free at [supabase.com](https://supabase.com).

## Step-by-Step Setup

1.  **Create a Project**
    *   Log in to Supabase and click "New Project".
    *   Name it `LingoFlow` and choose a strong password.
    *   Select a region close to you.

2.  **Create the Database Schema**
    *   Go to the **SQL Editor** in the left sidebar.
    *   Click "New Query" and paste the following SQL to create your tables:

```sql
-- Create a table for Decks
create table decks (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  title text not null,
  subtitle text,
  icon text default 'folder',
  user_id uuid references auth.users not null
);

-- Create a table for Words
create table words (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  deck_id uuid references decks(id) on delete cascade not null,
  original text not null,
  translated text not null,
  type text default 'Term',
  image_url text,
  group_name text,
  user_id uuid references auth.users not null
);

-- Turn on Row Level Security (RLS) so users only see their own data
alter table decks enable row level security;
alter table words enable row level security;

-- Create policies
create policy "Users can see their own decks" on decks for select using (auth.uid() = user_id);
create policy "Users can insert their own decks" on decks for insert with check (auth.uid() = user_id);
create policy "Users can update their own decks" on decks for update using (auth.uid() = user_id);
create policy "Users can delete their own decks" on decks for delete using (auth.uid() = user_id);

create policy "Users can see their own words" on words for select using (auth.uid() = user_id);
create policy "Users can insert their own words" on words for insert with check (auth.uid() = user_id);
create policy "Users can update their own words" on words for update using (auth.uid() = user_id);
create policy "Users can delete their own words" on words for delete using (auth.uid() = user_id);
```

3.  **Get API Keys**
    *   Go to **Project Settings > API**.
    *   Copy the `Project URL` and `anon public` key.

4.  **Connect LingoFlow**
    *   Let me know when you have these keys! I will update the app to use the specific Supabase client library and authentication flow.

## Why upgrade to Supabase?
*   **Sync**: Access your vocabulary on your phone, tablet, and computer.
*   **Security**: Your data is backed up in the cloud.
*   **Sharing**: In the future, you could share decks with friends.
