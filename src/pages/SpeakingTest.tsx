import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import TestHeader from "@/components/TestHeader";
import { useTestSession } from "@/hooks/useTestSession";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { loadQuestions } from "@/utils/loadQuestions";
import type { SpeakingTest as SpeakingTestType, SpeakingPart1Topic, SpeakingPart3Question } from "@/types/questions";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { SpeakingEvaluation } from "@/types/speakingEvaluation";
import { SpeakingEvaluationResult } from "@/components/SpeakingEvaluationResult";
import { 
  Mic, 
  MicOff, 
  Play, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  ChevronRight,
  Volume2,
  Pause,
  RotateCcw,
  FileText,
  Sparkles,
  Loader2
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";

// Test flow states
type TestPhase = 
  | "intro"           // Welcome screen
  | "part1-intro"     // Part 1 instructions
  | "part1-active"    // Part 1 questions
  | "part2-intro"     // Part 2 instructions
  | "part2-prep"      // Part 2 preparation (1 minute)
  | "part2-active"    // Part 2 speaking (2 minutes)
  | "part2-followup"  // Part 2 follow-up questions
  | "part3-intro"     // Part 3 instructions
  | "part3-active"    // Part 3 discussion
  | "completed";      // Test complete

interface Recording {
  blob: Blob;
  url: string;
  duration: number;
  part: string;
  partNumber: number; // 1, 2, or 3
  questionIndex?: number;
  questions?: string[]; // Questions asked during this recording
}

const SpeakingTest = () => {
  const navigate = useNavigate();
  const { testId } = useParams<{ testId: string }>();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Test data
  const [test, setTest] = useState<SpeakingTestType | null>(null);
  const [loadingTest, setLoadingTest] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // Test flow state
  const [phase, setPhase] = useState<TestPhase>("intro");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedTopicIndex, setSelectedTopicIndex] = useState(0);
  
  // Timer state
  const [timer, setTimer] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [micPermission, setMicPermission] = useState<"granted" | "denied" | "prompt">("prompt");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  
  // Notes for Part 2
  const [notes, setNotes] = useState("");
  
  // AI Evaluation state
  const [evaluating, setEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<SpeakingEvaluation | null>(null);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);
  
  // Session management
  const durationMinutes = 14;
  const session = useTestSession(durationMinutes, {
    onConfirmExit: () => {
      stopRecording();
      cleanupMedia();
    }
  });

  // Load test data
  useEffect(() => {
    const loadTest = async () => {
      setLoadingTest(true);
      setLoadError(null);
      try {
        const testNum = testId || "1";
        const data = await loadQuestions("speaking", testNum) as SpeakingTestType;
        setTest(data);
        // Randomly select a topic for Part 1
        if (data.part1.topics.length > 0) {
          setSelectedTopicIndex(Math.floor(Math.random() * data.part1.topics.length));
        }
      } catch (err) {
        console.error("Failed to load speaking test:", err);
        setLoadError("Failed to load speaking questions. Please try again.");
      } finally {
        setLoadingTest(false);
      }
    };
    loadTest();
  }, [testId]);

  // Timer effect
  useEffect(() => {
    if (timerActive && timer > 0) {
      timerRef.current = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            setTimerActive(false);
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive]);

  // Check microphone permission
  useEffect(() => {
    navigator.permissions?.query({ name: 'microphone' as PermissionName })
      .then(result => {
        setMicPermission(result.state as "granted" | "denied" | "prompt");
        result.onchange = () => setMicPermission(result.state as "granted" | "denied" | "prompt");
      })
      .catch(() => {});
  }, []);

  const cleanupMedia = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current = null;
    }
    chunksRef.current = [];
  }, []);

  const startRecording = async (partLabel: string, questionIdx?: number) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setMicPermission("granted");
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      recordingStartTimeRef.current = Date.now();
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const duration = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
        
        // Determine part number from label
        let partNumber = 1;
        if (partLabel.includes("2")) partNumber = 2;
        else if (partLabel.includes("3")) partNumber = 3;
        
        setRecordings(prev => [...prev, {
          blob,
          url,
          duration,
          part: partLabel,
          partNumber,
          questionIndex: questionIdx
        }]);
        
        // Clean up stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };
      
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      
      // Mark session as started
      if (!session.started) {
        session.setStarted(true);
      }
    } catch (err) {
      console.error("Microphone access denied:", err);
      setMicPermission("denied");
      toast({
        title: "Microphone Access Required",
        description: "Please allow microphone access to record your speaking responses.",
        variant: "destructive"
      });
    }
  };

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  // Get current Part 1 topic
  const currentTopic: SpeakingPart1Topic | null = useMemo(() => {
    if (!test?.part1.topics) return null;
    return test.part1.topics[selectedTopicIndex] || test.part1.topics[0];
  }, [test, selectedTopicIndex]);

  // Get current Part 1 question
  const currentPart1Question: string | null = useMemo(() => {
    if (!currentTopic) return null;
    return currentTopic.questions[currentQuestionIndex] || null;
  }, [currentTopic, currentQuestionIndex]);

  // Get current Part 3 question
  const currentPart3Question: SpeakingPart3Question | null = useMemo(() => {
    if (!test?.part3.questions) return null;
    return test.part3.questions[currentQuestionIndex] || null;
  }, [test, currentQuestionIndex]);

  // Auto-advance for Part 1 when timer completes
  const advancePart1Question = useCallback(() => {
    stopRecording();
    
    if (currentTopic && currentQuestionIndex < currentTopic.questions.length - 1) {
      const nextIdx = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIdx);
      setTimer(30);
      setTimerActive(true);
      setTimeout(() => startRecording("Part 1", nextIdx), 300);
    } else {
      // Move to Part 2
      setTimerActive(false);
      setPhase("part2-intro");
    }
  }, [currentTopic, currentQuestionIndex, stopRecording]);

  // Auto-advance for Part 3 when timer completes
  const advancePart3Question = useCallback(() => {
    stopRecording();
    
    if (test?.part3.questions && currentQuestionIndex < test.part3.questions.length - 1) {
      const nextIdx = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIdx);
      setTimer(60);
      setTimerActive(true);
      setTimeout(() => startRecording("Part 3", nextIdx), 300);
    } else {
      // Test complete
      setTimerActive(false);
      setPhase("completed");
    }
  }, [test, currentQuestionIndex, stopRecording]);

  const handleTimerComplete = useCallback(() => {
    // Auto-advance based on current phase
    if (phase === "part1-active") {
      advancePart1Question();
    } else if (phase === "part2-prep") {
      stopRecording();
      setPhase("part2-active");
      setTimer(120); // 2 minutes for speaking
      setTimerActive(true);
      startRecording("Part 2");
    } else if (phase === "part2-active") {
      stopRecording();
      if (test?.part2.followUpQuestions && test.part2.followUpQuestions.length > 0) {
        setPhase("part2-followup");
        setCurrentQuestionIndex(0);
      } else {
        setPhase("part3-intro");
      }
    } else if (phase === "part3-active") {
      advancePart3Question();
    }
  }, [phase, test, stopRecording, advancePart1Question, advancePart3Question]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startTest = () => {
    setPhase("part1-intro");
  };

  const startPart1 = async () => {
    setPhase("part1-active");
    setCurrentQuestionIndex(0);
    setTimer(30); // 30 seconds per question
    setTimerActive(true);
    await startRecording("Part 1", 0);
  };

  const nextPart1Question = async () => {
    stopRecording();
    
    if (currentTopic && currentQuestionIndex < currentTopic.questions.length - 1) {
      const nextIdx = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIdx);
      setTimer(30);
      setTimerActive(true);
      // Small delay before starting next recording
      setTimeout(() => startRecording("Part 1", nextIdx), 300);
    } else {
      // Move to Part 2
      setTimerActive(false);
      setPhase("part2-intro");
    }
  };

  const startPart2Prep = () => {
    setPhase("part2-prep");
    setTimer(60); // 1 minute preparation
    setTimerActive(true);
    setNotes("");
  };

  const startPart2Speaking = async () => {
    setTimerActive(false);
    setPhase("part2-active");
    setTimer(120); // 2 minutes
    setTimerActive(true);
    await startRecording("Part 2");
  };

  const endPart2 = () => {
    stopRecording();
    setTimerActive(false);
    if (test?.part2.followUpQuestions && test.part2.followUpQuestions.length > 0) {
      setPhase("part2-followup");
      setCurrentQuestionIndex(0);
    } else {
      setPhase("part3-intro");
    }
  };

  const handlePart2FollowUp = async () => {
    if (!test?.part2.followUpQuestions) return;
    
    if (!isRecording) {
      await startRecording("Part 2 Follow-up", currentQuestionIndex);
    } else {
      stopRecording();
      if (currentQuestionIndex < test.part2.followUpQuestions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setTimeout(() => startRecording("Part 2 Follow-up", currentQuestionIndex + 1), 300);
      } else {
        setPhase("part3-intro");
      }
    }
  };

  const startPart3 = async () => {
    setPhase("part3-active");
    setCurrentQuestionIndex(0);
    setTimer(60); // 60 seconds per question
    setTimerActive(true);
    await startRecording("Part 3", 0);
  };

  const nextPart3Question = async () => {
    stopRecording();
    
    if (test?.part3.questions && currentQuestionIndex < test.part3.questions.length - 1) {
      const nextIdx = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIdx);
      setTimer(60);
      setTimerActive(true);
      setTimeout(() => startRecording("Part 3", nextIdx), 300);
    } else {
      // Test complete
      setTimerActive(false);
      setPhase("completed");
    }
  };

  const getTotalRecordingTime = (): number => {
    return recordings.reduce((acc, rec) => acc + rec.duration, 0);
  };

  // Convert blob to base64
  const blobToBase64 = async (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Remove the data URL prefix
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Get AI Evaluation
  const getAIEvaluation = async () => {
    if (!user) {
      toast({
        title: "Sign In Required",
        description: "Please sign in to get AI evaluation of your speaking.",
        variant: "destructive"
      });
      return;
    }

    if (recordings.length === 0) {
      toast({
        title: "No Recordings",
        description: "No speaking recordings found to evaluate.",
        variant: "destructive"
      });
      return;
    }

    setEvaluating(true);
    setEvaluationError(null);

    try {
      // Group recordings by part and convert to base64
      const part1Recordings = recordings.filter(r => r.part === "Part 1");
      const part2Recordings = recordings.filter(r => r.part === "Part 2" || r.part === "Part 2 Follow-up");
      const part3Recordings = recordings.filter(r => r.part === "Part 3");

      // Combine recordings for each part
      const preparePartAudio = async (recs: Recording[], partNum: number) => {
        if (recs.length === 0) return null;
        
        // If multiple recordings for a part, combine them
        const combinedBlob = recs.length === 1 
          ? recs[0].blob 
          : new Blob(recs.map(r => r.blob), { type: 'audio/webm' });
        
        const audioBase64 = await blobToBase64(combinedBlob);
        const totalDuration = recs.reduce((sum, r) => sum + r.duration, 0);
        
        // Collect questions for this part
        const questions: string[] = [];
        if (partNum === 1 && currentTopic) {
          questions.push(...currentTopic.questions);
        } else if (partNum === 2 && test?.part2) {
          questions.push(test.part2.cueCard.topic);
        } else if (partNum === 3 && test?.part3.questions) {
          questions.push(...test.part3.questions.map(q => q.question));
        }
        
        return {
          part: partNum,
          audioBase64,
          duration: totalDuration,
          questions
        };
      };

      const partData = await Promise.all([
        preparePartAudio(part1Recordings, 1),
        preparePartAudio(part2Recordings, 2),
        preparePartAudio(part3Recordings, 3)
      ]);

      const validRecordings = partData.filter(p => p !== null);

      if (validRecordings.length === 0) {
        throw new Error("No valid recordings to evaluate");
      }

      // Call the Edge Function
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evaluate-speaking`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionData?.session?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
          },
          body: JSON.stringify({
            recordings: validRecordings,
            testId: testId || '1',
            cueCardTopic: test?.part2?.cueCard?.topic || 'General topic',
            part3Theme: test?.part3?.theme || 'General discussion'
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Evaluation failed: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && result.evaluation) {
        setEvaluation(result.evaluation);
        toast({
          title: "Evaluation Complete",
          description: `Estimated Band: ${result.evaluation.estimatedBand.toFixed(1)}`,
        });
      } else {
        throw new Error(result.error || "Evaluation failed");
      }
    } catch (error) {
      console.error("Evaluation error:", error);
      setEvaluationError(error instanceof Error ? error.message : "Failed to evaluate speaking");
      toast({
        title: "Evaluation Failed",
        description: error instanceof Error ? error.message : "An error occurred during evaluation",
        variant: "destructive"
      });
    } finally {
      setEvaluating(false);
    }
  };

  const handleRestartTest = () => {
    setPhase("intro");
    setCurrentQuestionIndex(0);
    setRecordings([]);
    setNotes("");
    setTimer(0);
    setTimerActive(false);
    setEvaluation(null);
    setEvaluationError(null);
    session.setStarted(false);
    session.setTimeLeft(durationMinutes * 60);
  };

  // Render different phases
  const renderIntro = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto"
    >
      <Card className="p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mic className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-4">IELTS Speaking Mock Test</h1>
          <p className="text-muted-foreground text-lg">
            This test simulates a real IELTS Speaking examination
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="font-semibold text-blue-700 dark:text-blue-300 mb-1">Part 1</div>
            <div className="text-sm text-blue-600 dark:text-blue-400">Introduction & Interview</div>
            <div className="text-xs text-muted-foreground mt-2">4-5 minutes</div>
          </div>
          <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="font-semibold text-purple-700 dark:text-purple-300 mb-1">Part 2</div>
            <div className="text-sm text-purple-600 dark:text-purple-400">Long Turn (Cue Card)</div>
            <div className="text-xs text-muted-foreground mt-2">3-4 minutes</div>
          </div>
          <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
            <div className="font-semibold text-green-700 dark:text-green-300 mb-1">Part 3</div>
            <div className="text-sm text-green-600 dark:text-green-400">Two-way Discussion</div>
            <div className="text-xs text-muted-foreground mt-2">4-5 minutes</div>
          </div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-amber-800 dark:text-amber-200">Before you begin</div>
              <ul className="text-sm text-amber-700 dark:text-amber-300 mt-2 space-y-1">
                <li>• Ensure you're in a quiet environment</li>
                <li>• Allow microphone access when prompted</li>
                <li>• Speak clearly and at a natural pace</li>
                <li>• Answer questions fully - don't give one-word answers</li>
              </ul>
            </div>
          </div>
        </div>

        {micPermission === "denied" && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <MicOff className="w-5 h-5 text-red-600" />
              <div className="text-red-700 dark:text-red-300">
                Microphone access is blocked. Please enable it in your browser settings to take this test.
              </div>
            </div>
          </div>
        )}

        <Button 
          size="lg" 
          className="w-full text-lg py-6"
          onClick={startTest}
          disabled={loadingTest || !!loadError}
        >
          <Play className="w-5 h-5 mr-2" />
          Start Full Speaking Test
        </Button>

        {loadError && (
          <p className="text-center text-red-500 mt-4">{loadError}</p>
        )}
      </Card>
    </motion.div>
  );

  const renderPart1Intro = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto"
    >
      <Card className="p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
            <span className="font-bold text-blue-700 dark:text-blue-300">1</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold">Part 1: Introduction & Interview</h2>
            <p className="text-muted-foreground">4-5 minutes</p>
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-3">
            <Volume2 className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
            <div>
              <p className="font-medium mb-2">Examiner Instructions</p>
              <p className="text-muted-foreground italic">
                "In this first part, I'd like to ask you some questions about yourself. {currentTopic?.introduction}"
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <h4 className="font-medium">What to expect:</h4>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              <span>You will be asked {currentTopic?.questions.length || 5} questions about {currentTopic?.theme || "familiar topics"}</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              <span>Each question has approximately 30 seconds to answer</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              <span>Recording will start automatically when the question appears</span>
            </li>
          </ul>
        </div>

        <Button size="lg" className="w-full" onClick={startPart1}>
          Begin Part 1
          <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      </Card>
    </motion.div>
  );

  const renderPart1Active = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto"
    >
      <Card className="p-8">
        {/* Progress indicator */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <span className="font-bold text-blue-700 dark:text-blue-300 text-sm">1</span>
            </div>
            <span className="font-medium">Part 1: {currentTopic?.theme}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Question {currentQuestionIndex + 1} of {currentTopic?.questions.length}
          </div>
        </div>

        {/* Timer */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Time remaining</span>
            <span className={`font-mono font-medium ${timer <= 10 ? 'text-red-500' : ''}`}>
              {formatTime(timer)}
            </span>
          </div>
          <Progress value={(timer / 30) * 100} className="h-2" />
        </div>

        {/* Question */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 rounded-xl p-8 mb-6">
          <div className="flex items-start gap-4">
            <Volume2 className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
            <p className="text-xl font-medium text-blue-900 dark:text-blue-100">
              {currentPart1Question}
            </p>
          </div>
        </div>

        {/* Recording indicator */}
        {isRecording && (
          <div className="flex items-center justify-center gap-3 mb-6 p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-700 dark:text-red-300 font-medium">Recording your answer...</span>
          </div>
        )}

        <Button 
          size="lg" 
          className="w-full"
          onClick={nextPart1Question}
        >
          {currentTopic && currentQuestionIndex < currentTopic.questions.length - 1 
            ? "Next Question" 
            : "Continue to Part 2"
          }
          <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      </Card>
    </motion.div>
  );

  const renderPart2Intro = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto"
    >
      <Card className="p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
            <span className="font-bold text-purple-700 dark:text-purple-300">2</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold">Part 2: Long Turn</h2>
            <p className="text-muted-foreground">3-4 minutes</p>
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-3">
            <Volume2 className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
            <div>
              <p className="font-medium mb-2">Examiner Instructions</p>
              <p className="text-muted-foreground italic">
                "Now, I'm going to give you a topic and I'd like you to talk about it for one to two minutes. 
                Before you talk, you'll have one minute to think about what you're going to say. 
                You can make some notes if you wish."
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <h4 className="font-medium">What to expect:</h4>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <span><strong>1 minute</strong> to prepare and make notes</span>
            </li>
            <li className="flex items-start gap-2">
              <Mic className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <span><strong>1-2 minutes</strong> to speak on the topic</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              <span>Cover all the points on the cue card</span>
            </li>
          </ul>
        </div>

        <Button size="lg" className="w-full" onClick={startPart2Prep}>
          See Topic Card
          <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      </Card>
    </motion.div>
  );

  const renderPart2Prep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto"
    >
      <div className="grid md:grid-cols-2 gap-6">
        {/* Cue Card */}
        <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50 border-2 border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-purple-600 dark:text-purple-400">CUE CARD</span>
            <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 dark:bg-amber-900 rounded-full">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className={`font-mono font-medium ${timer <= 10 ? 'text-red-500' : 'text-amber-700 dark:text-amber-300'}`}>
                {formatTime(timer)}
              </span>
            </div>
          </div>

          <h3 className="text-xl font-bold text-purple-900 dark:text-purple-100 mb-4">
            {test?.part2.cueCard.topic}
          </h3>

          <p className="text-purple-700 dark:text-purple-300 font-medium mb-3">
            {test?.part2.cueCard.instruction}
          </p>

          <ul className="space-y-2 mb-4">
            {test?.part2.cueCard.points.map((point, idx) => (
              <li key={idx} className="flex items-start gap-2 text-purple-800 dark:text-purple-200">
                <span className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0 mt-2" />
                <span>{point}</span>
              </li>
            ))}
          </ul>

          <p className="text-purple-800 dark:text-purple-200 italic">
            {test?.part2.cueCard.conclusion}
          </p>
        </Card>

        {/* Notes area */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-muted-foreground" />
            <span className="font-medium">Your Notes</span>
            <span className="text-xs text-muted-foreground">(optional)</span>
          </div>
          
          <Textarea
            placeholder="Jot down key points, ideas, or vocabulary you want to use..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[200px] resize-none"
          />

          <div className="mt-4">
            <Progress value={((60 - timer) / 60) * 100} className="h-2 mb-2" />
            <p className="text-sm text-muted-foreground text-center">
              Preparation time remaining
            </p>
          </div>

          <Button 
            size="lg" 
            className="w-full mt-4"
            onClick={startPart2Speaking}
          >
            <Mic className="w-5 h-5 mr-2" />
            Start Speaking Now
          </Button>
        </Card>
      </div>
    </motion.div>
  );

  const renderPart2Active = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto"
    >
      <Card className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
              <span className="font-bold text-purple-700 dark:text-purple-300 text-sm">2</span>
            </div>
            <span className="font-medium">Part 2: Speaking</span>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
            timer <= 30 ? 'bg-red-100 dark:bg-red-900' : 'bg-purple-100 dark:bg-purple-900'
          }`}>
            <Clock className={`w-4 h-4 ${timer <= 30 ? 'text-red-600' : 'text-purple-600'}`} />
            <span className={`font-mono font-medium ${
              timer <= 30 ? 'text-red-700 dark:text-red-300' : 'text-purple-700 dark:text-purple-300'
            }`}>
              {formatTime(timer)}
            </span>
          </div>
        </div>

        {/* Recording indicator */}
        <div className="flex items-center justify-center gap-3 mb-6 p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
          <span className="w-4 h-4 rounded-full bg-red-500 animate-pulse" />
          <span className="text-red-700 dark:text-red-300 font-medium text-lg">Recording...</span>
        </div>

        {/* Cue Card Reference */}
        <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-6 mb-6 border border-purple-200 dark:border-purple-800">
          <h3 className="font-bold text-lg mb-3">{test?.part2.cueCard.topic}</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            {test?.part2.cueCard.points.map((point, idx) => (
              <li key={idx}>• {point}</li>
            ))}
          </ul>
          <p className="text-sm italic mt-2">{test?.part2.cueCard.conclusion}</p>
        </div>

        {/* Notes Reference */}
        {notes && (
          <div className="bg-muted/50 rounded-lg p-4 mb-6">
            <div className="text-sm font-medium mb-2">Your notes:</div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{notes}</p>
          </div>
        )}

        <div className="text-center text-muted-foreground mb-4">
          Speak for 1-2 minutes. The examiner will tell you when to stop.
        </div>

        <Button 
          size="lg" 
          variant="outline"
          className="w-full"
          onClick={endPart2}
        >
          <Pause className="w-5 h-5 mr-2" />
          Finish Speaking
        </Button>
      </Card>
    </motion.div>
  );

  const renderPart2Followup = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto"
    >
      <Card className="p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
            <span className="font-bold text-purple-700 dark:text-purple-300">2</span>
          </div>
          <div>
            <h2 className="text-xl font-bold">Part 2: Follow-up Questions</h2>
            <p className="text-muted-foreground">Brief questions related to your talk</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50 rounded-xl p-8 mb-6">
          <div className="flex items-start gap-4">
            <Volume2 className="w-6 h-6 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-1" />
            <p className="text-xl font-medium text-purple-900 dark:text-purple-100">
              {test?.part2.followUpQuestions[currentQuestionIndex]}
            </p>
          </div>
        </div>

        {isRecording && (
          <div className="flex items-center justify-center gap-3 mb-6 p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-700 dark:text-red-300 font-medium">Recording...</span>
          </div>
        )}

        <Button 
          size="lg" 
          className="w-full"
          onClick={handlePart2FollowUp}
        >
          {!isRecording ? (
            <>
              <Mic className="w-5 h-5 mr-2" />
              Start Recording
            </>
          ) : test?.part2.followUpQuestions && currentQuestionIndex < test.part2.followUpQuestions.length - 1 ? (
            <>
              Next Question
              <ChevronRight className="w-5 h-5 ml-2" />
            </>
          ) : (
            <>
              Continue to Part 3
              <ChevronRight className="w-5 h-5 ml-2" />
            </>
          )}
        </Button>
      </Card>
    </motion.div>
  );

  const renderPart3Intro = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto"
    >
      <Card className="p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
            <span className="font-bold text-green-700 dark:text-green-300">3</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold">Part 3: Discussion</h2>
            <p className="text-muted-foreground">4-5 minutes</p>
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-3">
            <Volume2 className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
            <div>
              <p className="font-medium mb-2">Examiner Instructions</p>
              <p className="text-muted-foreground italic">
                "{test?.part3.introduction || "We've been talking about your topic, and I'd like to discuss some more abstract questions related to this."}"
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <h4 className="font-medium">What to expect:</h4>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              <span>Abstract, opinion-based questions related to your Part 2 topic</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              <span>Give detailed, thoughtful answers with reasons and examples</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              <span>The examiner may ask follow-up questions</span>
            </li>
          </ul>
        </div>

        <Button size="lg" className="w-full" onClick={startPart3}>
          Begin Part 3
          <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      </Card>
    </motion.div>
  );

  const renderPart3Active = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto"
    >
      <Card className="p-8">
        {/* Progress indicator */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <span className="font-bold text-green-700 dark:text-green-300 text-sm">3</span>
            </div>
            <span className="font-medium">Part 3: {test?.part3.theme}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Question {currentQuestionIndex + 1} of {test?.part3.questions.length}
          </div>
        </div>

        {/* Timer */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Time remaining</span>
            <span className={`font-mono font-medium ${timer <= 15 ? 'text-red-500' : ''}`}>
              {formatTime(timer)}
            </span>
          </div>
          <Progress value={(timer / 60) * 100} className="h-2" />
        </div>

        {/* Question */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50 rounded-xl p-8 mb-6">
          <div className="flex items-start gap-4">
            <Volume2 className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-1" />
            <div>
              <p className="text-xl font-medium text-green-900 dark:text-green-100 mb-3">
                {currentPart3Question?.question}
              </p>
              {currentPart3Question?.followUp && (
                <p className="text-sm text-green-700 dark:text-green-300 italic">
                  Follow-up: {currentPart3Question.followUp}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Recording indicator */}
        {isRecording && (
          <div className="flex items-center justify-center gap-3 mb-6 p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-700 dark:text-red-300 font-medium">Recording your answer...</span>
          </div>
        )}

        <Button 
          size="lg" 
          className="w-full"
          onClick={nextPart3Question}
        >
          {test?.part3.questions && currentQuestionIndex < test.part3.questions.length - 1 
            ? "Next Question" 
            : "Complete Test"
          }
          <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      </Card>
    </motion.div>
  );

  const renderCompleted = () => {
    // Show evaluation results if available
    if (evaluation) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-4xl mx-auto"
        >
          <SpeakingEvaluationResult 
            evaluation={evaluation} 
            onRetake={handleRestartTest}
          />
          <div className="mt-6 flex justify-center">
            <Button variant="outline" onClick={() => navigate('/mock-tests')}>
              Back to Mock Tests
            </Button>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-3xl mx-auto"
      >
        <Card className="p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Test Completed!</h1>
            <p className="text-muted-foreground text-lg">
              Well done! You've completed the IELTS Speaking Mock Test
            </p>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">{recordings.length}</div>
              <div className="text-sm text-muted-foreground">Recordings</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">{formatTime(getTotalRecordingTime())}</div>
              <div className="text-sm text-muted-foreground">Total Time</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">3</div>
              <div className="text-sm text-muted-foreground">Parts Completed</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">✓</div>
              <div className="text-sm text-muted-foreground">Full Test</div>
            </div>
          </div>

          {/* Recordings list */}
          <div className="mb-8">
            <h3 className="font-semibold mb-4">Your Recordings</h3>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {recordings.map((rec, idx) => (
                <div key={idx} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{rec.part}</div>
                    <div className="text-sm text-muted-foreground">{formatTime(rec.duration)}</div>
                  </div>
                  <audio controls src={rec.url} className="h-10" />
                </div>
              ))}
            </div>
          </div>

          {/* AI Evaluation Section */}
          <div className="mb-6">
            {evaluationError && (
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-700 dark:text-red-300">Evaluation Error</p>
                    <p className="text-sm text-red-600 dark:text-red-400">{evaluationError}</p>
                  </div>
                </div>
              </div>
            )}

            {!user ? (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  <strong>Sign in required:</strong> Create an account or sign in to get AI-powered evaluation of your speaking performance.
                </p>
              </div>
            ) : (
              <Button 
                onClick={getAIEvaluation} 
                disabled={evaluating || recordings.length === 0}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                size="lg"
              >
                {evaluating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Analyzing Your Speaking...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Get AI Evaluation
                  </>
                )}
              </Button>
            )}

            {evaluating && (
              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">
                  This may take 30-60 seconds. We're transcribing your audio and analyzing your performance...
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" onClick={handleRestartTest}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Take Another Test
            </Button>
            <Button onClick={() => navigate('/mock-tests')}>
              Back to Mock Tests
            </Button>
          </div>
        </Card>
      </motion.div>
    );
  };

  // Main render
  return (
    <div className="min-h-screen bg-background">
      <TestHeader
        title="Speaking Test"
        session={session}
        recordingIndicator={isRecording ? (
          <div className="flex items-center gap-2 text-sm mr-4">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600 text-white">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              Recording
            </span>
          </div>
        ) : null}
      />
      
      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4">
          {/* Phase indicator */}
          {phase !== "intro" && phase !== "completed" && (
            <div className="max-w-3xl mx-auto mb-6">
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3].map((part) => {
                  const isActive = 
                    (part === 1 && (phase === "part1-intro" || phase === "part1-active")) ||
                    (part === 2 && (phase === "part2-intro" || phase === "part2-prep" || phase === "part2-active" || phase === "part2-followup")) ||
                    (part === 3 && (phase === "part3-intro" || phase === "part3-active"));
                  const isCompleted = 
                    (part === 1 && !phase.startsWith("part1")) ||
                    (part === 2 && phase.startsWith("part3"));
                  
                  return (
                    <div key={part} className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                        isCompleted 
                          ? "bg-green-500 text-white" 
                          : isActive 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-muted text-muted-foreground"
                      }`}>
                        {isCompleted ? <CheckCircle className="w-4 h-4" /> : part}
                      </div>
                      {part < 3 && (
                        <div className={`w-16 h-1 mx-1 rounded ${
                          isCompleted ? "bg-green-500" : "bg-muted"
                        }`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Loading state */}
          {loadingTest && (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          )}

          {/* Phase content */}
          {!loadingTest && (
            <AnimatePresence mode="wait">
              {phase === "intro" && renderIntro()}
              {phase === "part1-intro" && renderPart1Intro()}
              {phase === "part1-active" && renderPart1Active()}
              {phase === "part2-intro" && renderPart2Intro()}
              {phase === "part2-prep" && renderPart2Prep()}
              {phase === "part2-active" && renderPart2Active()}
              {phase === "part2-followup" && renderPart2Followup()}
              {phase === "part3-intro" && renderPart3Intro()}
              {phase === "part3-active" && renderPart3Active()}
              {phase === "completed" && renderCompleted()}
            </AnimatePresence>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SpeakingTest;
