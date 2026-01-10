import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Clock } from "lucide-react";
import { ReactNode } from "react";

type Props = {
  title: string;
  session: ReturnType<typeof import('..//hooks/useTestSession').useTestSession>;
  recordingIndicator?: ReactNode;
};

export default function TestHeader({ title, session, recordingIndicator }: Props) {
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground shadow-lg">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Button onClick={session.openExit} variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Exit Test
              </Button>
              <h1 className="text-lg font-semibold break-words">{title}</h1>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              {recordingIndicator}
              {!session.started ? (
                <Button onClick={() => session.setStarted(true)} className="bg-primary">Begin Test</Button>
              ) : (
                <span className="px-3 py-1 rounded bg-muted text-sm text-muted-foreground">Test running</span>
              )}
              <div className="flex items-center gap-3 bg-primary-foreground/10 px-3 py-2 rounded-lg ml-0 sm:ml-3">
                <Clock className="w-5 h-5" />
                <span className="text-lg font-mono font-semibold">{formatTime(session.timeLeft)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {session.showConfirmExit && (
        <div className="fixed inset-0 z-60 flex items-start justify-center pt-20">
          <div className="absolute inset-0 bg-black/40 z-40" onClick={session.closeExit} />
          <div className="relative z-50 w-[92%] max-w-md pointer-events-auto">
            <Card className="p-4">
              <h3 className="font-semibold">Exit Test?</h3>
              <p className="text-sm text-muted-foreground mt-2">Exiting will end your attempt{session.started ? ' and clear any progress' : ''}. Do you want to exit?</p>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={session.closeExit}>Continue Test</Button>
                {session.started && (
                  <Button className="bg-red-600" onClick={session.confirmExit}>Exit and Lose Progress</Button>
                )}
                {!session.started && (
                  <Button className="bg-red-600" onClick={session.confirmExit}>Exit</Button>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
