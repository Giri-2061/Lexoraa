import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Footer from "@/components/Footer";
import TestHeader from "@/components/TestHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useTestSession } from "@/hooks/useTestSession";
import { loadQuestions } from "@/utils/loadQuestions";
import type { WritingTest as WritingTestData } from "@/types/questions";
import { AlertCircle, CheckCircle, Upload, Loader2, Sparkles, ImageIcon, X } from "lucide-react";
import { evaluateWriting, transcribeHandwriting, WritingEvaluation } from '@/utils/writingEvaluation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from "@/integrations/supabase/client";
import EvaluationResult from '@/components/EvaluationResult';

type UploadTask = 1 | 2;

const countWords = (value: string) =>
  value
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

const WritingTest = () => {
  const navigate = useNavigate();
  const { testId } = useParams();
  const { toast } = useToast();
  const durationMinutes = 60;
  const { user } = useAuth();

  const [task1Answer, setTask1Answer] = useState("");
  const [task2Answer, setTask2Answer] = useState("");
  const [task1ImageData, setTask1ImageData] = useState<string | null>(null);
  const [task2ImageData, setTask2ImageData] = useState<string | null>(null);
  const [test, setTest] = useState<WritingTestData | null>(null);
  const [loadingTest, setLoadingTest] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  
  // Evaluation state
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [task1Evaluation, setTask1Evaluation] = useState<WritingEvaluation | null>(null);
  const [task2Evaluation, setTask2Evaluation] = useState<WritingEvaluation | null>(null);
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [finalBandScore, setFinalBandScore] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTranscribing1, setIsTranscribing1] = useState(false);
  const [isTranscribing2, setIsTranscribing2] = useState(false);
  const [latestTestResultId, setLatestTestResultId] = useState<string | null>(null);
  const [classrooms, setClassrooms] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState('');
  const [isRequestingTeacherReview, setIsRequestingTeacherReview] = useState(false);

  const clearStoredDrafts = useCallback(() => {
    try {
      localStorage.removeItem("writing:task1:answer");
      localStorage.removeItem("writing:task2:answer");
      localStorage.removeItem("writing:task1:image");
      localStorage.removeItem("writing:task2:image");
    } catch (error) {
      console.warn("Failed to clear writing draft", error);
    }
  }, []);

  const resetLocalState = useCallback(() => {
    setTask1Answer("");
    setTask2Answer("");
    setTask1ImageData(null);
    setTask2ImageData(null);
    setSubmitted(false);
    setShowResultsModal(false);
    // Clear evaluation states
    setTask1Evaluation(null);
    setTask2Evaluation(null);
    setShowEvaluation(false);
    setFinalBandScore(null);
    setLatestTestResultId(null);
  }, []);

  const session = useTestSession(durationMinutes, {
    onConfirmExit: () => {
      resetLocalState();
      clearStoredDrafts();
      navigate("/mock-tests");
    },
  });

  useEffect(() => {
    setLoadingTest(true);
    loadQuestions("writing", testId!)
      .then((data) => setTest(data as WritingTestData))
      .catch((error) => {
        console.error("Failed to load writing test", error);
        toast({
          title: "Sample test loaded",
          description: "We could not load the official writing task. A sample prompt is shown instead.",
        });
        setTest(null);
      })
      .finally(() => setLoadingTest(false));
  }, [toast, testId]);

  useEffect(() => {
    try {
      const storedTask1 = localStorage.getItem("writing:task1:answer");
      const storedTask2 = localStorage.getItem("writing:task2:answer");
      const storedImage1 = localStorage.getItem("writing:task1:image");
      const storedImage2 = localStorage.getItem("writing:task2:image");

      if (storedTask1) setTask1Answer(storedTask1);
      if (storedTask2) setTask2Answer(storedTask2);
      if (storedImage1) setTask1ImageData(storedImage1);
      if (storedImage2) setTask2ImageData(storedImage2);
    } catch (error) {
      console.warn("Failed to load saved writing drafts", error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("writing:task1:answer", task1Answer);
    } catch (error) {
      console.warn("Failed to persist task1 answer", error);
    }
  }, [task1Answer]);

  useEffect(() => {
    try {
      localStorage.setItem("writing:task2:answer", task2Answer);
    } catch (error) {
      console.warn("Failed to persist task2 answer", error);
    }
  }, [task2Answer]);

  useEffect(() => {
    try {
      if (task1ImageData) {
        localStorage.setItem("writing:task1:image", task1ImageData);
      } else {
        localStorage.removeItem("writing:task1:image");
      }
    } catch (error) {
      console.warn("Failed to persist task1 image", error);
    }
  }, [task1ImageData]);

  useEffect(() => {
    try {
      if (task2ImageData) {
        localStorage.setItem("writing:task2:image", task2ImageData);
      } else {
        localStorage.removeItem("writing:task2:image");
      }
    } catch (error) {
      console.warn("Failed to persist task2 image", error);
    }
  }, [task2ImageData]);

  useEffect(() => {
    const fetchClassrooms = async () => {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('classroom_memberships')
        .select('classroom_id, classroom:classrooms(id, name)')
        .eq('student_id', user.id);

      if (!error && data) {
        const mapped = data
          .map((row: any) => ({
            id: row.classroom?.id,
            name: row.classroom?.name,
          }))
          .filter((c: any) => c.id && c.name);

        setClassrooms(mapped);
        if (mapped.length > 0 && !selectedClassroomId) {
          setSelectedClassroomId(mapped[0].id);
        }
      }
    };

    fetchClassrooms();
  }, [user?.id]);

  const task1WordCount = useMemo(() => countWords(task1Answer), [task1Answer]);
  const task2WordCount = useMemo(() => countWords(task2Answer), [task2Answer]);
  const uploadsAttached = Boolean(task1ImageData || task2ImageData);

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>, task: UploadTask) => {
    if (!event.target.files || !event.target.files[0]) return;

    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = () => {
      const dataUrl = reader.result as string;

      if (task === 1) {
        setTask1ImageData(dataUrl);
      } else {
        setTask2ImageData(dataUrl);
      }

      toast({
        title: "Image uploaded",
        description: "Your handwritten response has been attached.",
      });
    };

    reader.readAsDataURL(file);
  };

  const handleTranscribeImage = async (task: UploadTask) => {
    const imageData = task === 1 ? task1ImageData : task2ImageData;
    if (!imageData) {
      toast({
        title: "No image",
        description: "Please upload a handwritten image first.",
        variant: "destructive",
      });
      return;
    }

    if (task === 1) setIsTranscribing1(true);
    else setIsTranscribing2(true);

    try {
      const result = await transcribeHandwriting(imageData);

      if (result.success && result.transcribedText) {
        if (task === 1) {
          setTask1Answer((prev) => prev ? prev + '\n\n' + result.transcribedText! : result.transcribedText!);
        } else {
          setTask2Answer((prev) => prev ? prev + '\n\n' + result.transcribedText! : result.transcribedText!);
        }

        toast({
          title: "Transcription complete",
          description: "Handwritten text has been transcribed. Please review it in the text area above.",
        });
      } else {
        toast({
          title: "Transcription failed",
          description: result.error || "Unable to transcribe the image. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Transcription error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred during transcription.",
        variant: "destructive",
      });
    } finally {
      if (task === 1) setIsTranscribing1(false);
      else setIsTranscribing2(false);
    }
  };

  const handleRemoveImage = (task: UploadTask) => {
    if (task === 1) setTask1ImageData(null);
    else setTask2ImageData(null);
  };

  const handleEvaluateTask = async (taskNumber: 1 | 2) => {
    const essayText = taskNumber === 1 ? task1Answer : task2Answer;
    const taskPrompt = test?.writing?.[taskNumber - 1]?.prompt || 'No prompt available';
    
    if (!essayText || essayText.trim().length < 50) {
      toast({
        title: "Essay too short",
        description: `Please write at least 50 characters before requesting evaluation.`,
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Not logged in",
        description: "Please sign in to use AI evaluation.",
        variant: "destructive",
      });
      return;
    }

    setIsEvaluating(true);
    
    try {
      const result = await evaluateWriting({
        essayText,
        taskType: taskNumber === 1 ? 'Task 1' : 'Task 2',
        prompt: taskPrompt,
        testId: test?.testId || testId || 'unknown-test',
        taskNumber
      });

      if (result.success && result.evaluation) {
        if (taskNumber === 1) {
          setTask1Evaluation(result.evaluation);
        } else {
          setTask2Evaluation(result.evaluation);
        }
        setShowEvaluation(true);
        
        toast({
          title: "Evaluation Complete!",
          description: `Your ${taskNumber === 1 ? 'Task 1' : 'Task 2'} has been evaluated.`,
        });
      } else {
        toast({
          title: "Evaluation Failed",
          description: result.error || "Unable to evaluate your essay. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Evaluation error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  // Calculate final band score using formula: (Task1 + 2*Task2) / 3
  const calculateFinalBand = (task1Score: number, task2Score: number): number => {
    const rawScore = (task1Score + 2 * task2Score) / 3;
    // Round to nearest 0.5
    return Math.round(rawScore * 2) / 2;
  };

  const handleSubmit = async () => {
    if (!task1Answer && !task2Answer && !task1ImageData && !task2ImageData) {
      toast({
        title: "No answer provided",
        description: "Type a response or upload a handwritten answer before submitting.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Not logged in",
        description: "Please sign in to submit and get AI evaluation.",
        variant: "destructive",
      });
      return;
    }

    // Check minimum word counts
    if (task1Answer.trim().length < 50 && !task1ImageData) {
      toast({
        title: "Task 1 too short",
        description: "Please write at least 50 characters for Task 1 or upload an image.",
        variant: "destructive",
      });
      return;
    }

    if (task2Answer.trim().length < 50 && !task2ImageData) {
      toast({
        title: "Task 2 too short", 
        description: "Please write at least 50 characters for Task 2 or upload an image.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let t1Eval = task1Evaluation;
      let t2Eval = task2Evaluation;
      let evaluationErrors: string[] = [];

      // Evaluate Task 1 if not already evaluated and has text
      if (!t1Eval && task1Answer.trim().length >= 50) {
        toast({
          title: "Evaluating Task 1...",
          description: "Please wait while AI analyzes your essay and the chart/graph.",
        });

        const task1Prompt = test?.writing?.[0]?.prompt || 'Describe the information presented.';
        let task1ImageUrl = test?.writing?.[0]?.imageUrl; // Get the chart/graph image URL
        
        // Convert relative paths to full URLs for the vision model
        if (task1ImageUrl && !task1ImageUrl.startsWith('http')) {
          // Remove leading slash if present, and 'public/' prefix since Vite serves from public
          const cleanPath = task1ImageUrl.replace(/^\/?(public\/)?/, '');
          task1ImageUrl = `${window.location.origin}/${cleanPath}`;
        }
        
        const result1 = await evaluateWriting({
          essayText: task1Answer,
          taskType: 'Task 1',
          prompt: task1Prompt,
          testId: test?.testId || testId || 'unknown-test',
          taskNumber: 1,
          imageUrl: task1ImageUrl // Pass full image URL for vision model
        });

        if (result1.success && result1.evaluation) {
          t1Eval = result1.evaluation;
          setTask1Evaluation(t1Eval);
        } else {
          console.error('Task 1 evaluation failed:', result1.error);
          evaluationErrors.push(`Task 1: ${result1.error || 'Unknown error'}`);
        }
      }

      // Evaluate Task 2 if not already evaluated and has text
      if (!t2Eval && task2Answer.trim().length >= 50) {
        toast({
          title: "Evaluating Task 2...",
          description: "Please wait while AI evaluates your essay.",
        });

        const task2Prompt = test?.writing?.[1]?.prompt || 'Write an essay on the given topic.';
        const result2 = await evaluateWriting({
          essayText: task2Answer,
          taskType: 'Task 2',
          prompt: task2Prompt,
          testId: test?.testId || testId || 'unknown-test',
          taskNumber: 2
        });

        if (result2.success && result2.evaluation) {
          t2Eval = result2.evaluation;
          setTask2Evaluation(t2Eval);
        } else {
          console.error('Task 2 evaluation failed:', result2.error);
          evaluationErrors.push(`Task 2: ${result2.error || 'Unknown error'}`);
        }
      }

      // If both evaluations failed, show error and don't show results modal
      if (evaluationErrors.length === 2 || (!t1Eval && !t2Eval)) {
        toast({
          title: "Evaluation Failed",
          description: evaluationErrors.length > 0 
            ? evaluationErrors.join('; ') 
            : "Unable to evaluate your essays. Please check your connection and try again.",
          variant: "destructive",
        });
        return;
      }

      // Calculate final band score if both evaluations exist
      if (t1Eval && t2Eval) {
        const finalScore = calculateFinalBand(t1Eval.overallBand, t2Eval.overallBand);
        setFinalBandScore(finalScore);
        setShowEvaluation(true);
        
        toast({
          title: "Evaluation Complete!",
          description: `Your final IELTS Writing Band Score: ${finalScore}`,
        });
      } else if (t1Eval || t2Eval) {
        // At least one evaluation exists - show partial results with warning
        setShowEvaluation(true);
        toast({
          title: "Partial Evaluation",
          description: evaluationErrors.length > 0 
            ? `One task failed: ${evaluationErrors[0]}`
            : "Only one task could be evaluated. Both tasks need text for final score.",
          variant: "destructive",
        });
      }

      const payload = {
        testId: test?.testId ?? "writing-sample-1",
        submittedAt: new Date().toISOString(),
        answers: {
          task1: task1Answer,
          task2: task2Answer,
          task1Image: task1ImageData,
          task2Image: task2ImageData,
        },
        wordCounts: { task1: task1WordCount, task2: task2WordCount },
        evaluations: {
          task1: t1Eval,
          task2: t2Eval,
          finalBand: t1Eval && t2Eval ? calculateFinalBand(t1Eval.overallBand, t2Eval.overallBand) : null
        }
      };

      console.log("Writing test submission", payload);

      // Save result to Supabase test_results
      if (user && user.id) {
        const finalBand = t1Eval && t2Eval ? calculateFinalBand(t1Eval.overallBand, t2Eval.overallBand) : null;
        const { data, error } = await supabase
          .from('test_results')
          .insert({
            test_id: test?.testId ?? "writing-sample-1",
            test_type: 'writing',
            user_id: user.id,
            band_score: finalBand,
            correct_count: 0,
            total_questions: 2,
            answers: {
              prompts: {
                task1: test?.writing?.[0]?.prompt || null,
                task2: test?.writing?.[1]?.prompt || null,
              },
              task1: task1Answer,
              task2: task2Answer,
              task1Image: task1ImageData,
              task2Image: task2ImageData,
              evaluations: {
                task1: t1Eval,
                task2: t2Eval,
                finalBand: finalBand
              }
            },
            duration_minutes: durationMinutes,
            created_at: new Date().toISOString(),
          })
          .select('id')
          .single();
        if (error) {
          toast({ title: 'Failed to save result', description: error.message, variant: 'destructive' });
        } else {
          setLatestTestResultId(data.id);
        }
      }
      setSubmitted(true);
      setShowResultsModal(true);

    } catch (error) {
      console.error('Submission error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred during evaluation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRedoTest = () => {
    resetLocalState();
    clearStoredDrafts();
    session.setStarted(false);
    session.setTimeLeft(durationMinutes * 60);
  };

  const handleExitToMockTests = () => {
    resetLocalState();
    clearStoredDrafts();
    session.setStarted(false);
    session.setTimeLeft(durationMinutes * 60);
    navigate("/mock-tests");
  };

  const handleAskTeacherReview = async () => {
    if (!user?.id) {
      toast({
        title: 'Login required',
        description: 'Please sign in before requesting teacher review.',
        variant: 'destructive',
      });
      return;
    }

    if (!latestTestResultId) {
      toast({
        title: 'No test result yet',
        description: 'Submit this writing test first, then request teacher review.',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedClassroomId) {
      toast({
        title: 'No classroom selected',
        description: 'Select a classroom to send this test for teacher review.',
        variant: 'destructive',
      });
      return;
    }

    setIsRequestingTeacherReview(true);

    const { error } = await supabase
      .from('test_review_requests')
      .upsert(
        {
          classroom_id: selectedClassroomId,
          student_id: user.id,
          test_result_id: latestTestResultId,
          status: 'pending',
          teacher_score: null,
          teacher_comment: null,
          graded_at: null,
          requested_at: new Date().toISOString(),
        },
        { onConflict: 'classroom_id,student_id,test_result_id' }
      );

    setIsRequestingTeacherReview(false);

    if (error) {
      toast({
        title: 'Request failed',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Sent to teacher',
      description: 'Your writing test was submitted for classroom teacher review.',
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <TestHeader title={test?.testId ? `IELTS Writing — ${test.testId}` : "IELTS Writing Test"} session={session} />
      <main className="flex-grow pt-32 sm:pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          {loadingTest && <div className="text-center">Loading writing tasks...</div>}

          {!loadingTest && !test && (
            <Card className="p-6 bg-muted/30 text-center">
              <h2 className="text-xl font-semibold mb-2">Sample tasks coming soon</h2>
              <p className="text-sm text-muted-foreground">Official writing prompts are being prepared. Practise using the generic template below.</p>
            </Card>
          )}

          {test && !session.started && (
            <Card className="p-8 text-center max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold mb-4">IELTS Academic Writing</h2>
              <p className="text-muted-foreground mb-6">
                You have {durationMinutes} minutes to complete both Task 1 and Task 2. Task 1 requires at least 150 words and Task 2 requires at least 250 words.
              </p>
              <div className="text-left text-sm text-muted-foreground space-y-2 mb-6">
                <p>• Task 1: summarise and compare the visual information provided.</p>
                <p>• Task 2: write an essay responding to the question or statement.</p>
                <p>• Type in the editor or upload a photo of your handwritten response.</p>
              </div>
              <Button size="lg" onClick={() => session.setStarted(true)}>Begin Test</Button>
            </Card>
          )}

          {test && session.started && (
            <div className="space-y-6">
              <AlertDialog open={showResultsModal} onOpenChange={setShowResultsModal}>
                <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-2xl font-bold text-center">
                      {finalBandScore ? "Your IELTS Writing Results" : "Submission Ready"}
                    </AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="space-y-6">
                        {/* Final Band Score Display */}
                        {finalBandScore && (
                          <div className="text-center p-6 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30 rounded-xl border-2 border-yellow-200">
                            <div className="text-sm text-muted-foreground mb-2">Final Writing Band Score</div>
                            <div className="text-6xl font-bold text-yellow-600 dark:text-yellow-400 mb-2">
                              {finalBandScore}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Based on Task 1 ({task1Evaluation?.overallBand || "—"}) and Task 2 ({task2Evaluation?.overallBand || "—"})
                            </div>
                          </div>
                        )}

                        {/* Task Scores Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Task 1 Score */}
                          <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200">
                            <div className="text-sm text-muted-foreground mb-1">Task 1 Band</div>
                            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                              {task1Evaluation?.overallBand || "—"}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {task1WordCount} words • Weight: 1/3
                            </div>
                          </div>
                          
                          {/* Task 2 Score */}
                          <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200">
                            <div className="text-sm text-muted-foreground mb-1">Task 2 Band</div>
                            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                              {task2Evaluation?.overallBand || "—"}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {task2WordCount} words • Weight: 2/3
                            </div>
                          </div>
                        </div>

                        {/* Detailed Criteria Scores */}
                        {(task1Evaluation || task2Evaluation) && (
                          <div className="p-4 bg-muted/50 rounded-lg">
                            <h4 className="font-semibold mb-3 text-sm">Criteria Breakdown</h4>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <div className="font-medium text-xs text-muted-foreground mb-1">Task Achievement</div>
                                <div className="flex justify-between">
                                  <span>T1: {task1Evaluation?.taskAchievement?.score || "—"}</span>
                                  <span>T2: {task2Evaluation?.taskAchievement?.score || "—"}</span>
                                </div>
                              </div>
                              <div>
                                <div className="font-medium text-xs text-muted-foreground mb-1">Coherence & Cohesion</div>
                                <div className="flex justify-between">
                                  <span>T1: {task1Evaluation?.coherenceCohesion?.score || "—"}</span>
                                  <span>T2: {task2Evaluation?.coherenceCohesion?.score || "—"}</span>
                                </div>
                              </div>
                              <div>
                                <div className="font-medium text-xs text-muted-foreground mb-1">Lexical Resource</div>
                                <div className="flex justify-between">
                                  <span>T1: {task1Evaluation?.lexicalResource?.score || "—"}</span>
                                  <span>T2: {task2Evaluation?.lexicalResource?.score || "—"}</span>
                                </div>
                              </div>
                              <div>
                                <div className="font-medium text-xs text-muted-foreground mb-1">Grammar Accuracy</div>
                                <div className="flex justify-between">
                                  <span>T1: {task1Evaluation?.grammarAccuracy?.score || "—"}</span>
                                  <span>T2: {task2Evaluation?.grammarAccuracy?.score || "—"}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Word Counts & Uploads */}
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center p-3 bg-primary/5 rounded-lg">
                            <div className="text-xl font-semibold text-primary">{task1WordCount}</div>
                            <div className="text-xs text-muted-foreground">Task 1 Words</div>
                          </div>
                          <div className="text-center p-3 bg-primary/5 rounded-lg">
                            <div className="text-xl font-semibold text-primary">{task2WordCount}</div>
                            <div className="text-xs text-muted-foreground">Task 2 Words</div>
                          </div>
                          <div className="text-center p-3 bg-secondary/30 rounded-lg">
                            <div className="text-xl font-semibold text-card-foreground">{uploadsAttached ? "Yes" : "No"}</div>
                            <div className="text-xs text-muted-foreground">Uploads</div>
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground text-center">
                          {finalBandScore 
                            ? finalBandScore >= 7.5 
                              ? "Excellent work! You demonstrate strong command of English with well-developed arguments and accurate language use."
                              : finalBandScore >= 6.5
                                ? "Good attempt! Your writing shows competence. Focus on refining vocabulary variety and complex sentence structures."
                                : finalBandScore >= 5.5
                                  ? "Decent effort. Work on task response, paragraph organization, and reducing grammatical errors."
                                  : "Keep practicing! Focus on understanding task requirements, building vocabulary, and improving sentence accuracy."
                            : "Restart the test or return to the dashboard."}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Button variant="secondary" onClick={handleRedoTest}>
                            Redo This Test
                          </Button>
                          <Button onClick={handleExitToMockTests}>
                            Back to Mock Tests
                          </Button>
                        </div>

                        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                          <p className="text-sm font-medium text-card-foreground">Ask Your Teacher To Review</p>
                          {classrooms.length > 0 ? (
                            <>
                              <select
                                value={selectedClassroomId}
                                onChange={(e) => setSelectedClassroomId(e.target.value)}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                              >
                                {classrooms.map((c) => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                              </select>
                              <Button
                                variant="outline"
                                className="w-full"
                                onClick={handleAskTeacherReview}
                                disabled={!latestTestResultId || isRequestingTeacherReview}
                              >
                                {isRequestingTeacherReview ? 'Sending...' : 'Ask Your Teacher'}
                              </Button>
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground">Join a classroom first to request teacher review.</p>
                          )}
                        </div>

                        <Button variant="outline" size="sm" onClick={() => setShowResultsModal(false)} className="w-full">
                          {finalBandScore ? "View Detailed Feedback" : "Continue Editing"}
                        </Button>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                </AlertDialogContent>
              </AlertDialog>

              <Card className="p-6 border-border bg-secondary/30">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <h2 className="font-semibold text-card-foreground mb-2">Test Instructions</h2>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Complete both tasks within {durationMinutes} minutes.</li>
                      <li>• You may type your responses or upload handwritten photos.</li>
                      <li>• Suggested timing: Task 1 — 20 minutes, Task 2 — 40 minutes.</li>
                    </ul>
                  </div>
                </div>
              </Card>

              <Card className="p-6 border-border">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-2xl font-bold text-primary">Task 1</h2>
                  <span className="text-sm text-muted-foreground">Minimum {test.writing[0].minWords} words • {test.writing[0].suggestedTime}</span>
                </div>
                <div className="p-4 bg-secondary/50 rounded-lg">
                  <p className="text-card-foreground leading-relaxed mb-3">
                    <strong>Instruction:</strong> {test.writing[0].instruction}
                  </p>
                  <p className="text-card-foreground leading-relaxed">
                    <strong>Task:</strong> {test.writing[0].prompt}
                  </p>
                  {test.writing[0].imageUrl ? (
                    <div className="mt-4 p-4 bg-muted rounded-lg text-center">
                      <img src={test.writing[0].imageUrl} alt="Task 1 visual" className="mx-auto max-w-full" />
                    </div>
                  ) : (
                    <div className="mt-4 p-8 bg-muted rounded-lg text-center">
                      <p className="text-muted-foreground italic">[No image provided for this task]</p>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-6 border-t border-border">
                  <label className="block text-sm font-medium text-card-foreground mb-2">Your Answer — Task 1</label>
                  <Textarea
                    value={task1Answer}
                    onChange={(event) => setTask1Answer(event.target.value)}
                    placeholder="Type your Task 1 answer here (minimum 150 words)"
                    className="min-h-[200px] font-mono text-base"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-sm text-muted-foreground">Word count: {task1WordCount}</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleEvaluateTask(1)}
                      disabled={isEvaluating || !task1Answer || task1Answer.trim().length < 50}
                      className="gap-2"
                    >
                      {isEvaluating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Evaluating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Get AI Feedback
                        </>
                      )}
                    </Button>
                  </div>

                  <label className="block text-sm font-medium text-card-foreground mb-2 mt-4">Or upload a photo of your handwritten Task 1 answer</label>
                  {task1ImageData ? (
                    <div className="border-2 border-primary/30 rounded-lg p-4 space-y-3">
                      <div className="relative">
                        <img src={task1ImageData} alt="Handwritten Task 1" className="max-h-64 mx-auto rounded-md" />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(1)}
                          className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full hover:opacity-80"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        className="w-full gap-2"
                        onClick={() => handleTranscribeImage(1)}
                        disabled={isTranscribing1}
                      >
                        {isTranscribing1 ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Transcribing...
                          </>
                        ) : (
                          <>
                            <ImageIcon className="w-4 h-4" />
                            Transcribe to Text
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">The transcribed text will appear in the text area above for your review.</p>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors block">
                      <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground mb-2">Click to upload your handwritten Task 1 answer</p>
                      <p className="text-sm text-muted-foreground">PNG, JPG up to 10MB</p>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, 1)}
                      />
                    </label>
                  )}
                </div>
              </Card>

              <Card className="p-6 border-border">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-2xl font-bold text-primary">Task 2</h2>
                  <span className="text-sm text-muted-foreground">Minimum {test.writing[1].minWords} words • {test.writing[1].suggestedTime}</span>
                </div>
                <div className="p-4 bg-secondary/50 rounded-lg">
                  <p className="text-card-foreground leading-relaxed mb-3">
                    <strong>Instruction:</strong> {test.writing[1].instruction}
                  </p>
                  <p className="text-card-foreground leading-relaxed">
                    <strong>Task:</strong> {test.writing[1].prompt}
                  </p>
                  {test.writing[1].imageUrl ? (
                    <div className="mt-4 p-4 bg-muted rounded-lg text-center">
                      <img src={test.writing[1].imageUrl} alt="Task 2 visual" className="mx-auto max-w-full" />
                    </div>
                  ) : (
                    <div className="mt-4 p-8 bg-muted rounded-lg text-center">
                      <p className="text-muted-foreground italic">[No image provided for this task]</p>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-6 border-t border-border">
                  <label className="block text-sm font-medium text-card-foreground mb-2">Your Answer — Task 2</label>
                  <Textarea
                    value={task2Answer}
                    onChange={(event) => setTask2Answer(event.target.value)}
                    placeholder="Type your Task 2 answer here (minimum 250 words)"
                    className="min-h-[200px] font-mono text-base"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-sm text-muted-foreground">Word count: {task2WordCount}</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleEvaluateTask(2)}
                      disabled={isEvaluating || !task2Answer || task2Answer.trim().length < 50}
                      className="gap-2"
                    >
                      {isEvaluating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Evaluating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Get AI Feedback
                        </>
                      )}
                    </Button>
                  </div>

                  <label className="block text-sm font-medium text-card-foreground mb-2 mt-4">Or upload a photo of your handwritten Task 2 answer</label>
                  {task2ImageData ? (
                    <div className="border-2 border-primary/30 rounded-lg p-4 space-y-3">
                      <div className="relative">
                        <img src={task2ImageData} alt="Handwritten Task 2" className="max-h-64 mx-auto rounded-md" />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(2)}
                          className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full hover:opacity-80"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        className="w-full gap-2"
                        onClick={() => handleTranscribeImage(2)}
                        disabled={isTranscribing2}
                      >
                        {isTranscribing2 ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Transcribing...
                          </>
                        ) : (
                          <>
                            <ImageIcon className="w-4 h-4" />
                            Transcribe to Text
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">The transcribed text will appear in the text area above for your review.</p>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors block">
                      <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground mb-2">Click to upload your handwritten Task 2 answer</p>
                      <p className="text-sm text-muted-foreground">PNG, JPG up to 10MB</p>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, 2)}
                      />
                    </label>
                  )}
                </div>
              </Card>

              {/* AI Evaluation Results */}
              {(task1Evaluation || task2Evaluation) && showEvaluation && (
                <Card className="p-6 border-2 border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-yellow-500" />
                      AI Evaluation Results
                    </h3>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setShowEvaluation(false)}
                    >
                      Close
                    </Button>
                  </div>
                  
                  {task1Evaluation && (
                    <div className="mb-6">
                      <h4 className="font-semibold mb-3 text-lg">Task 1 Evaluation</h4>
                      <EvaluationResult evaluation={task1Evaluation} />
                    </div>
                  )}
                  
                  {task2Evaluation && (
                    <div>
                      <h4 className="font-semibold mb-3 text-lg">Task 2 Evaluation</h4>
                      <EvaluationResult evaluation={task2Evaluation} />
                    </div>
                  )}
                </Card>
              )}

              <div className="flex flex-col sm:flex-row justify-end gap-3">
                <Button variant="outline" onClick={handleExitToMockTests}>
                  Exit Test
                </Button>
                <Button size="lg" onClick={handleSubmit} disabled={isSubmitting} className="sm:w-auto">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Evaluating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Submit Answers
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default WritingTest;
