import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Volume2, BookOpen, Pencil, Mic } from "lucide-react";
import TestHeader from "@/components/TestHeader";
import { useTestSession } from "@/hooks/useTestSession";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from '@/hooks/useAuth';
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Question {
  id: string;
  type: string;
  question: string;
  options?: string[];
  correctAnswer?: string;
  answerLength?: string;
  multipleSelect?: boolean;
}

interface Section {
  sectionNumber: number;
  audioUrl?: string;
  passageTitle?: string;
  passageContent?: string;
  passageText?: string; 
  questions: Question[];
}

interface ReadingTestData {
  testId: string;
  title: string;
  sections: Section[];
}

const createPlaceholderReadingTest = (testId: string): ReadingTestData => {
  const match = /^book(\d+)-test(\d+)$/i.exec(testId);
  const bookLabel = match ? `Book ${match[1]}` : "Reading";
  const testLabel = match ? `Test ${match[2]}` : "Practice";

  return {
    testId,
    title: `IELTS Academic Reading ${bookLabel} ${testLabel}`,
    sections: Array.from({ length: 3 }, (_, idx) => ({
      sectionNumber: idx + 1,
      passageTitle: `Passage ${idx + 1}`,
      passageContent: "Passage content coming soon.",
      questions: [],
    })),
  };
};

const ReadingTest = () => {
  const { user } = useAuth();
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const [test, setTest] = useState<ReadingTestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const [audioPlaying, setAudioPlaying] = useState<{ [key: number]: boolean }>({});
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [scoreResults, setScoreResults] = useState<{
    correctCount: number;
    totalQuestions: number;
    band: number;
    wrongQuestions: string[];
  } | null>(null);
  
  const durationMinutes = 60;
  const session = useTestSession(durationMinutes, {
    onConfirmExit: () => {
      session.setStarted(false);
      session.setTimeLeft(durationMinutes * 60);
      setAnswers({});
      setSubmitted(false);
      setShowAnswers(false);
      navigate('/mock-tests');
    }
  });

  useEffect(() => {
    if (!testId) {
      navigate('/mock-tests');
      return;
    }
    
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`/questions/reading/${testId}.json`);
        if (!res.ok) {
          console.warn('Reading test not found, loading placeholder instead:', testId, res.status);
          toast({ title: "Sample test loaded", description: "Official reading materials coming soon. A blank practice set is ready for you." });
          setTest(createPlaceholderReadingTest(testId));
          return;
        }

        // Attempt to parse JSON; provide better diagnostics on parse failure
        let data: ReadingTestData | null = null;
        try {
          data = await res.json();
        } catch (parseErr) {
          console.error('Failed to parse JSON for reading test', testId, parseErr);
          toast({ title: "Sample test loaded", description: "We could not read this test file, so a blank practice set is shown." });
          setTest(createPlaceholderReadingTest(testId));
          return;
        }

        setTest(data);
      } catch (err) {
        console.error('Error loading reading test', err);
        toast({ title: "Sample test loaded", description: "We could not load this test. A blank practice set is available offline." });
        setTest(createPlaceholderReadingTest(testId));
      } finally {
        setLoading(false);
      }
    })();
  }, [testId, navigate, toast]);

  const calculateBand = (correctCount: number): number => {
    if (correctCount >= 39) return 9;
    if (correctCount >= 37) return 8.5;
    if (correctCount >= 35) return 8;
    if (correctCount >= 32) return 7.5;
    if (correctCount >= 30) return 7;
    if (correctCount >= 26) return 6.5;
    if (correctCount >= 23) return 6;
    if (correctCount >= 18) return 5.5;
    if (correctCount >= 16) return 5;
    if (correctCount >= 13) return 4.5;
    if (correctCount >= 10) return 4;
    if (correctCount >= 6) return 3.5;
    if (correctCount >= 4) return 3;
    if (correctCount >= 3) return 2.5;
    if (correctCount >= 2) return 2;
    return 1;
  };

  const findCorrectAnswer = (questionId: string): string | string[] | undefined => {
    if (!test) return undefined;
    // Check top-level answers object (some imports store answers at root)
    if ((test as any).answers && (test as any).answers[questionId]) {
      return (test as any).answers[questionId];
    }

    // Check per-section answers if present
    for (const sec of test.sections) {
      if (sec && (sec as any).answers && (sec as any).answers[questionId]) {
        return (sec as any).answers[questionId];
      }
    }
    return undefined;
  };

  const onSubmit = async () => {
    if (!test) return;

    // Calculate score
    let correctCount = 0;
    const wrongQuestions: string[] = [];
    const totalQuestions = test.sections.reduce((sum, sec) => sum + sec.questions.length, 0);

    test.sections.forEach(section => {
      section.questions.forEach(q => {
        const correctAns = q.correctAnswer ?? findCorrectAnswer(q.id);
        if (correctAns) {
          const isCorrect = checkAnswer(q.id, answers[q.id], correctAns);
          if (isCorrect) {
            correctCount++;
          } else {
            wrongQuestions.push(q.id);
          }
        }
      });
    });

    const band = calculateBand(correctCount);
    setScoreResults({
      correctCount,
      totalQuestions,
      band,
      wrongQuestions
    });

    // Save result to Supabase test_results
    if (user && user.id) {
      const { error } = await supabase.from('test_results').insert({
        test_id: test.testId,
        test_type: 'reading',
        user_id: user.id,
        band_score: band,
        correct_count: correctCount,
        total_questions: totalQuestions,
        answers: answers,
        duration_minutes: durationMinutes,
        created_at: new Date().toISOString(),
      });
      if (error) {
        toast({ title: 'Failed to save result', description: error.message, variant: 'destructive' });
      }
    }
    const payload = {
      testId: test.testId,
      answers,
      submittedAt: new Date().toISOString(),
      score: { correctCount, totalQuestions, band }
    };
    console.log("Test submitted", payload);
    setSubmitted(true);
    setShowResultsModal(true);
  };

  const checkAnswer = (questionId: string, userAnswer: string | string[] | undefined, correctAnswer: string | string[] | undefined) => {
    if (!userAnswer) return false;
    // Normalize correctAnswer into an array of strings
    let correctAnswers: string[] = [];
    if (Array.isArray(correctAnswer)) {
      correctAnswers = correctAnswer.map(a => String(a).toLowerCase().trim());
    } else if (typeof correctAnswer === 'string') {
      correctAnswers = correctAnswer.split(',').map(a => a.toLowerCase().trim());
    }

    if (Array.isArray(userAnswer)) {
      const ua = userAnswer.map(a => String(a).toLowerCase().trim());
      return ua.length === correctAnswers.length && ua.every(a => correctAnswers.includes(a));
    }

    const userAnswerStr = String(userAnswer).toLowerCase().trim();
    return correctAnswers.includes(userAnswerStr);
  };

  const handleRedoTest = () => {
    setAnswers({});
    setSubmitted(false);
    setShowAnswers(false);
    setShowResultsModal(false);
    setScoreResults(null);
    session.setStarted(false);
    session.setTimeLeft(durationMinutes * 60);
  };

  return (
    <div className="min-h-screen bg-background">
      <TestHeader title={test?.title || "Reading Test"} session={session} />
      <main className="pt-32 sm:pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          {loading && <div className="text-center">Loading test...</div>}

          {!loading && !test && <div className="text-center text-destructive">Failed to load test.</div>}

          {test && !session.started && (
            <Card className="p-8 text-center max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold mb-4">{test.title}</h2>
              <p className="text-muted-foreground mb-6">
                This test has {test.sections.length} reading sections. 
                You will have {durationMinutes} minutes to complete all passages and questions.
              </p>
              <Button size="lg" onClick={() => session.setStarted(true)}>
                Begin Test
              </Button>
            </Card>
          )}

          {test && session.started && (
            <div className="space-y-6">
              {/* Results Modal */}
              <AlertDialog open={showResultsModal} onOpenChange={setShowResultsModal}>
                <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-2xl font-bold text-center">Test Results</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
                          <div className="text-center p-4 bg-primary/5 rounded-lg">
                            <div className="text-3xl font-bold text-primary">{scoreResults?.correctCount}/{scoreResults?.totalQuestions}</div>
                            <div className="text-sm text-muted-foreground mt-1">Correct Answers</div>
                          </div>
                          <div className="text-center p-4 bg-primary/5 rounded-lg">
                            <div className="text-3xl font-bold text-primary">Band {scoreResults?.band}</div>
                            <div className="text-sm text-muted-foreground mt-1">IELTS Band Score</div>
                          </div>
                          <div className="text-center p-4 bg-destructive/5 rounded-lg">
                            <div className="text-3xl font-bold text-destructive">{scoreResults?.wrongQuestions.length}</div>
                            <div className="text-sm text-muted-foreground mt-1">Wrong Answers</div>
                          </div>
                        </div>
                        
                        {scoreResults && scoreResults.wrongQuestions.length > 0 && (
                          <div className="mb-6 p-4 bg-destructive/5 rounded-lg">
                            <h4 className="font-semibold mb-2 text-destructive">Questions Answered Incorrectly:</h4>
                            <div className="flex flex-wrap gap-2">
                              {scoreResults.wrongQuestions.map(qId => (
                                <span key={qId} className="px-2 py-1 bg-background rounded text-sm">{qId}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="space-y-4">
                          <div className="flex items-center justify-between border-t pt-4">
                            <h4 className="font-semibold text-foreground">Test Other Skills:</h4>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <Button 
                              variant="outline" 
                              className="gap-2"
                              onClick={() => navigate('/test/reading/cambridge-08-test-1')}
                            >
                              <BookOpen className="w-4 h-4" />
                              Reading
                            </Button>
                            <Button 
                              variant="outline" 
                              className="gap-2"
                              onClick={() => navigate('/test/writing/cambridge-08-test-1')}
                            >
                              <Pencil className="w-4 h-4" />
                              Writing
                            </Button>
                            <Button 
                              variant="outline" 
                              className="gap-2"
                              onClick={() => navigate('/test/speaking/cambridge-08-test-1')}
                            >
                              <Mic className="w-4 h-4" />
                              Speaking
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            <Button 
                              variant="secondary"
                              onClick={handleRedoTest}
                            >
                              Redo This Test
                            </Button>
                            <Button 
                              onClick={() => navigate('/mock-tests')}
                            >
                              Back to Mock Tests
                            </Button>
                          </div>

                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setShowResultsModal(false);
                              setShowAnswers(true);
                            }}
                            className="w-full mt-2"
                          >
                            View Answers on Page
                          </Button>
                        </div>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                </AlertDialogContent>
              </AlertDialog>

              {/* Answer Toggle */}
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAnswers(!showAnswers)}
                  className="gap-2"
                >
                  {showAnswers ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showAnswers ? "Hide Answers" : "Show Answers"}
                </Button>
              </div>

                        {test.sections.map((sec, secIdx) => (
                <Card key={sec.sectionNumber} className="overflow-hidden">
                  <div className="bg-primary/5 px-6 py-4 border-b">
                    <h3 className="font-semibold text-lg">Section {sec.sectionNumber}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {sec.questions.length > 0
                        ? `Questions ${sec.questions[0].id} - ${sec.questions[sec.questions.length - 1].id}`
                        : "Question set coming soon"}
                    </p>
                  </div>
                  
                  <div className="p-6 space-y-6">
                    {/* Optional Audio Player */}
                    {sec.audioUrl && (
                      <div className="bg-muted/30 p-4 rounded-lg">
                        <div className="flex items-center gap-3 mb-2">
                          <Volume2 className="w-5 h-5 text-primary" />
                          <span className="font-medium">Section {sec.sectionNumber} Audio</span>
                        </div>
                        <audio 
                          controls 
                          src={sec.audioUrl} 
                          className="w-full"
                          onPlay={() => setAudioPlaying({ ...audioPlaying, [secIdx]: true })}
                          onPause={() => setAudioPlaying({ ...audioPlaying, [secIdx]: false })}
                        >
                          Your browser does not support the audio element.
                        </audio>
                      </div>
                    )}

                    {/* Reading Passage */}
                    {(sec.passageTitle || sec.passageContent || sec.passageText) && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-base">{sec.passageTitle ?? `Passage ${sec.sectionNumber}`}</h4>
                        {(sec.passageContent || sec.passageText) && (
                          <p className="text-sm text-muted-foreground whitespace-pre-line">
                            {sec.passageContent ?? sec.passageText}
                          </p>
                        )}
                      </div>
                    )} 

                    {/* Questions */}
                    <div className="space-y-4">
                      {sec.questions.length === 0 && (
                        <div className="p-4 border rounded-lg bg-muted/30 text-sm text-muted-foreground">
                          Questions for this passage are coming soon.
                        </div>
                      )}

                      {sec.questions.map((q) => {
                        const userAnswer = answers[q.id];
                        const correctAns = q.correctAnswer ?? findCorrectAnswer(q.id);
                        const isCorrect = showAnswers && correctAns ? 
                          checkAnswer(q.id, userAnswer, correctAns) : null;

                        return (
                          <div 
                            key={q.id} 
                            className={cn(
                              "p-4 border rounded-lg",
                              showAnswers && isCorrect === true && "bg-green-50 border-green-200",
                              showAnswers && isCorrect === false && "bg-red-50 border-red-200"
                            )}
                          >
                            <div className="font-medium mb-2">
                              Question {q.id}
                            </div>
                            <div className="text-sm mb-3">{q.question}</div>

                            {/* Image for question if available */}
                            {(q as any).imageUrl && (
                              <div className="mb-4">
                                <img 
                                  src={(q as any).imageUrl} 
                                  alt={`Question ${q.id} diagram`}
                                  className="max-w-full h-auto rounded border"
                                />
                              </div>
                            )}

                            {/* Multiple Choice */}
                            {q.type === "multiple-choice" && q.options && !q.multipleSelect && (
                              <div className="space-y-2">
                                {q.options.map((opt, i) => (
                                  <label key={i} className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                      type="radio"
                                      name={q.id}
                                      value={String.fromCharCode(65 + i)}
                                      checked={answers[q.id] === String.fromCharCode(65 + i)}
                                      onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                      className="accent-primary"
                                    />
                                    <span>{String.fromCharCode(65 + i)}. {opt}</span>
                                  </label>
                                ))}
                              </div>
                            )}

                            {/* Multiple Select */}
                            {q.type === "multiple-choice" && q.options && q.multipleSelect && (
                              <div className="space-y-2">
                                {q.options.map((opt, i) => {
                                  const optionValue = String.fromCharCode(65 + i);
                                  const selectedOptions = Array.isArray(answers[q.id]) ? answers[q.id] : [];
                                  
                                  return (
                                    <label key={i} className="flex items-center gap-2 text-sm cursor-pointer">
                                      <Checkbox
                                        checked={selectedOptions.includes(optionValue)}
                                        onCheckedChange={(checked) => {
                                          setAnswers(prev => {
                                            const current = Array.isArray(prev[q.id]) ? [...prev[q.id]] : [];
                                            if (checked) {
                                              return { ...prev, [q.id]: [...current, optionValue] };
                                            } else {
                                              return { ...prev, [q.id]: current.filter(v => v !== optionValue) };
                                            }
                                          });
                                        }}
                                      />
                                      <span>{optionValue}. {opt}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}

                            {/* Matching (render options A-H and actionOptions) */}
                            {q.type === "matching" && q.options && (
                              <div className="space-y-3">
                                {((q as any).actionOptions as string[] | undefined) && (
                                  <div className="mb-2 text-sm">
                                    <div className="font-medium mb-1">Actions:</div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                                      {((q as any).actionOptions as string[]).map((act, i) => (
                                        <div key={i} className="text-sm text-muted-foreground">{act}</div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                <div className="space-y-2">
                                  {q.options.map((opt, i) => (
                                    <label key={i} className="flex items-center gap-2 text-sm cursor-pointer">
                                      <input
                                        type="radio"
                                        name={q.id}
                                        value={String.fromCharCode(65 + i)}
                                        checked={answers[q.id] === String.fromCharCode(65 + i)}
                                        onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                        className="accent-primary"
                                      />
                                      <span>{String.fromCharCode(65 + i)}. {opt}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Form Completion and Short Answer */}
                            {(q.type === "form-completion" || q.type === "short-answer") && (
                              <Input
                                type="text"
                                placeholder="Type your answer here"
                                value={(answers[q.id] as string) ?? ""}
                                onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                className="max-w-md"
                              />
                            )}

                            {/* True/False/Not Given (or Yes/No/Not given) */}
                            {q.type === "true-false-not-given" && (() => {
                              const candidateAns = (test as any)?.answers?.[q.id] ?? findCorrectAnswer(q.id);
                              const useYesNo = typeof candidateAns === 'string' && /^(yes|no)$/i.test(candidateAns);
                              const tfOptions = useYesNo ? ["Yes", "No", "Not given"] : ["True", "False", "Not given"];

                              return (
                                <div className="space-y-2">
                                  {tfOptions.map((opt, i) => (
                                    <label key={i} className="flex items-center gap-2 text-sm cursor-pointer">
                                      <input
                                        type="radio"
                                        name={q.id}
                                        value={opt}
                                        checked={answers[q.id] === opt}
                                        onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                        className="accent-primary"
                                      />
                                      <span>{opt}</span>
                                    </label>
                                  ))}
                                </div>
                              );
                            })()}

                            {/* Show Correct Answer */}
                            {showAnswers && correctAns && (
                              <div className={cn(
                                "mt-3 p-3 rounded text-sm",
                                isCorrect ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                              )}>
                                <strong>Correct Answer:</strong> {Array.isArray(correctAns) ? correctAns.join(', ') : String(correctAns)}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Card>
              ))}

              <div className="flex justify-end gap-3">
                {submitted ? (
                  <Button onClick={() => navigate('/mock-tests')} size="lg">
                    Back to Mock Tests
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => navigate('/mock-tests')}>
                      Exit Test
                    </Button>
                    <Button onClick={onSubmit} size="lg">
                      Submit Test
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ReadingTest;
