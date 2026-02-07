-- Create speaking_evaluations table
CREATE TABLE IF NOT EXISTS public.speaking_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  test_id TEXT NOT NULL,
  
  -- Scores
  fluency_coherence_score DECIMAL(2,1) CHECK (fluency_coherence_score BETWEEN 0 AND 9),
  lexical_resource_score DECIMAL(2,1) CHECK (lexical_resource_score BETWEEN 0 AND 9),
  grammatical_range_score DECIMAL(2,1) CHECK (grammatical_range_score BETWEEN 0 AND 9),
  pronunciation_score DECIMAL(2,1) CHECK (pronunciation_score BETWEEN 0 AND 9),
  overall_score DECIMAL(2,1) CHECK (overall_score BETWEEN 0 AND 9),
  
  -- Transcripts
  transcript_part1 TEXT,
  transcript_part2 TEXT,
  transcript_part3 TEXT,
  
  -- Detailed Analysis (JSONB)
  fluency_metrics JSONB,
  grammar_analysis JSONB,
  vocabulary_analysis JSONB,
  pronunciation_analysis JSONB,
  fluency_coherence_data JSONB,
  lexical_resource_data JSONB,
  grammatical_range_data JSONB,
  pronunciation_data JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS
ALTER TABLE public.speaking_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own speaking evaluations"
ON public.speaking_evaluations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own speaking evaluations"
ON public.speaking_evaluations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Teachers can view all speaking evaluations"
ON public.speaking_evaluations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('consultancy_owner', 'super_admin')
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_speaking_evaluations_user_id ON public.speaking_evaluations(user_id);
CREATE INDEX IF NOT EXISTS idx_speaking_evaluations_test_id ON public.speaking_evaluations(test_id);
CREATE INDEX IF NOT EXISTS idx_speaking_evaluations_created_at ON public.speaking_evaluations(created_at DESC);
