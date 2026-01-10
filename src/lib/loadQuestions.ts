import type {
  TestType,
  ListeningTest,
  ReadingTest,
  WritingTest,
  SpeakingTest,
} from "@/types/questions";

// Utility functions to load question sets from `public/questions`.
// Files are served at `/questions/<testType>/...` when the dev server builds the site.

export async function listAvailableTests(testType: TestType): Promise<string[]> {
  const idxPath = `/questions/${testType}/index.json`;
  const res = await fetch(idxPath);
  if (!res.ok) throw new Error(`Failed to load index for ${testType}: ${res.statusText}`);
  const list = await res.json();
  return Array.isArray(list) ? list : [];
}

export async function loadQuestions(testType: "listening", filename: string): Promise<ListeningTest>;
export async function loadQuestions(testType: "reading", filename: string): Promise<ReadingTest>;
export async function loadQuestions(testType: "writing", filename: string): Promise<WritingTest>;
export async function loadQuestions(testType: "speaking", filename: string): Promise<SpeakingTest>;
export async function loadQuestions(testType: TestType, filename: string): Promise<any> {
  const url = `/questions/${testType}/${filename}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${testType} questions: ${res.statusText}`);
  return await res.json();
}

// Convenience: load the first available test for a type
export async function loadFirstAvailable(testType: TestType): Promise<any> {
  const list = await listAvailableTests(testType);
  if (!list.length) throw new Error(`No tests available for ${testType}`);
  const url = `/questions/${testType}/${list[0]}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${testType} questions: ${res.statusText}`);
  return await res.json();
}

// Example usage (to show types):
// const listening = await loadFirstAvailable('listening') as ListeningTest;
