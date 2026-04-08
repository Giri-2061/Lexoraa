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
  partNumber: number;
  questionIndex?: number;
  questions?: string[];
}

const SpeakingTestAIExaminer = () => {
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

  // TTS state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const beepAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Notes for Part 2
  const [notes, setNotes] = useState("");

  // AI Evaluation state
  const [evaluating, setEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<SpeakingEvaluation | null>(null);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);

  // Media cleanup functions (defined before useEffect hooks)
  const cleanupMedia = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current = null;
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  // Session management
  const durationMinutes = 14;
  const session = useTestSession(durationMinutes, {
    onConfirmExit: () => {
      stopRecording();
      cleanupMedia();
      stopSpeaking();
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

  // Check microphone permission
  useEffect(() => {
    navigator.permissions?.query({ name: 'microphone' as any })
      .then(result => {
        setMicPermission(result.state as "granted" | "denied" | "prompt");
      });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupMedia();
      stopSpeaking();
      if (beepAudioRef.current) {
        beepAudioRef.current.pause();
        beepAudioRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [cleanupMedia, stopSpeaking]);

  // Play beep sound function
  const playBeep = useCallback(async (): Promise<void> => {
    try {
      if (!beepAudioRef.current) {
        beepAudioRef.current = new Audio('/beep.mp3');
      }
      beepAudioRef.current.currentTime = 0; // Reset to beginning
      await beepAudioRef.current.play();
    } catch (error) {
      console.error('Failed to play beep sound:', error);
      // Continue without beep - don't block the flow
    }
  }, []);

  // Unlock audio context for autoplay policies
  const unlockAudioContext = useCallback(async (): Promise<void> => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      // Also try to play a silent audio to unlock Web Audio API
      const buffer = audioContextRef.current.createBuffer(1, 1, 22050);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContextRef.current.destination);
      source.start();

      // Audio context unlocked successfully
    } catch (error) {
      // Failed to unlock audio context - continue anyway
    }
  }, []);

  const startRecording = useCallback(async (partLabel: string, questionIdx?: number) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      recordingStartTimeRef.current = Date.now();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const duration = (Date.now() - recordingStartTimeRef.current) / 1000;

        const partNumber = partLabel === "Part 1" ? 1 : partLabel === "Part 2" ? 2 : 3;

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
  }, [session, toast]);

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

  // Web Speech API TTS function
  // TODO: Replace with OpenAI TTS for production
  // const speakQuestion = useCallback(async (text: string): Promise<void> => {
  //   // OpenAI TTS implementation here
  // }, [toast]);
  const speakQuestion = useCallback(async (text: string): Promise<void> => {
    if (!text.trim()) return;

    try {
      setIsSpeaking(true);

      // Check if Web Speech API is available
      if (!window.speechSynthesis) {
        setIsSpeaking(false);
        toast({
          title: "Speech Not Supported",
          description: "Your browser doesn't support speech synthesis. Continuing with text only.",
          variant: "destructive"
        });
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);

      // Configure voice settings
      utterance.rate = 0.9; // Slightly slower for clarity
      utterance.pitch = 1; // Normal pitch
      utterance.volume = 0.8; // Good volume level

      // Try to find an English voice (preferably female for examiner feel)
      const voices = window.speechSynthesis.getVoices();
      const englishVoice = voices.find(voice =>
        voice.lang.startsWith('en') &&
        (voice.name.toLowerCase().includes('female') ||
         voice.name.toLowerCase().includes('woman') ||
         voice.name.toLowerCase().includes('zira') ||
         voice.name.toLowerCase().includes('susan'))
      ) || voices.find(voice => voice.lang.startsWith('en'));

      if (englishVoice) {
        utterance.voice = englishVoice;
      }

      return new Promise((resolve, reject) => {
        utterance.onend = () => {
          setIsSpeaking(false);
          resolve();
        };
        utterance.onerror = () => {
          setIsSpeaking(false);
          reject(new Error('Speech synthesis failed'));
        };

        window.speechSynthesis.speak(utterance);
      });
    } catch (error) {
      setIsSpeaking(false);
      toast({
        title: "Speech Error",
        description: "Failed to generate speech. Continuing with text only.",
        variant: "destructive"
      });
      // Continue without TTS
    }
  }, [toast]);

  // Speak question and then start recording
  const speakAndRecord = useCallback(async (text: string, partLabel: string, questionIdx?: number) => {
    try {
      await speakQuestion(text);
      // After speaking, start recording
      await startRecording(partLabel, questionIdx);
    } catch (error) {
      // Fallback: start recording without speaking
      await startRecording(partLabel, questionIdx);
    }
  }, [speakQuestion, startRecording]);

  // Auto-advance for Part 1 when timer completes
  const advancePart1Question = useCallback(async () => {
    stopRecording();

    if (currentTopic && currentQuestionIndex < currentTopic.questions.length - 1) {
      const nextIdx = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIdx);
      setTimer(30);
      setTimerActive(true);

      // Speak next question
      const nextQuestion = currentTopic.questions[nextIdx];
      if (nextQuestion) {
        setTimeout(() => speakAndRecord(nextQuestion, "Part 1", nextIdx), 300);
      }
    } else {
      // Move to Part 2
      setTimerActive(false);
      setPhase("part2-intro");
    }
  }, [currentTopic, currentQuestionIndex, stopRecording, speakAndRecord]);

  // Auto-advance for Part 3 when timer completes
  const advancePart3Question = useCallback(async () => {
    stopRecording();

    if (test?.part3.questions && currentQuestionIndex < test.part3.questions.length - 1) {
      const nextIdx = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIdx);
      setTimer(60);
      setTimerActive(true);

      // Speak next question
      const nextQuestion = test.part3.questions[nextIdx];
      if (nextQuestion?.question) {
        setTimeout(() => speakAndRecord(nextQuestion.question, "Part 3", nextIdx), 300);
      }
    } else {
      // Test complete
      setTimerActive(false);
      setPhase("completed");
    }
  }, [test, currentQuestionIndex, stopRecording, speakAndRecord]);

  const handleTimerComplete = useCallback(() => {
    // Auto-advance based on current phase
    if (phase === "part1-active") {
      advancePart1Question();
    } else if (phase === "part2-prep") {
      stopRecording();
      setPhase("part2-active");
      setTimer(120); // 2 minutes for speaking
      setTimerActive(true);
      // Play beep sound to signal start of speaking
      playBeep();
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
  }, [phase, test, stopRecording, advancePart1Question, advancePart3Question, startRecording, playBeep]);

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
  }, [timerActive, timer, handleTimerComplete]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startTest = async () => {
    // Unlock audio context on user interaction
    await unlockAudioContext();
    setPhase("part1-intro");
  };

  const startPart1 = async () => {
    setPhase("part1-active");
    setCurrentQuestionIndex(0);
    setTimer(30); // 30 seconds per question
    setTimerActive(true);

    // Speak first question
    const firstQuestion = currentTopic?.questions[0];
    if (firstQuestion) {
      await speakAndRecord(firstQuestion, "Part 1", 0);
    }
  };

  const nextPart1Question = async () => {
    stopRecording();

    if (currentTopic && currentQuestionIndex < currentTopic.questions.length - 1) {
      const nextIdx = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIdx);
      setTimer(30);
      setTimerActive(true);
      // Speak next question
      const nextQuestion = currentTopic.questions[nextIdx];
      if (nextQuestion) {
        setTimeout(() => speakAndRecord(nextQuestion, "Part 1", nextIdx), 300);
      }
    } else {
      // Move to Part 2
      setTimerActive(false);
      setPhase("part2-intro");
    }
  };

  const startPart2Prep = async () => {
    setPhase("part2-prep");
    setTimer(60); // 1 minute preparation
    setTimerActive(true);
    setNotes("");

    // Speak Part 2 introduction
    const introText = "I will now give you a topic. You have one minute to prepare. You can start speaking when you hear the beep.";
    await speakQuestion(introText);

    // Then speak the cue card topic
    const cueCardText = test?.part2.cueCard.topic || "";
    if (cueCardText) {
      await speakQuestion(cueCardText);
    }
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
      const question = test.part2.followUpQuestions[currentQuestionIndex];
      if (question) {
        await speakAndRecord(question, "Part 2 Follow-up", currentQuestionIndex);
      }
    } else {
      stopRecording();
      if (currentQuestionIndex < test.part2.followUpQuestions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        const nextQuestion = test.part2.followUpQuestions[currentQuestionIndex + 1];
        if (nextQuestion) {
          setTimeout(() => speakAndRecord(nextQuestion, "Part 2 Follow-up", currentQuestionIndex + 1), 300);
        }
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

    // Speak first Part 3 question
    const firstQuestion = test?.part3.questions[0]?.question;
    if (firstQuestion) {
      await speakAndRecord(firstQuestion, "Part 3", 0);
    }
  };

  const nextPart3Question = async () => {
    stopRecording();

    if (test?.part3.questions && currentQuestionIndex < test.part3.questions.length - 1) {
      const nextIdx = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIdx);
      setTimer(60);
      setTimerActive(true);
      // Speak next question
      const nextQuestion = test.part3.questions[nextIdx]?.question;
      if (nextQuestion) {
        setTimeout(() => speakAndRecord(nextQuestion, "Part 3", nextIdx), 300);
      }
    } else {
      // Test complete
      setTimerActive(false);
      setPhase("completed");
    }
  };

  // Evaluation logic (same as original)
  const evaluateSpeaking = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to evaluate your speaking test.",
        variant: "destructive"
      });
      return;
    }

    setEvaluating(true);
    setEvaluationError(null);

    try {
      // Prepare recordings for evaluation
      const validRecordings = recordings.filter(r => r.blob.size > 0);

      if (validRecordings.length === 0) {
        throw new Error("No valid recordings to evaluate");
      }

      // Convert blobs to base64
      const recordingsData = await Promise.all(
        validRecordings.map(async (recording) => {
          const arrayBuffer = await recording.blob.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
          return {
            data: base64,
            duration: recording.duration,
            part: recording.part,
            partNumber: recording.partNumber,
            questionIndex: recording.questionIndex,
            questions: recording.questions
          };
        })
      );

      // Call the Edge Function
      const { data: sessionData } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
      };

      if (sessionData?.session?.access_token) {
        headers.Authorization = `Bearer ${sessionData.session.access_token}`;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evaluate-speaking`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            recordings: recordingsData,
            testId: testId || '1',
            userId: user?.id,
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
            <Sparkles className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-4">IELTS Speaking Test - AI Examiner Mode</h1>
          <p className="text-muted-foreground text-lg">
            Experience an interactive speaking test with AI-powered voice questions
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
            <Volume2 className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-1">AI Examiner Features</h3>
              <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                <li>• Questions are spoken aloud by AI voice</li>
                <li>• Recording starts automatically after each question</li>
                <li>• Part 2 includes special preparation instructions</li>
                <li>• Same evaluation criteria as Practice Mode</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="text-center">
          <Button
            onClick={startTest}
            size="lg"
            className="px-8 py-3 text-lg"
          >
            Start AI Examiner Test
            <ChevronRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
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
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-4">Part 1: Introduction and Interview</h2>
          <p className="text-muted-foreground">
            The examiner will ask you questions about familiar topics such as home, family, work, studies, and interests.
          </p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">How it works:</h3>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>• Each question will be spoken by the AI examiner</li>
            <li>• You have 30 seconds to respond to each question</li>
            <li>• Recording starts automatically after the question is spoken</li>
            <li>• Click "Next" to proceed to the next question</li>
          </ul>
        </div>

        <div className="text-center">
          <Button onClick={startPart1} size="lg">
            Start Part 1
          </Button>
        </div>
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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <span className="font-bold text-blue-700 dark:text-blue-300">1</span>
            </div>
            <div>
              <h2 className="text-xl font-bold">Part 1: Interview</h2>
              <p className="text-sm text-muted-foreground">Question {currentQuestionIndex + 1} of {currentTopic?.questions.length}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-mono font-bold">{formatTime(timer)}</div>
            <div className="text-sm text-muted-foreground">Time remaining</div>
          </div>
        </div>

        <div className="mb-6">
          <div className="bg-muted/50 p-6 rounded-lg mb-4">
            <div className="flex items-center gap-3 mb-3">
              <Volume2 className="w-5 h-5 text-primary" />
              <span className="font-semibold">AI Examiner:</span>
              {isSpeaking && <Loader2 className="w-4 h-4 animate-spin" />}
            </div>
            <p className="text-lg leading-relaxed">{currentPart1Question}</p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 mb-6">
          <Button
            onClick={isRecording ? stopRecording : () => startRecording("Part 1", currentQuestionIndex)}
            variant={isRecording ? "destructive" : "default"}
            size="lg"
            disabled={isSpeaking}
            className="flex items-center gap-2"
          >
            {isRecording ? (
              <>
                <MicOff className="w-5 h-5" />
                Stop Recording
              </>
            ) : (
              <>
                <Mic className="w-5 h-5" />
                {isSpeaking ? "AI Speaking..." : "Start Recording"}
              </>
            )}
          </Button>
        </div>

        <Progress value={(timer / 30) * 100} className="mb-4" />

        <div className="text-center">
          <Button
            onClick={nextPart1Question}
            variant="outline"
            disabled={isRecording || isSpeaking}
          >
            Next Question
            <ChevronRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
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
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-4">Part 2: Individual Long Turn</h2>
          <p className="text-muted-foreground">
            You will be given a topic to talk about for 1-2 minutes. You have one minute to prepare.
          </p>
        </div>

        <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-purple-800 dark:text-purple-200 mb-2">How it works:</h3>
          <ul className="text-sm text-purple-700 dark:text-purple-300 space-y-1">
            <li>• The AI examiner will introduce the topic</li>
            <li>• You have 1 minute to prepare notes</li>
            <li>• Then speak for 1-2 minutes on the topic</li>
            <li>• Recording starts automatically after preparation</li>
          </ul>
        </div>

        <div className="text-center">
          <Button onClick={startPart2Prep} size="lg">
            Start Part 2 Preparation
          </Button>
        </div>
      </Card>
    </motion.div>
  );

  const renderPart2Prep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto"
    >
      <Card className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
              <span className="font-bold text-purple-700 dark:text-purple-300">2</span>
            </div>
            <div>
              <h2 className="text-xl font-bold">Part 2: Preparation</h2>
              <p className="text-sm text-muted-foreground">Prepare your response</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-mono font-bold">{formatTime(timer)}</div>
            <div className="text-sm text-muted-foreground">Preparation time</div>
          </div>
        </div>

        <div className="bg-muted/50 p-6 rounded-lg mb-6">
          <div className="flex items-center gap-3 mb-3">
            <Volume2 className="w-5 h-5 text-primary" />
            <span className="font-semibold">AI Examiner:</span>
            {isSpeaking && <Loader2 className="w-4 h-4 animate-spin" />}
          </div>
          <p className="text-lg leading-relaxed mb-4">
            I will now give you a topic. You have one minute to prepare. You can start speaking when you hear the beep.
          </p>
          <div className="bg-card p-4 rounded border">
            <h3 className="font-semibold mb-2">Topic:</h3>
            <p className="text-lg">{test?.part2.cueCard.topic}</p>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Preparation Notes (Optional)</label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Jot down some notes to help you organize your thoughts..."
            rows={4}
          />
        </div>

        <Progress value={(timer / 60) * 100} className="mb-4" />

        <div className="text-center">
          <Button
            onClick={startPart2Speaking}
            size="lg"
            disabled={timer > 0}
          >
            Start Speaking
            <Mic className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </Card>
    </motion.div>
  );

  const renderPart2Active = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto"
    >
      <Card className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
              <span className="font-bold text-purple-700 dark:text-purple-300">2</span>
            </div>
            <div>
              <h2 className="text-xl font-bold">Part 2: Long Turn</h2>
              <p className="text-sm text-muted-foreground">Speak about the topic</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-mono font-bold">{formatTime(timer)}</div>
            <div className="text-sm text-muted-foreground">Speaking time</div>
          </div>
        </div>

        <div className="bg-muted/50 p-6 rounded-lg mb-6">
          <h3 className="font-semibold mb-2">Topic:</h3>
          <p className="text-lg leading-relaxed">{test?.part2.cueCard.topic}</p>
        </div>

        <div className="flex items-center justify-center gap-4 mb-6">
          <Button
            onClick={isRecording ? stopRecording : () => startRecording("Part 2")}
            variant={isRecording ? "destructive" : "default"}
            size="lg"
            className="flex items-center gap-2"
          >
            {isRecording ? (
              <>
                <MicOff className="w-5 h-5" />
                Stop Recording
              </>
            ) : (
              <>
                <Mic className="w-5 h-5" />
                Start Recording
              </>
            )}
          </Button>
        </div>

        <Progress value={(timer / 120) * 100} className="mb-4" />

        <div className="text-center">
          <Button
            onClick={endPart2}
            variant="outline"
            disabled={!isRecording}
          >
            Finish Part 2
          </Button>
        </div>
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
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-4">Part 3: Two-way Discussion</h2>
          <p className="text-muted-foreground">
            The examiner will ask you more detailed questions related to the topic in Part 2.
          </p>
        </div>

        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">How it works:</h3>
          <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
            <li>• Each question will be spoken by the AI examiner</li>
            <li>• You have 60 seconds to respond to each question</li>
            <li>• Recording starts automatically after the question is spoken</li>
            <li>• Click "Next" to proceed to the next question</li>
          </ul>
        </div>

        <div className="text-center">
          <Button onClick={startPart3} size="lg">
            Start Part 3
          </Button>
        </div>
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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <span className="font-bold text-green-700 dark:text-green-300">3</span>
            </div>
            <div>
              <h2 className="text-xl font-bold">Part 3: Discussion</h2>
              <p className="text-sm text-muted-foreground">Question {currentQuestionIndex + 1} of {test?.part3.questions.length}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-mono font-bold">{formatTime(timer)}</div>
            <div className="text-sm text-muted-foreground">Time remaining</div>
          </div>
        </div>

        <div className="mb-6">
          <div className="bg-muted/50 p-6 rounded-lg mb-4">
            <div className="flex items-center gap-3 mb-3">
              <Volume2 className="w-5 h-5 text-primary" />
              <span className="font-semibold">AI Examiner:</span>
              {isSpeaking && <Loader2 className="w-4 h-4 animate-spin" />}
            </div>
            <p className="text-lg leading-relaxed">{currentPart3Question?.question}</p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 mb-6">
          <Button
            onClick={isRecording ? stopRecording : () => startRecording("Part 3", currentQuestionIndex)}
            variant={isRecording ? "destructive" : "default"}
            size="lg"
            disabled={isSpeaking}
            className="flex items-center gap-2"
          >
            {isRecording ? (
              <>
                <MicOff className="w-5 h-5" />
                Stop Recording
              </>
            ) : (
              <>
                <Mic className="w-5 h-5" />
                {isSpeaking ? "AI Speaking..." : "Start Recording"}
              </>
            )}
          </Button>
        </div>

        <Progress value={(timer / 60) * 100} className="mb-4" />

        <div className="text-center">
          <Button
            onClick={nextPart3Question}
            variant="outline"
            disabled={isRecording || isSpeaking}
          >
            Next Question
            <ChevronRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </Card>
    </motion.div>
  );

  const renderCompleted = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto"
    >
      <Card className="p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Test Completed!</h1>
          <p className="text-muted-foreground text-lg">
            Your AI Examiner speaking test has finished. You can now evaluate your performance.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-primary mb-1">{recordings.length}</div>
            <div className="text-sm text-muted-foreground">Recordings Made</div>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-primary mb-1">
              {recordings.reduce((acc, r) => acc + r.duration, 0).toFixed(0)}s
            </div>
            <div className="text-sm text-muted-foreground">Total Speaking Time</div>
          </div>
        </div>

        <div className="space-y-4">
          <Button
            onClick={evaluateSpeaking}
            disabled={evaluating}
            size="lg"
            className="w-full"
          >
            {evaluating ? (
              <>
                <Loader2 className="mr-2 w-5 h-5 animate-spin" />
                Evaluating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 w-5 h-5" />
                Get AI Evaluation
              </>
            )}
          </Button>

          <Button
            onClick={handleRestartTest}
            variant="outline"
            className="w-full"
          >
            <RotateCcw className="mr-2 w-5 h-5" />
            Take Test Again
          </Button>
        </div>

        {evaluation && (
          <div className="mt-8">
            <SpeakingEvaluationResult evaluation={evaluation} />
          </div>
        )}

        {evaluationError && (
          <div className="mt-8 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              <span className="font-semibold">Evaluation Error</span>
            </div>
            <p className="text-sm text-destructive/80 mt-1">{evaluationError}</p>
          </div>
        )}
      </Card>
    </motion.div>
  );

  if (loadingTest) {
    return (
      <div className="min-h-screen bg-background">
        <TestHeader />
        <main className="pt-24 pb-20">
          <div className="container mx-auto px-4 max-w-3xl">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Loading AI Examiner test...</p>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-background">
        <TestHeader />
        <main className="pt-24 pb-20">
          <div className="container mx-auto px-4 max-w-3xl">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">Failed to Load Test</h2>
                <p className="text-muted-foreground mb-4">{loadError}</p>
                <Button onClick={() => navigate("/speaking/cambridge-08")}>
                  Back to Test Selection
                </Button>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TestHeader />
      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <AnimatePresence mode="wait">
            {phase === "intro" && renderIntro()}
            {phase === "part1-intro" && renderPart1Intro()}
            {phase === "part1-active" && renderPart1Active()}
            {phase === "part2-intro" && renderPart2Intro()}
            {phase === "part2-prep" && renderPart2Prep()}
            {phase === "part2-active" && renderPart2Active()}
            {phase === "part3-intro" && renderPart3Intro()}
            {phase === "part3-active" && renderPart3Active()}
            {phase === "completed" && renderCompleted()}
          </AnimatePresence>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SpeakingTestAIExaminer;