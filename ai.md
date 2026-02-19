# AI Functions & Model Usage

All AI calls go through **Groq** (`api.groq.com`). The single API key used is `GROQ_API_KEY`.

---

## 1. Writing Evaluation

| | |
|---|---|
| **Edge Function** | `supabase/functions/evaluate-writing/index.ts` |
| **Purpose** | Score IELTS Writing Task 1 & Task 2 essays on four criteria (Task Achievement, Coherence & Cohesion, Lexical Resource, Grammar Accuracy) |
| **Called from** | `src/utils/writingEvaluation.ts` → `evaluateWriting()` |
| **Temperature** | `0.1` |
| **max_tokens** | `2000` |

### Models used

| Condition | Model | Type |
|---|---|---|
| Task 1 **with** chart/graph image | `meta-llama/llama-4-scout-17b-16e-instruct` | Vision |
| Task 2, or Task 1 without image | `llama-3.3-70b-versatile` | Text |

---

## 2. Handwriting OCR Transcription

| | |
|---|---|
| **Edge Function** | `supabase/functions/transcribe-handwriting/index.ts` |
| **Purpose** | Transcribe handwritten student answers from uploaded photos into text — strictly preserves all errors for fair evaluation |
| **Called from** | `src/utils/writingEvaluation.ts` → `transcribeHandwriting()` |
| **Model** | `meta-llama/llama-4-scout-17b-16e-instruct` (Vision) |
| **Temperature** | `0.1` |
| **max_tokens** | `3000` |

---

## 3. Speaking Evaluation

| | |
|---|---|
| **Edge Function** | `supabase/functions/evaluate-speaking/index.ts` |
| **Purpose** | Transcribe student audio recordings, then score on IELTS Speaking criteria (Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, Pronunciation) |
| **Called from** | `src/utils/speakingEvaluation.ts` → `evaluateSpeaking()` and direct `fetch()` in `SpeakingTest.tsx` / `SpeakingTestAIExaminer.tsx` |

### Models used (two calls per evaluation)

| Step | Model | Endpoint | Parameters |
|---|---|---|---|
| Audio Transcription | `whisper-large-v3` | `/audio/transcriptions` | `response_format: 'verbose_json'`, `language: 'en'` |
| Scoring | `llama-3.3-70b-versatile` | `/chat/completions` | `temperature: 0.1`, `max_tokens: 3000` |

---

## Groq Free Tier Limits

Groq free tier rate limits (as of February 2026):

### Per-model limits

| Model | Requests/min | Requests/day | Tokens/min | Tokens/day |
|---|---|---|---|---|
| `llama-3.3-70b-versatile` | 30 | 14,400 | 6,000 | 500,000 |
| `meta-llama/llama-4-scout-17b-16e-instruct` | 30 | 14,400 | 6,000 | 500,000 |
| `whisper-large-v3` | 20 | 2,000 | — | — |

> **Note:** Limits may change. Check [console.groq.com](https://console.groq.com) for current values.

---

## Usage Estimation per Student

### Writing Test (full submission — Task 1 + Task 2)
- **2 API calls** (1 per task) to `evaluate-writing`
- Each call uses ~500–1,500 tokens (prompt + system prompt + response)
- Estimated **~3,000 tokens total** per full writing test

### Writing Test with Handwriting OCR
- **+1 or +2 calls** to `transcribe-handwriting` (1 per uploaded image)
- Each OCR call uses ~500–2,000 tokens
- Estimated **~5,000 tokens total** per writing test with 2 handwritten uploads

### Speaking Test (full submission — Parts 1–3)
- **2 API calls**: 1 transcription (Whisper) + 1 scoring (Llama)
- Transcription: counted by audio duration, not tokens
- Scoring: ~2,000–3,000 tokens
- Estimated **~2,500 tokens** for the LLM scoring call

---

## How Many Students Can Use Each Feature Per Day (Free Tier)

### Writing Evaluation (`llama-3.3-70b-versatile` — 14,400 req/day, 500K tokens/day)

| Scenario | Requests/student | Max students/day |
|---|---|---|
| 1 task evaluated | 1 | **14,400** |
| Full test (Task 1 + Task 2) | 2 | **7,200** |
| Token-limited (full test ~3K tokens) | 2 | **~166** (500K ÷ 3K) |

**Bottleneck:** Token limit — approximately **166 full writing tests per day**.

### Handwriting OCR (`llama-4-scout` — 14,400 req/day, 500K tokens/day)

| Scenario | Requests/student | Max students/day |
|---|---|---|
| 1 image transcribed | 1 | **14,400** |
| 2 images (Task 1 + Task 2) | 2 | **7,200** |
| Token-limited (~2K tokens per image) | 2 | **~125** (500K ÷ 4K) |

**Bottleneck:** Token limit — approximately **125 students transcribing 2 images per day**.

### Speaking Evaluation (Whisper — 2,000 req/day)

| Scenario | Requests/student | Max students/day |
|---|---|---|
| Full speaking test | 1 transcription + 1 scoring | **2,000** (Whisper is the bottleneck) |

**Bottleneck:** Whisper request limit — **2,000 speaking tests per day**.

### Rate Limit (requests/minute — all models)

| Model | Req/min | Max concurrent students/min |
|---|---|---|
| `llama-3.3-70b-versatile` | 30 | ~15 (2 calls each) |
| `llama-4-scout-17b-16e-instruct` | 30 | ~15 (2 images each) |
| `whisper-large-v3` | 20 | 20 |

---

## Monthly Estimates (Free Tier)

| Feature | Daily capacity | Monthly capacity (30 days) |
|---|---|---|
| Writing evaluations (full test) | ~166 | **~4,980** |
| Handwriting OCR (2 images) | ~125 | **~3,750** |
| Speaking evaluations | ~2,000 | **~60,000** |

---

## Recommendations for Scaling

1. **Upgrade to Groq paid tier** — removes daily token caps and increases rate limits significantly
2. **Add request queuing** — batch submissions during off-peak hours to stay within per-minute rate limits
3. **Cache evaluations** — already implemented (results saved to `writing_evaluations` and `test_results` tables), prevents re-evaluation of the same submission
4. **Fallback model** — if `llama-3.3-70b-versatile` hits limits, consider falling back to a smaller model for non-critical evaluations
