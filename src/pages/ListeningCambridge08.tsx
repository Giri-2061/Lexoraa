import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { Lock, Unlock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const ListeningCambridge08 = () => {
  const navigate = useNavigate();
  const [selectedTest, setSelectedTest] = useState<number | null>(null);

  const books = [13,14,15,16,17,18,19];
  const tests = [1,2,3,4];
  // Books 16-19 are locked by default until unlocked via the UI
  const LOCKED_RANGE = new Set([16,17,18,19]);

  const [unlockedBooks, setUnlockedBooks] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem("unlockedBooks");
      // If the user hasn't set unlockedBooks yet, default to unlocking the locked range
      return raw ? JSON.parse(raw) : Array.from(LOCKED_RANGE);
    } catch {
      return Array.from(LOCKED_RANGE);
    }
  });

  // Per-test locks persisted in localStorage. Default: no tests locked.
  const [lockedTests, setLockedTests] = useState<Record<string, number[]>>(() => {
    try {
      const raw = localStorage.getItem("lockedTests");
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, number[]>;
        // Migration: Remove Book 13 Test 1 from locks if it exists
        if (parsed["13"] && Array.isArray(parsed["13"])) {
          parsed["13"] = parsed["13"].filter((t: number) => t !== 1);
          if (parsed["13"].length === 0) {
            delete parsed["13"];
          }
        }
        return parsed;
      }
      return {};
    } catch {
      return {};
    }
  });

  // Persist lockedTests
  useEffect(() => {
    try {
      localStorage.setItem("lockedTests", JSON.stringify(lockedTests));
    } catch {}
  }, [lockedTests]);

  useEffect(() => {
    try {
      localStorage.setItem("unlockedBooks", JSON.stringify(unlockedBooks));
    } catch {}
  }, [unlockedBooks]);

  const isBookLocked = (book: number) => LOCKED_RANGE.has(book) && !unlockedBooks.includes(book);

  const toggleLock = (book: number) => {
    setUnlockedBooks((prev) => {
      if (prev.includes(book)) return prev.filter((b) => b !== book);
      return [...prev, book];
    });
  };

  const isTestLocked = (book: number, t: number) => {
    const arr = lockedTests[String(book)];
    return Array.isArray(arr) && arr.includes(t);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-3 text-foreground">IELTS MOCK TESTS</h1>
            <p className="text-lg text-muted-foreground">Listening Tests - Official Cambridge Materials</p>
          </div>

          <div className="space-y-4">
            {books.map((book) => {
              const isOpen = selectedTest === book;
              const locked = isBookLocked(book);
              return (
                <div key={book}>
                  <Card
                    className={cn(
                      "transition-all hover:shadow-lg",
                      isOpen && "ring-2 ring-primary",
                      locked ? "opacity-60" : "cursor-pointer",
                      !locked && "hover:shadow-lg"
                    )}
                    onClick={() => {
                      if (!locked) setSelectedTest(isOpen ? null : book);
                    }}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span>Book {book}</span>
                          {locked && (
                            <span className="text-xs text-muted-foreground">(Locked)</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            aria-label={locked ? "Unlock book" : "Lock book"}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLock(book);
                            }}
                            className="inline-flex items-center p-1 rounded hover:bg-muted"
                          >
                            {locked ? (
                              <Unlock className="w-4 h-4" />
                            ) : (
                              <Lock className="w-4 h-4" />
                            )}
                          </button>
                          <ChevronRight
                            className={cn(
                              "transition-transform",
                              isOpen && "rotate-90"
                            )}
                          />
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <p>4 tests • 4 sections each • 40 questions</p>
                      </div>
                    </CardContent>
                  </Card>

                  {isOpen && (
                    <div className="mt-4 p-6 border rounded-lg bg-card">
                      <h3 className="font-semibold mb-4">Tests in Book {book}</h3>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {tests.map((t) => {
                          const testLocked = locked || isTestLocked(book, t);
                          return (
                            <div key={t} className={cn("p-4 border rounded", testLocked && "opacity-50") }>
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <div className="font-semibold">Test {t}</div>
                                  <div className="text-sm text-muted-foreground">4 sections • 40 questions</div>
                                </div>
                                <div>
                                  <Button
                                    onClick={() => {
                                      if (!testLocked) navigate(`/test/listening/book${book}-test${t}`);
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
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ListeningCambridge08;
