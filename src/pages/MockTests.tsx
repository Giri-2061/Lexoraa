import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Headphones, BookOpen, PenTool, Mic, Clock, FileText, CheckCircle } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";

const testTypes = [
  {
    id: "listening",
    title: "Listening Test",
    icon: Headphones,
    duration: "30 minutes",
    questions: "40 questions",
    description: "The IELTS Listening test consists of four recorded monologues and conversations. You'll hear a range of accents including British, Australian, New Zealand, American, and Canadian.",
    format: [
      "Section 1: Conversation between two people in an everyday social context",
      "Section 2: Monologue in an everyday social context",
      "Section 3: Conversation between up to four people in an educational context",
      "Section 4: Monologue on an academic subject"
    ],
    scoring: "Each correct answer receives one mark. Scores are reported in whole and half bands.",
    color: "bg-blue-500",
    link: "/listening/cambridge-08"
  },
  {
    id: "reading",
    title: "Reading Test",
    icon: BookOpen,
    duration: "60 minutes",
    questions: "40 questions",
    description: "The IELTS Reading test features three long texts which range from descriptive and factual to discursive and analytical. Texts are taken from books, journals, magazines, and newspapers.",
    format: [
      "3 sections with increasing difficulty",
      "Variety of question types: multiple choice, identifying information, matching headings, sentence completion, and more",
      "Texts are authentic and taken from real publications",
      "Academic topics of general interest suitable for test takers"
    ],
    scoring: "Each correct answer receives one mark. Band scores are calculated from the total marks.",
    color: "bg-green-500",
    link: "/reading/cambridge-08"
  },
  {
    id: "writing",
    title: "Writing Test",
    icon: FileText,
    duration: "60 minutes",
    questions: "2 tasks",
    description: "The IELTS Writing test requires you to complete two tasks. Task 1 requires you to describe visual information, while Task 2 is an essay in response to a point of view, argument or problem.",
    format: [
      "Task 1: Describe, summarize or explain information in a graph, table, chart or diagram (minimum 150 words)",
      "Task 2: Write an essay in response to a point of view, argument or problem (minimum 250 words)",
      "Suggested time: 20 minutes for Task 1, 40 minutes for Task 2",
      "Both tasks must be completed to get a band score"
    ],
    scoring: "Task 2 carries more weight. Assessed on task achievement, coherence, vocabulary, and grammar.",
    color: "bg-amber-500",
    link: "/writing/cambridge-08"
  },
  {
    id: "speaking",
    title: "Speaking Test",
    icon: Mic,
    duration: "11-14 minutes",
    questions: "3 parts",
    description: "The IELTS Speaking test is a one-to-one conversation with a certified examiner. It assesses your use of spoken English through three parts.",
    format: [
      "Part 1: Introduction and interview (4-5 minutes) - familiar topics like home, family, work, studies",
      "Part 2: Long turn (3-4 minutes) - speak about a particular topic based on a task card",
      "Part 3: Discussion (4-5 minutes) - further discussion of the topic in Part 2"
    ],
    scoring: "Assessed on fluency, vocabulary, grammar, and pronunciation. Band scores from 0 to 9.",
    color: "bg-purple-500",
    link: "/speaking/cambridge-08"
  }
];

const MockTests = () => {
  const [searchParams] = useSearchParams();
  const [completedTests, setCompletedTests] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Check for completed test from URL params
    const completed = searchParams.get('completed');
    if (completed) {
      setCompletedTests(prev => new Set([...prev, completed]));
    }

    // Load from localStorage
    const saved = localStorage.getItem('completedTests');
    if (saved) {
      setCompletedTests(new Set(JSON.parse(saved)));
    }
  }, [searchParams]);

  useEffect(() => {
    // Save to localStorage
    localStorage.setItem('completedTests', JSON.stringify([...completedTests]));
  }, [completedTests]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4">IELTS Mock Tests</h1>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Practice with our comprehensive IELTS mock tests designed to simulate the actual exam experience. Each test follows the official IELTS format and timing.
            </p>
          </div>

          {/* Test Overview Cards */}
      <div className="grid md:grid-cols-4 gap-4 mb-12">
        {testTypes.map((test, index) => {
              const Icon = test.icon;
              const isCompleted = completedTests.has(test.id);
              
              return (
                <Link key={test.id} to={test.link}>
                  <Card 
                    className={cn(
                      "p-4 border-2 cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
                      isCompleted && "border-green-500 bg-green-50 dark:bg-green-950/20"
                    )}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        isCompleted ? "bg-green-500" : `${test.color} bg-opacity-10`
                      )}>
                        {isCompleted ? (
                          <CheckCircle className="w-5 h-5 text-white" />
                        ) : (
                          <Icon className={`w-5 h-5 ${test.color.replace('bg-', 'text-')}`} />
                        )}
                      </div>
                      <h3 className={cn(
                        "font-semibold",
                        isCompleted ? "text-green-700 dark:text-green-400" : "text-card-foreground"
                      )}>
                        {test.title}
                      </h3>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{test.duration}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <span>{test.questions}</span>
                      </div>
                    </div>
                    {isCompleted && (
                      <div className="mt-2 text-xs text-green-700 dark:text-green-400 font-medium">
                        ✓ Completed
                      </div>
                    )}
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MockTests;
