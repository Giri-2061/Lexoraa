import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, CheckCircle, Info, ChevronDown, ChevronUp, Mic } from 'lucide-react';
import { SpeakingEvaluation } from '@/types/speakingEvaluation';

interface SpeakingEvaluationResultProps {
  evaluation: SpeakingEvaluation;
  onRetake?: () => void;
}

const getBandColor = (band: number): string => {
  if (band >= 7.5) return 'text-green-500';
  if (band >= 6.0) return 'text-blue-500';
  if (band >= 5.0) return 'text-yellow-500';
  return 'text-red-500';
};

const getBandBgColor = (band: number): string => {
  if (band >= 7.5) return 'bg-green-100 text-green-800 border-green-300';
  if (band >= 6.0) return 'bg-blue-100 text-blue-800 border-blue-300';
  if (band >= 5.0) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
  return 'bg-red-100 text-red-800 border-red-300';
};

const CriterionCard: React.FC<{
  title: string;
  score: number;
  confidence?: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  icon?: React.ReactNode;
}> = ({ title, score, confidence, feedback, strengths, improvements, icon }) => {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <Card className="mb-4">
      <CardHeader 
        className="cursor-pointer pb-2"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icon}
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          <div className="flex items-center gap-3">
            <div className={`text-3xl font-bold ${getBandColor(score)}`}>
              {score.toFixed(1)}
            </div>
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>
        <Progress value={(score / 9) * 100} className="h-2 mt-2" />
        {confidence !== undefined && (
          <p className="text-xs text-muted-foreground mt-1">
            Confidence: {(confidence * 100).toFixed(0)}%
          </p>
        )}
      </CardHeader>
      
      {expanded && (
        <CardContent className="pt-0 space-y-4">
          <p className="text-sm text-muted-foreground">{feedback}</p>
          
          {strengths.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm text-green-700 mb-2 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> Strengths
              </h4>
              <ul className="list-disc list-inside space-y-1">
                {strengths.map((s, i) => (
                  <li key={i} className="text-sm text-muted-foreground">{s}</li>
                ))}
              </ul>
            </div>
          )}
          
          {improvements.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm text-orange-700 mb-2 flex items-center gap-1">
                <Info className="w-4 h-4" /> Areas to Improve
              </h4>
              <ul className="list-disc list-inside space-y-1">
                {improvements.map((s, i) => (
                  <li key={i} className="text-sm text-muted-foreground">{s}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export const SpeakingEvaluationResult: React.FC<SpeakingEvaluationResultProps> = ({
  evaluation,
  onRetake
}) => {
  const { 
    estimatedBand, 
    bandRange, 
    confidence,
    fluencyCoherence, 
    lexicalResource, 
    grammaticalRange, 
    pronunciation,
    fluencyMetrics,
    transcripts,
    audioQuality,
    disclaimer
  } = evaluation;

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      {/* Header with Overall Band */}
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-xl">Your Speaking Evaluation</CardTitle>
          <CardDescription>AI-Estimated IELTS Speaking Score</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className={`text-7xl font-bold ${getBandColor(estimatedBand)} mb-2`}>
            {estimatedBand.toFixed(1)}
          </div>
          <div className="text-sm text-muted-foreground mb-4">
            Estimated Band Range: {bandRange.low.toFixed(1)} - {bandRange.high.toFixed(1)}
          </div>
          <Badge className={getBandBgColor(estimatedBand)} variant="outline">
            Confidence: {confidence === 'high' ? 'High' : confidence === 'medium' ? 'Medium' : 'Low'}
          </Badge>
        </CardContent>
      </Card>

      {/* Audio Quality Warning */}
      {audioQuality && audioQuality.warnings && audioQuality.warnings.length > 0 && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-yellow-800 mb-1">Audio Quality Notice</h4>
              <ul className="space-y-1">
                {audioQuality.warnings.map((warning, i) => (
                  <li key={i} className="text-sm text-yellow-700">{warning}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs for Different Views */}
      <Tabs defaultValue="scores" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="scores">Detailed Scores</TabsTrigger>
          <TabsTrigger value="metrics">Speech Metrics</TabsTrigger>
          <TabsTrigger value="transcripts">Transcripts</TabsTrigger>
        </TabsList>
        
        {/* Detailed Scores Tab */}
        <TabsContent value="scores" className="space-y-4 mt-4">
          <CriterionCard
            title="Fluency & Coherence"
            score={fluencyCoherence.score}
            confidence={fluencyCoherence.confidence}
            feedback={fluencyCoherence.feedback}
            strengths={fluencyCoherence.strengths || []}
            improvements={fluencyCoherence.improvements || []}
            icon={<div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">🗣️</div>}
          />
          
          <CriterionCard
            title="Lexical Resource"
            score={lexicalResource.score}
            confidence={lexicalResource.confidence}
            feedback={lexicalResource.feedback}
            strengths={lexicalResource.strengths || []}
            improvements={lexicalResource.improvements || []}
            icon={<div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">📚</div>}
          />
          
          <CriterionCard
            title="Grammatical Range & Accuracy"
            score={grammaticalRange.score}
            confidence={grammaticalRange.confidence}
            feedback={grammaticalRange.feedback}
            strengths={grammaticalRange.strengths || []}
            improvements={grammaticalRange.improvements || []}
            icon={<div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">✏️</div>}
          />
          
          <CriterionCard
            title="Pronunciation"
            score={pronunciation.score}
            confidence={pronunciation.confidence}
            feedback={pronunciation.feedback}
            strengths={pronunciation.strengths || []}
            improvements={pronunciation.improvements || []}
            icon={<div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">🎙️</div>}
          />
          
          {/* Pronunciation Disclaimer */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="flex items-start gap-3 py-4">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-700">
                <strong>About Pronunciation Scoring:</strong> This score is based on <em>clarity</em> and 
                <em> intelligibility</em> only. Regional accents are <strong>never penalized</strong>. 
                IELTS values clear communication over any particular accent.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Speech Metrics Tab */}
        <TabsContent value="metrics" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="w-5 h-5" />
                Speech Analysis Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-indigo-600">
                    {fluencyMetrics?.wordsPerMinute || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Words/Minute</div>
                </div>
                
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600 capitalize">
                    {fluencyMetrics?.speechRate || 'N/A'}
                  </div>
                  <div className="text-sm text-muted-foreground">Speech Rate</div>
                </div>
                
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {fluencyMetrics?.fillerCount || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Filler Words</div>
                </div>
                
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {Math.round((evaluation.totalSpeakingTime || 0))}s
                  </div>
                  <div className="text-sm text-muted-foreground">Total Time</div>
                </div>
              </div>
              
              {fluencyMetrics?.fillerWords && fluencyMetrics.fillerWords.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Detected Filler Words</h4>
                  <div className="flex flex-wrap gap-2">
                    {fluencyMetrics.fillerWords.map((word, i) => (
                      <Badge key={i} variant="secondary">{word}</Badge>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Tip: Reducing filler words can improve your fluency score. Try pausing briefly 
                    instead of using fillers.
                  </p>
                </div>
              )}
              
              {evaluation.vocabularyAnalysis && (
                <div>
                  <h4 className="font-semibold mb-2">Vocabulary Overview</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-xl font-bold text-indigo-600">
                        {evaluation.vocabularyAnalysis.uniqueWords || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Unique Words</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-xl font-bold text-purple-600">
                        {evaluation.vocabularyAnalysis.advancedVocabularyCount || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Advanced Words</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Transcripts Tab */}
        <TabsContent value="transcripts" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Part 1: Introduction & Interview</CardTitle>
              <CardDescription>Questions about familiar topics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 rounded-lg p-4 text-sm whitespace-pre-wrap">
                {transcripts?.part1 || 'No transcript available'}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Part 2: Long Turn</CardTitle>
              <CardDescription>Individual presentation on a topic</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 rounded-lg p-4 text-sm whitespace-pre-wrap">
                {transcripts?.part2 || 'No transcript available'}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Part 3: Discussion</CardTitle>
              <CardDescription>Abstract and complex topics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 rounded-lg p-4 text-sm whitespace-pre-wrap">
                {transcripts?.part3 || 'No transcript available'}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Disclaimer */}
      <Card className="border-gray-200 bg-gray-50">
        <CardContent className="py-4">
          <p className="text-xs text-muted-foreground text-center">
            {disclaimer}
          </p>
        </CardContent>
      </Card>

      {/* Actions */}
      {onRetake && (
        <div className="flex justify-center pt-4">
          <Button onClick={onRetake} size="lg">
            Take Another Test
          </Button>
        </div>
      )}
    </div>
  );
};

export default SpeakingEvaluationResult;
