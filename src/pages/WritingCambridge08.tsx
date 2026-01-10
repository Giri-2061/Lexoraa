import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, Lock, Unlock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const WritingCambridge08 = () => {
  const navigate = useNavigate();
  const [selectedBook, setSelectedBook] = useState<number | null>(null);

  const books = [13, 14, 15, 16, 17, 18, 19];
  const tests = [1, 2, 3, 4];
  const LOCKED_RANGE = new Set([16, 17, 18, 19]);

  const [unlockedBooks, setUnlockedBooks] = useState<number[]>(() => {
    try {
      const stored = localStorage.getItem("writingUnlockedBooks");
      return stored ? JSON.parse(stored) : Array.from(LOCKED_RANGE);
    } catch {
      return Array.from(LOCKED_RANGE);
    }
  });

  const [lockedTests, setLockedTests] = useState<Record<string, number[]>>(() => {
    try {
      const stored = localStorage.getItem("writingLockedTestsV2");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("writingUnlockedBooks", JSON.stringify(unlockedBooks));
    } catch {}
  }, [unlockedBooks]);

  useEffect(() => {
    try {
      localStorage.setItem("writingLockedTestsV2", JSON.stringify(lockedTests));
    } catch {}
  }, [lockedTests]);

  const isBookLocked = (book: number) => LOCKED_RANGE.has(book) && !unlockedBooks.includes(book);

  const toggleLock = (book: number) => {
    setUnlockedBooks((prev) => {
      if (prev.includes(book)) return prev.filter((b) => b !== book);
      return [...prev, book];
    });
  };

  const isTestLocked = (book: number, test: number) => {
    const locked = lockedTests[String(book)];
    return Array.isArray(locked) && locked.includes(test);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-3 text-foreground">IELTS MOCK TESTS</h1>
            <p className="text-lg text-muted-foreground">Writing Tests - Official Cambridge Materials</p>
          </div>

          <div className="space-y-4">
            {books.map((book) => {
              const expanded = selectedBook === book;
              const locked = isBookLocked(book);
              return (
                <div key={book}>
                  <Card
                    className={cn(
                      "transition-all hover:shadow-lg",
                      expanded && "ring-2 ring-primary",
                      locked ? "opacity-60" : "cursor-pointer",
                      !locked && "hover:shadow-lg"
                    )}
                    onClick={() => {
                      if (!locked) {
                        setSelectedBook(expanded ? null : book);
                      }
                    }}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span>Book {book}</span>
                          {locked && <span className="text-xs text-muted-foreground">(Locked)</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            aria-label={locked ? "Unlock book" : "Lock book"}
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleLock(book);
                            }}
                            className="inline-flex items-center p-1 rounded hover:bg-muted"
                          >
                            {locked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                          </button>
                          <ChevronRight className={cn("transition-transform", expanded && "rotate-90")} />
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <p>4 tests • 2 tasks each</p>
                        <p>Academic Writing • 60 minutes</p>
                      </div>
                    </CardContent>
                  </Card>

                  {expanded && (
                    <div className="mt-4 p-6 border rounded-lg bg-card">
                      <h3 className="font-semibold mb-4">Tests in Book {book}</h3>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {tests.map((test) => {
                          const testLocked = locked || isTestLocked(book, test);
                          return (
                            <div key={test} className={cn("p-4 border rounded", testLocked && "opacity-50") }>
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <div className="font-semibold">Test {test}</div>
                                  <div className="text-sm text-muted-foreground">2 tasks • 60 minutes</div>
                                </div>
                                <div>
                                  <Button
                                    onClick={() => {
                                      if (!testLocked) {
                                        navigate(`/test/writing/book${book}-test${test}`);
                                      }
                                    }}
                                    size="sm"
                                    disabled={testLocked}
                                  >
                                    {testLocked ? "Locked" : "Begin"}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-12 p-6 bg-muted/50 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">About Cambridge IELTS Writing Tests</h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>These writing tests are from the official Cambridge IELTS practice materials. Each test contains two writing tasks that assess your ability to write academic English.</p>
              <p><strong>Assessment Criteria:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Task Achievement/Response:</strong> How well you answer the question</li>
                <li><strong>Coherence and Cohesion:</strong> How well organized your writing is</li>
                <li><strong>Lexical Resource:</strong> Range and accuracy of vocabulary</li>
                <li><strong>Grammatical Range and Accuracy:</strong> Variety and correctness of grammar</li>
              </ul>
              <p className="mt-4"><strong>Tips:</strong> Spend about 20 minutes on Task 1 and 40 minutes on Task 2. Make sure you write at least the minimum number of words for each task.</p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default WritingCambridge08;
