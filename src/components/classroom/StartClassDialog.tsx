import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  BookOpen, 
  Headphones, 
  PenTool, 
  Mic, 
  ArrowLeft,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

interface StartClassDialogProps {
  onStartClass: (testType: string, bookId: string, testId: string) => Promise<{ error?: Error | null }>;
}

type Step = 'section' | 'book' | 'test';

const SECTIONS = [
  { id: 'listening', name: 'Listening', icon: Headphones, color: 'text-blue-500' },
  { id: 'reading', name: 'Reading', icon: BookOpen, color: 'text-green-500' },
  { id: 'writing', name: 'Writing', icon: PenTool, color: 'text-orange-500' },
  { id: 'speaking', name: 'Speaking', icon: Mic, color: 'text-purple-500' },
];

const BOOKS = Array.from({ length: 7 }, (_, i) => ({
  id: `book${13 + i}`,
  name: `Cambridge ${13 + i}`,
  number: 13 + i
}));

const TESTS = [
  { id: 'test1', name: 'Test 1' },
  { id: 'test2', name: 'Test 2' },
  { id: 'test3', name: 'Test 3' },
  { id: 'test4', name: 'Test 4' },
];

export default function StartClassDialog({ onStartClass }: StartClassDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('section');
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const resetState = () => {
    setStep('section');
    setSelectedSection(null);
    setSelectedBook(null);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      resetState();
    }
  };

  const handleSelectSection = (sectionId: string) => {
    setSelectedSection(sectionId);
    setStep('book');
  };

  const handleSelectBook = (bookId: string) => {
    setSelectedBook(bookId);
    setStep('test');
  };

  const handleSelectTest = async (testId: string) => {
    if (!selectedSection || !selectedBook) return;
    
    setStarting(true);
    const { error } = await onStartClass(selectedSection, selectedBook, testId);
    setStarting(false);

    if (error) {
      toast.error('Failed to start class');
    } else {
      toast.success('Live class started!');
      setOpen(false);
      resetState();
    }
  };

  const handleBack = () => {
    if (step === 'test') {
      setStep('book');
      setSelectedBook(null);
    } else if (step === 'book') {
      setStep('section');
      setSelectedSection(null);
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 'section':
        return 'Select Section';
      case 'book':
        return 'Select Book';
      case 'test':
        return 'Select Test';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-green-600 hover:bg-green-700">
          <Play className="h-4 w-4" />
          Start Live Class
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {step !== 'section' && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <DialogTitle>{getStepTitle()}</DialogTitle>
          </div>
          {selectedSection && (
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="capitalize">{selectedSection}</Badge>
              {selectedBook && (
                <>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="secondary">{selectedBook.replace('book', 'Book ')}</Badge>
                </>
              )}
            </div>
          )}
        </DialogHeader>

        <div className="pt-4">
          {step === 'section' && (
            <div className="grid grid-cols-2 gap-3">
              {SECTIONS.map((section) => {
                const Icon = section.icon;
                return (
                  <Card 
                    key={section.id}
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => handleSelectSection(section.id)}
                  >
                    <CardContent className="flex flex-col items-center justify-center py-6">
                      <Icon className={`h-10 w-10 ${section.color} mb-2`} />
                      <span className="font-medium">{section.name}</span>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {step === 'book' && (
            <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto">
              {BOOKS.map((book) => (
                <Card 
                  key={book.id}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => handleSelectBook(book.id)}
                >
                  <CardContent className="flex flex-col items-center justify-center py-6">
                    <BookOpen className="h-8 w-8 text-primary mb-2" />
                    <span className="font-medium">{book.name}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {step === 'test' && (
            <div className="grid grid-cols-2 gap-3">
              {TESTS.map((test) => (
                <Card 
                  key={test.id}
                  className={`cursor-pointer hover:border-primary transition-colors ${starting ? 'pointer-events-none opacity-50' : ''}`}
                  onClick={() => handleSelectTest(test.id)}
                >
                  <CardContent className="flex flex-col items-center justify-center py-6">
                    <Play className="h-8 w-8 text-green-500 mb-2" />
                    <span className="font-medium">{test.name}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
