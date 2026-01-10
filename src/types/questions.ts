// TypeScript types for question bank JSON schemas

export type TestType = "listening" | "reading" | "writing" | "speaking";

// Listening schema
export type ListeningQuestionType =
  | "multiple-choice"
  | "form-completion"
  | "matching";

export interface ListeningMatchingPair {
  left: string;
  rightOptions: string[];
}

export interface ListeningQuestion {
  id: string;
  type: ListeningQuestionType;
  question?: string;
  options?: string[];
  correctOptionIndex?: number | null;
  answerLength?: "short" | "medium";
  pairs?: ListeningMatchingPair[];
}

export interface ListeningSection {
  sectionNumber: number;
  audioUrl: string;
  questions: ListeningQuestion[];
}

export interface ListeningTest {
  testId: string;
  sections: ListeningSection[];
}

// Reading schema
export type ReadingQuestionType =
  | "multiple-choice"
  | "true-false-notgiven"
  | "matching-headings";

export interface ReadingQuestion {
  id: string;
  type: ReadingQuestionType;
  question?: string;
  statement?: string;
  headings?: string[];
  options?: string[];
  correctOptionIndex?: number | null;
}

export interface ReadingPassage {
  id: string;
  title: string;
  textFile: string; // path to passage text file (served from public)
  questions: ReadingQuestion[];
}

export interface ReadingTest {
  testId: string;
  passages: ReadingPassage[];
}

// Writing schema
export interface WritingTask {
  taskId: number;
  type: string;
  instruction: string;
  prompt: string;
  imageUrl?: string;
  minWords: number;
  suggestedTime: string;
}

export interface WritingTest {
  testId: string;
  writing: WritingTask[];
}

// Speaking schema
export interface SpeakingPart1Topic {
  theme: string;
  introduction: string;
  questions: string[];
}

export interface SpeakingCueCard {
  topic: string;
  instruction: string;
  points: string[];
  conclusion: string;
  prepTime: number;
  speakTime: number;
}

export interface SpeakingPart3Question {
  question: string;
  followUp?: string;
}

export interface SpeakingTest {
  testId: string;
  part1: { 
    topics: SpeakingPart1Topic[];
  };
  part2: { 
    cueCard: SpeakingCueCard;
    followUpQuestions: string[];
  };
  part3: { 
    theme: string;
    introduction: string;
    questions: SpeakingPart3Question[];
  };
}

// Union type for convenience
export type AnyTest = ListeningTest | ReadingTest | WritingTest | SpeakingTest;
