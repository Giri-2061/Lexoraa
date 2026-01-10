// Add these imports at the top of WritingTest.tsx:
import { evaluateWriting, getWordCount, WritingEvaluation } from '@/utils/writingEvaluation';
import { useAuth } from '@/hooks/useAuth';
import EvaluationResult from '@/components/EvaluationResult';
import { Loader2, Sparkles } from 'lucide-react';

// Add these state variables after your existing state declarations (around line 40):
const [isEvaluating, setIsEvaluating] = useState(false);
const [task1Evaluation, setTask1Evaluation] = useState<WritingEvaluation | null>(null);
const [task2Evaluation, setTask2Evaluation] = useState<WritingEvaluation | null>(null);
const [showEvaluation, setShowEvaluation] = useState(false);
const { user } = useAuth();

// Add this function to evaluate a task (add after handleUploadImage function around line 170):
const handleEvaluateTask = async (taskNumber: 1 | 2) => {
  const essayText = taskNumber === 1 ? task1Answer : task2Answer;
  const taskPrompt = test?.tasks?.[taskNumber - 1]?.prompt || 'No prompt available';
  
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

// Add "Get AI Feedback" button in each task card (around line 300-350)
// Add this button after the Upload button in both Task 1 and Task 2 sections:

<Button
  type="button"
  variant="outline"
  onClick={() => handleEvaluateTask(1)} // or 2 for Task 2
  disabled={isEvaluating || !task1Answer} // or !task2Answer for Task 2
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

// Add evaluation display section after the task cards (around line 380):
// Insert this before the Submit button:

{(task1Evaluation || task2Evaluation) && showEvaluation && (
  <Card className="p-6 mt-6">
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

// Note: The exact line numbers may vary based on your current code structure.
// Look for these sections in your WritingTest.tsx and add the code accordingly.
