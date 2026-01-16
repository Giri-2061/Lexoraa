import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';
import { WritingEvaluation } from '@/utils/writingEvaluation';

interface EvaluationResultProps {
  evaluation: WritingEvaluation;
}

const getBandColor = (score: number): string => {
  if (score >= 8) return 'bg-green-500';
  if (score >= 7) return 'bg-blue-500';
  if (score >= 6) return 'bg-yellow-500';
  if (score >= 5) return 'bg-orange-500';
  return 'bg-red-500';
};

const ScoreCard = ({ title, score, feedback }: { title: string; score: number; feedback: string }) => (
  <Card className="mb-4">
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <CardTitle className="text-lg">{title}</CardTitle>
        <Badge className={`${getBandColor(score)} text-white text-lg px-3 py-1`}>
          {score.toFixed(1)}
        </Badge>
      </div>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground">{feedback}</p>
    </CardContent>
  </Card>
);

export default function EvaluationResult({ evaluation }: EvaluationResultProps) {
  return (
    <div className="space-y-6">
      {/* Overall Band Score */}
      <Card className="border-2 border-primary">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl mb-2">Overall Band Score</CardTitle>
          <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${getBandColor(evaluation.overallBand)} text-white text-4xl font-bold`}>
            {evaluation.overallBand.toFixed(1)}
          </div>
          {evaluation.wordCount && (
            <p className="text-sm text-muted-foreground mt-2">
              Word Count: {evaluation.wordCount}
            </p>
          )}
        </CardHeader>
      </Card>

      {/* Individual Scores */}
      <div className="grid md:grid-cols-2 gap-4">
        <ScoreCard
          title="Task Achievement/Response"
          score={evaluation.taskAchievement.score}
          feedback={evaluation.taskAchievement.feedback}
        />
        <ScoreCard
          title="Coherence and Cohesion"
          score={evaluation.coherenceCohesion.score}
          feedback={evaluation.coherenceCohesion.feedback}
        />
        <ScoreCard
          title="Lexical Resource"
          score={evaluation.lexicalResource.score}
          feedback={evaluation.lexicalResource.feedback}
        />
        <ScoreCard
          title="Grammatical Range and Accuracy"
          score={evaluation.grammarAccuracy.score}
          feedback={evaluation.grammarAccuracy.feedback}
        />
      </div>

      {/* Strengths */}
      {evaluation.strengths && evaluation.strengths.length > 0 && (
        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {evaluation.strengths.map((strength, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Areas for Improvement */}
      {evaluation.improvements && evaluation.improvements.length > 0 && (
        <Card className="bg-orange-50 border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <TrendingUp className="w-5 h-5" />
              Areas for Improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {evaluation.improvements.map((improvement, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span>{improvement}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Examiner Notes (alternative format from API) */}
      {evaluation.examinerNotes && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <AlertCircle className="w-5 h-5" />
              Examiner Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{evaluation.examinerNotes}</p>
          </CardContent>
        </Card>
      )}

      {/* IELTS Band Descriptors Reference */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">IELTS Band Score Guide</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p><strong>9.0:</strong> Expert user - Full operational command</p>
          <p><strong>8.0-8.5:</strong> Very good user - Fully operational command with occasional inaccuracies</p>
          <p><strong>7.0-7.5:</strong> Good user - Operational command with occasional inaccuracies</p>
          <p><strong>6.0-6.5:</strong> Competent user - Effective command despite some inaccuracies</p>
          <p><strong>5.0-5.5:</strong> Modest user - Partial command, copes with overall meaning</p>
        </CardContent>
      </Card>
    </div>
  );
}
