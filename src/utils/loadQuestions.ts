import type { ListeningTest, ReadingTest, WritingTest, SpeakingTest } from "@/types/questions";

export async function loadQuestions(
  testType: "listening" | "reading" | "writing" | "speaking",
  testId: string
): Promise<ListeningTest | ReadingTest | WritingTest | SpeakingTest> {
  const folder = `${testType}_questions`;
  
  // Handle speaking tests with simpler path structure
  if (testType === "speaking") {
    // testId formats: "speaking-test-1", "1", "cambridge08-test1", or undefined
    let finalTestNum = "1"; // Default
    if (testId) {
      // If it contains "-test", extract the number after it
      const testMatch = testId.match(/-test(\d+)/);
      if (testMatch) {
        finalTestNum = testMatch[1];
      } else {
        // Otherwise just get the last digit(s)
        const digits = testId.match(/\d+$/);
        finalTestNum = digits ? digits[0] : "1";
      }
    }
    const url = `/questions/${folder}/test${finalTestNum}.json`;
    console.log("Loading speaking test from:", url);
    const res = await fetch(url);
    console.log("Response status:", res.status, res.ok);
    if (!res.ok) throw new Error(`Failed to load speaking questions from ${url}`);
    return res.json();
  }
  
  // Original format for listening/reading/writing: book13-test1
  const [bookPart, testPart] = testId.split('-test');
  const book = bookPart.replace('book', '');
  const test = testPart;
  const res = await fetch(`/questions/${folder}/book${book}/test${test}.json`);
  if (!res.ok) throw new Error("Failed to load questions");
  return res.json();
}
