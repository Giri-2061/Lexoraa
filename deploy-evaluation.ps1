# Quick Deployment Script for Gemini Writing Evaluation
# Run this after you've obtained your Gemini API key

Write-Host "🚀 Deploying Gemini Writing Evaluation System..." -ForegroundColor Green
Write-Host ""

# Check if Supabase CLI is available
$supabaseExists = Get-Command npx -ErrorAction SilentlyContinue
if (-not $supabaseExists) {
    Write-Host "❌ Error: npx not found. Please install Node.js first." -ForegroundColor Red
    exit 1
}

Write-Host "📝 Step 1: Setting Gemini API Key" -ForegroundColor Yellow
Write-Host "Please enter your Gemini API key (from https://aistudio.google.com/app/apikey):"
$apiKey = Read-Host "API Key"

if ([string]::IsNullOrWhiteSpace($apiKey)) {
    Write-Host "❌ No API key provided. Exiting." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Setting secret in Supabase..." -ForegroundColor Cyan
npx supabase secrets set GEMINI_API_KEY=$apiKey

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to set API key. Please login first with: npx supabase login" -ForegroundColor Red
    exit 1
}

Write-Host "✅ API key set successfully!" -ForegroundColor Green
Write-Host ""

Write-Host "📊 Step 2: Applying database migration..." -ForegroundColor Yellow
npx supabase db push

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to apply migration." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Database migration applied!" -ForegroundColor Green
Write-Host ""

Write-Host "☁️ Step 3: Deploying Edge Function..." -ForegroundColor Yellow
npx supabase functions deploy evaluate-writing

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to deploy function." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Edge function deployed!" -ForegroundColor Green
Write-Host ""

Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Follow the instructions in INTEGRATION_INSTRUCTIONS.md"
Write-Host "2. Add the evaluation UI to your WritingTest component"
Write-Host "3. Test with a sample essay"
Write-Host ""
Write-Host "Need help? Check SETUP_CHECKLIST.md for troubleshooting tips." -ForegroundColor Gray
