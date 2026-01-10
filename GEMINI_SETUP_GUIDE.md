## Step-by-Step Guide: Implementing Free Gemini Writing Evaluation

### Step 1: Get Your Free Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click **"Get API Key"** → **"Create API Key"**
4. Copy the API key (starts with `AIza...`)
5. **No credit card required!** Completely free.

### Step 2: Add API Key to Supabase

Open your terminal and run:

```bash
# Login to Supabase (if not already logged in)
npx supabase login

# Set the Gemini API key as a secret
npx supabase secrets set GEMINI_API_KEY=your_api_key_here
```

Replace `your_api_key_here` with the actual API key you copied.

### Step 3: Deploy Database Migration

Run this command to create the writing_evaluations table:

```bash
npx supabase db push
```

This will apply the migration file that creates the table for storing evaluations.

### Step 4: Deploy the Edge Function

```bash
# Deploy the evaluate-writing function
npx supabase functions deploy evaluate-writing
```

### Step 5: Test the Function (Optional)

You can test it with curl:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/evaluate-writing \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "essayText": "Your essay text here...",
    "taskType": "Task 2",
    "prompt": "Some people believe...",
    "testId": "book16-test1",
    "taskNumber": 2
  }'
```

### Step 6: Add Frontend Integration

I'll now create the frontend components to use this evaluation system.

### Key Files Created:

✅ **supabase/functions/evaluate-writing/index.ts** - Edge function for AI evaluation
✅ **supabase/migrations/[timestamp]_create_writing_evaluations.sql** - Database schema

### Next Steps:

1. Get your Gemini API key (takes 2 minutes)
2. Run the commands above to deploy
3. I'll create the frontend UI components

Ready to continue with the frontend integration?
