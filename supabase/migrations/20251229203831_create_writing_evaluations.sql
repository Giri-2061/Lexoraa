-- Create writing_evaluations table
create table if not exists writing_evaluations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  test_id text not null,
  task_number int not null check (task_number in (1, 2)),
  essay_text text not null,
  
  -- IELTS Scores (0-9 with half bands)
  task_achievement_score decimal(2,1) check (task_achievement_score >= 0 and task_achievement_score <= 9),
  coherence_cohesion_score decimal(2,1) check (coherence_cohesion_score >= 0 and coherence_cohesion_score <= 9),
  lexical_resource_score decimal(2,1) check (lexical_resource_score >= 0 and lexical_resource_score <= 9),
  grammar_score decimal(2,1) check (grammar_score >= 0 and grammar_score <= 9),
  overall_band_score decimal(2,1) check (overall_band_score >= 0 and overall_band_score <= 9),
  
  -- Detailed feedback stored as JSON
  feedback jsonb,
  
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable Row Level Security
alter table writing_evaluations enable row level security;

-- Policy: Users can view their own evaluations
create policy "Users can view own evaluations"
  on writing_evaluations for select
  using (auth.uid() = user_id);

-- Policy: Users can insert their own evaluations
create policy "Users can insert own evaluations"
  on writing_evaluations for insert
  with check (auth.uid() = user_id);

-- Policy: Teachers can view all evaluations
create policy "Teachers can view all evaluations"
  on writing_evaluations for select
  using (
    exists (
      select 1 from user_roles
      where user_roles.user_id = auth.uid()
      and user_roles.role in ('consultancy_owner', 'super_admin')
    )
  );

-- Create index for faster queries
create index if not exists writing_evaluations_user_id_idx on writing_evaluations(user_id);
create index if not exists writing_evaluations_test_id_idx on writing_evaluations(test_id);
create index if not exists writing_evaluations_created_at_idx on writing_evaluations(created_at desc);

-- Add updated_at trigger
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_writing_evaluations_updated_at
  before update on writing_evaluations
  for each row
  execute function update_updated_at_column();
