import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const SpeakingCambridge08 = () => {
  const navigate = useNavigate();
  const [selectedTest, setSelectedTest] = useState<number | null>(null);

  const tests = [
    {
      id: 1,
      title: "Test 1",
      parts: "3 parts",
      duration: "11-14 minutes",
      topics: "Personal, Cue Card, Discussion"
    },
    {
      id: 2,
      title: "Test 2",
      parts: "3 parts",
      duration: "11-14 minutes",
      topics: "Personal, Cue Card, Discussion"
    },
    {
      id: 3,
      title: "Test 3",
      parts: "3 parts",
      duration: "11-14 minutes",
      topics: "Personal, Cue Card, Discussion"
    },
    {
      id: 4,
      title: "Test 4",
      parts: "3 parts",
      duration: "11-14 minutes",
      topics: "Personal, Cue Card, Discussion"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-3 text-foreground">Cambridge IELTS 08</h1>
            <p className="text-lg text-muted-foreground">Speaking Tests - Official Cambridge Materials</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {tests.map((test) => {
              const isSelected = selectedTest === test.id;
              return (
                <div key={test.id}>
                  <Card
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-lg",
                      isSelected && "ring-2 ring-primary"
                    )}
                    onClick={() => setSelectedTest(isSelected ? null : test.id)}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{test.title}</span>
                        <ChevronRight
                          className={cn(
                            "transition-transform",
                            isSelected && "rotate-90"
                          )}
                        />
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <p>🎤 {test.parts}</p>
                        <p>💬 {test.topics}</p>
                        <p>⏱️ {test.duration}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {isSelected && (
                    <div className="mt-4 p-6 border rounded-lg bg-card">
                      <h3 className="font-semibold mb-4">Test Format</h3>
                      <div className="space-y-3 text-sm text-muted-foreground mb-6">
                        <p>• <strong>Part 1 (4-5 minutes):</strong> Introduction and interview on familiar topics such as home, family, work, studies, and interests</p>
                        <p>• <strong>Part 2 (3-4 minutes):</strong> Individual long turn. You'll receive a task card with a topic and have 1 minute to prepare, then speak for 1-2 minutes</p>
                        <p>• <strong>Part 3 (4-5 minutes):</strong> Two-way discussion. The examiner will ask further questions related to the topic in Part 2</p>
                      </div>
                      <div className="bg-muted/50 p-4 rounded mb-6">
                        <p className="text-sm"><strong>Note:</strong> The speaking test is a face-to-face conversation with an examiner. It is recorded for assessment purposes.</p>
                      </div>
                      <Button
                        className="w-full"
                        onClick={() => navigate(`/test/speaking/cambridge-08-test-${test.id}`)}
                      >
                        Start {test.title}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-12 p-6 bg-muted/50 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">About Cambridge IELTS 08 Speaking Tests</h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>These speaking tests are from the official Cambridge IELTS 08 practice materials. Each test simulates the real IELTS speaking exam format.</p>
              <p><strong>Assessment Criteria:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Fluency and Coherence:</strong> How smoothly and logically you speak</li>
                <li><strong>Lexical Resource:</strong> Range and accuracy of vocabulary</li>
                <li><strong>Grammatical Range and Accuracy:</strong> Variety and correctness of grammar</li>
                <li><strong>Pronunciation:</strong> How clear and understandable your speech is</li>
              </ul>
              <p className="mt-4"><strong>Tips:</strong> Speak naturally, extend your answers with examples and reasons, and don't worry about having a perfect accent - clarity is more important.</p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SpeakingCambridge08;
