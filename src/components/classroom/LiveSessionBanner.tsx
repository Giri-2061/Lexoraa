import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Pause, 
  Square, 
  Users, 
  Radio,
  Volume2,
  SkipForward,
  Headphones,
  BookOpen,
  PenTool,
  Mic
} from 'lucide-react';
import { toast } from 'sonner';
import { LiveSession, LiveSessionParticipant } from '@/hooks/useLiveSession';

interface LiveSessionBannerProps {
  session: LiveSession;
  participants: LiveSessionParticipant[];
  isTeacher: boolean;
  onEndSession: () => Promise<{ error: Error | null }>;
  onJoinSession: () => Promise<{ error: Error | null }>;
  onLeaveSession: () => Promise<{ error: Error | null }>;
  onUpdateAudioState: (state: LiveSession['audio_state']) => Promise<{ error: Error | null }>;
  onUpdateSection: (section: number) => Promise<{ error: Error | null }>;
}

const SECTION_AUDIO_MAP: Record<string, Record<string, Record<string, string[]>>> = {
  listening: {
    book13: {
      test1: [
        '/questions/audio/book13 audios/IELTS13-Tests1-4CD1Track_01.mp3',
        '/questions/audio/book13 audios/IELTS13-Tests1-4CD1Track_02.mp3',
        '/questions/audio/book13 audios/Cam13-Test1-Section3.mp3',
        '/questions/audio/book13 audios/IELTS13-Tests1-4CD1Track_04.mp3',
      ]
    },
    book14: {
      test1: [
        '/questions/audio/book14 audios/C14T1S1.mp3',
        '/questions/audio/book14 audios/C14T1S2.mp3',
        '/questions/audio/book14 audios/C14T1S3.mp3',
        '/questions/audio/book14 audios/C14T1S4.mp3',
      ],
      test2: [
        '/questions/audio/book14 audios/C14T2S1.mp3',
        '/questions/audio/book14 audios/C14T2S2.mp3',
        '/questions/audio/book14 audios/C14T2S3.mp3',
        '/questions/audio/book14 audios/C14T2S4.mp3',
      ],
    },
    // Add more mappings as needed
  }
};

export default function LiveSessionBanner({
  session,
  participants,
  isTeacher,
  onEndSession,
  onJoinSession,
  onLeaveSession,
  onUpdateAudioState,
  onUpdateSection
}: LiveSessionBannerProps) {
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [localPlaying, setLocalPlaying] = useState(false);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const testTypeIcon = {
    listening: Headphones,
    reading: BookOpen,
    writing: PenTool,
    speaking: Mic
  }[session.test_type] || Headphones;

  const Icon = testTypeIcon;

  // Get audio URL for current section
  const getAudioUrl = () => {
    const bookAudios = SECTION_AUDIO_MAP[session.test_type]?.[session.book_id]?.[session.test_id];
    if (bookAudios && bookAudios[session.current_section - 1]) {
      return bookAudios[session.current_section - 1];
    }
    // Fallback pattern
    return `/questions/audio/${session.book_id} audios/${session.book_id}-${session.test_id}-part${session.current_section}.mp3`;
  };

  // Sync audio state for students
  useEffect(() => {
    if (isTeacher || !isJoined || !audioRef.current) return;

    // Sync playback state
    if (session.audio_state.playing && audioRef.current.paused) {
      audioRef.current.currentTime = session.audio_state.currentTime;
      audioRef.current.play().catch(console.error);
      setLocalPlaying(true);
    } else if (!session.audio_state.playing && !audioRef.current.paused) {
      audioRef.current.pause();
      setLocalPlaying(false);
    }

    // Sync time if drifted more than 2 seconds
    const drift = Math.abs(audioRef.current.currentTime - session.audio_state.currentTime);
    if (drift > 2 && session.audio_state.playing) {
      audioRef.current.currentTime = session.audio_state.currentTime;
    }
  }, [session.audio_state, isTeacher, isJoined]);

  // Teacher: periodically update audio state
  useEffect(() => {
    if (!isTeacher || !audioRef.current) return;

    if (localPlaying) {
      syncIntervalRef.current = setInterval(() => {
        if (audioRef.current) {
          onUpdateAudioState({
            playing: !audioRef.current.paused,
            currentTime: audioRef.current.currentTime,
            sectionAudioUrl: getAudioUrl()
          });
        }
      }, 1000);
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [isTeacher, localPlaying, onUpdateAudioState]);

  const handlePlayPause = async () => {
    if (!audioRef.current) return;

    if (audioRef.current.paused) {
      await audioRef.current.play();
      setLocalPlaying(true);
      onUpdateAudioState({
        playing: true,
        currentTime: audioRef.current.currentTime,
        sectionAudioUrl: getAudioUrl()
      });
    } else {
      audioRef.current.pause();
      setLocalPlaying(false);
      onUpdateAudioState({
        playing: false,
        currentTime: audioRef.current.currentTime,
        sectionAudioUrl: getAudioUrl()
      });
    }
  };

  const handleNextSection = async () => {
    if (session.current_section < 4) {
      await onUpdateSection(session.current_section + 1);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setLocalPlaying(false);
      }
      onUpdateAudioState({ playing: false, currentTime: 0 });
    }
  };

  const handleEndSession = async () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const { error } = await onEndSession();
    if (error) {
      toast.error('Failed to end session');
    } else {
      toast.success('Live class ended');
    }
  };

  const handleJoin = async () => {
    const { error } = await onJoinSession();
    if (error) {
      toast.error('Failed to join session');
    } else {
      setIsJoined(true);
      toast.success('Joined live class!');
    }
  };

  const handleLeave = async () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const { error } = await onLeaveSession();
    if (error) {
      toast.error('Failed to leave session');
    } else {
      setIsJoined(false);
      toast.success('Left live class');
    }
  };

  return (
    <Card className="border-green-500 bg-green-500/10 mb-6">
      <CardContent className="py-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-green-500 animate-pulse" />
              <span className="font-semibold text-green-600">LIVE</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5 text-primary" />
              <span className="font-medium capitalize">{session.test_type}</span>
              <Badge variant="secondary">
                {session.book_id.replace('book', 'Book ')} - {session.test_id.replace('test', 'Test ')}
              </Badge>
              {session.test_type === 'listening' && (
                <Badge variant="outline">Section {session.current_section}</Badge>
              )}
            </div>

            <div className="flex items-center gap-1 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="text-sm">{participants.length} joined</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isTeacher ? (
              <>
                {session.test_type === 'listening' && (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-1"
                      onClick={handlePlayPause}
                    >
                      {localPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      {localPlaying ? 'Pause' : 'Play'}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-1"
                      onClick={handleNextSection}
                      disabled={session.current_section >= 4}
                    >
                      <SkipForward className="h-4 w-4" />
                      Next Section
                    </Button>
                  </>
                )}
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="gap-1"
                  onClick={handleEndSession}
                >
                  <Square className="h-4 w-4" />
                  End Class
                </Button>
              </>
            ) : (
              <>
                {!isJoined ? (
                  <Button 
                    size="sm" 
                    className="gap-1 bg-green-600 hover:bg-green-700"
                    onClick={handleJoin}
                  >
                    <Play className="h-4 w-4" />
                    Join Class
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-1"
                    onClick={handleLeave}
                  >
                    Leave Class
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Audio player (hidden for students when syncing) */}
        {session.test_type === 'listening' && (isTeacher || isJoined) && (
          <div className="mt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Volume2 className="h-4 w-4" />
              <span>Section {session.current_section} Audio</span>
            </div>
            <audio 
              ref={audioRef}
              src={getAudioUrl()}
              className={isTeacher ? "w-full" : "hidden"}
              controls={isTeacher}
              onEnded={() => setLocalPlaying(false)}
            />
            {!isTeacher && isJoined && (
              <div className="bg-muted rounded-lg p-3 flex items-center gap-3">
                <div className={`h-3 w-3 rounded-full ${localPlaying ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground'}`} />
                <span className="text-sm">
                  {localPlaying ? 'Audio playing...' : 'Waiting for teacher to play audio'}
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
