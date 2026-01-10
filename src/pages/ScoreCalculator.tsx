import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartLine } from "lucide-react";

// Band score conversion tables
const listeningScoreTable = [
  { raw: "39-40", band: 9.0 }, { raw: "37-38", band: 8.5 }, { raw: "35-36", band: 8.0 },
  { raw: "33-34", band: 7.5 }, { raw: "30-32", band: 7.0 }, { raw: "27-29", band: 6.5 },
  { raw: "23-26", band: 6.0 }, { raw: "20-22", band: 5.5 }, { raw: "16-19", band: 5.0 },
  { raw: "13-15", band: 4.5 }, { raw: "10-12", band: 4.0 }, { raw: "6-9", band: 3.5 },
  { raw: "4-5", band: 3.0 }, { raw: "2-3", band: 2.5 }, { raw: "1", band: 2.0 }, { raw: "0", band: 0 },
];

const readingScoreTable = [
  { raw: "39-40", band: 9.0 }, { raw: "37-38", band: 8.5 }, { raw: "35-36", band: 8.0 },
  { raw: "33-34", band: 7.5 }, { raw: "30-32", band: 7.0 }, { raw: "27-29", band: 6.5 },
  { raw: "23-26", band: 6.0 }, { raw: "20-22", band: 5.5 }, { raw: "16-19", band: 5.0 },
  { raw: "13-15", band: 4.5 }, { raw: "10-12", band: 4.0 }, { raw: "6-9", band: 3.5 },
  { raw: "4-5", band: 3.0 }, { raw: "2-3", band: 2.5 }, { raw: "1", band: 2.0 }, { raw: "0", band: 0 },
];

const overallBandDescriptions = [
  { 
    band: 9, 
    level: "Expert User", 
    description: "Has complete command in the English language; accurate, highly flexible, appropriate, fluent with full understanding." 
  },
  { 
    band: 8, 
    level: "Very Good User", 
    description: "Has complete command with only rare errors (which are unsystematic) or inappropriate words. Deals with complex situations well, but with rare errors, and can deal with detailed argument." 
  },
  { 
    band: 7, 
    level: "Good User", 
    description: "Has good command of English but also has occasional inaccuracies, misunderstandings or inappropriate words. Can use complex language quite well and understands detailed argument quite well." 
  },
  { 
    band: 6, 
    level: "Competent User", 
    description: "Has effective command of English but also some errors, inappropriate words and misunderstandings. Can use complex language quite well, but best in familiar situations." 
  },
  { 
    band: 5, 
    level: "Modest User", 
    description: "Has partial command of English and can deal with overall meaning. Makes frequent errors. Has better English in common situations. Does not deal with complex language well." 
  },
  { 
    band: 4, 
    level: "Limited User", 
    description: "Basic competence is limited to familiar situations. Has frequent problems in understanding and expression. Is not able to use complex language." 
  },
  { 
    band: 3, 
    level: "Extremely Limited User", 
    description: "Conveys and understands only general meaning in very familiar situations. Frequent breakdowns in communication occur." 
  },
];

const bandScoreOptions = ["9.0", "8.5", "8.0", "7.5", "7.0", "6.5", "6.0", "5.5", "5.0", "4.5", "4.0", "3.5", "3.0"];

const getBandFromRaw = (rawScore: number, table: typeof listeningScoreTable): number | null => {
  for (const entry of table) {
    if (entry.raw.includes("-")) {
      const [min, max] = entry.raw.split("-").map(Number);
      if (rawScore >= min && rawScore <= max) return entry.band;
    } else {
      if (rawScore === Number(entry.raw)) return entry.band;
    }
  }
  return null;
};

const ScoreCalculator = () => {
  const [isListening, setIsListening] = useState(true);
  const [rawScore, setRawScore] = useState("");
  const [calculatedBand, setCalculatedBand] = useState<number | null>(null);
  
  const [overallScores, setOverallScores] = useState({
    listening: "",
    reading: "",
    writing: "",
    speaking: "",
  });
  const [overallBand, setOverallBand] = useState<number | null>(null);

  const calculateBand = () => {
    const raw = parseInt(rawScore);
    if (isNaN(raw) || raw < 0 || raw > 40) {
      setCalculatedBand(null);
      return;
    }
    const table = isListening ? listeningScoreTable : readingScoreTable;
    setCalculatedBand(getBandFromRaw(raw, table));
  };

  const resetBand = () => { 
    setRawScore(""); 
    setCalculatedBand(null); 
  };

  const calculateOverall = () => {
    const scores = [
      parseFloat(overallScores.listening),
      parseFloat(overallScores.reading),
      parseFloat(overallScores.writing),
      parseFloat(overallScores.speaking),
    ].filter((s) => !isNaN(s));
    
    if (scores.length === 0) {
      setOverallBand(null);
      return;
    }
    
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const rounded = Math.round(avg * 2) / 2;
    setOverallBand(rounded);
  };

  const resetOverall = () => { 
    setOverallScores({ listening: "", reading: "", writing: "", speaking: "" }); 
    setOverallBand(null); 
  };

  const currentTable = isListening ? listeningScoreTable : readingScoreTable;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-12">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">IELTS Score Calculator</h1>
            <p className="text-muted-foreground">
              Calculate your band scores and view conversion charts
            </p>
          </div>

          {/* Calculators Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Listening/Reading Calculator */}
            <Card className="border-2 border-primary">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-center font-bold flex-1">
                    {isListening ? "LISTENING" : "READING"} SCORE CALCULATOR
                  </CardTitle>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                        <ChartLine className="h-5 w-5" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>{isListening ? "Listening" : "Reading"} Band Score Conversion</DialogTitle>
                      </DialogHeader>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Raw Score (out of 40)</TableHead>
                            <TableHead>Band Score</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {currentTable.map((row, i) => (
                            <TableRow key={i}>
                              <TableCell>{row.raw}</TableCell>
                              <TableCell className="font-bold">{row.band}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </DialogContent>
                  </Dialog>
                </div>
                {/* Toggle Switch */}
                <div className="flex items-center justify-center gap-3 mt-4 p-3 bg-secondary rounded-lg">
                  <span className={`text-sm font-medium transition-colors ${isListening ? 'text-primary' : 'text-muted-foreground'}`}>
                    Listening
                  </span>
                  <Switch
                    checked={!isListening}
                    onCheckedChange={(checked) => {
                      setIsListening(!checked);
                      resetBand();
                    }}
                    className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-primary"
                  />
                  <span className={`text-sm font-medium transition-colors ${!isListening ? 'text-primary' : 'text-muted-foreground'}`}>
                    Reading
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-sm font-medium min-w-20">{isListening ? "Listening" : "Reading"}</span>
                  <Input
                    type="number"
                    min={0}
                    max={40}
                    value={rawScore}
                    onChange={(e) => setRawScore(e.target.value)}
                    className="flex-1"
                    placeholder="Enter score"
                  />
                  <span className="text-sm text-muted-foreground">of 40</span>
                </div>
                <div className="flex gap-2">
                  <Button onClick={calculateBand} className="bg-primary hover:bg-primary/90">
                    Calculate
                  </Button>
                  <Button onClick={resetBand} variant="secondary">
                    Reset
                  </Button>
                </div>
                {calculatedBand !== null && (
                  <div className="mt-4 p-3 bg-primary/10 rounded-lg text-center">
                    <span className="text-lg font-bold text-primary">Band Score: {calculatedBand}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Overall Band Calculator */}
            <Card className="border-2 border-primary">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-center font-bold flex-1">OVERALL BAND SCORE CALCULATOR</CardTitle>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                        <ChartLine className="h-5 w-5" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>IELTS Band Score Descriptors</DialogTitle>
                      </DialogHeader>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-20">Band Score</TableHead>
                            <TableHead className="w-32">English Level</TableHead>
                            <TableHead>Description</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {overallBandDescriptions.map((row) => (
                            <TableRow key={row.band}>
                              <TableCell className="font-bold text-center">{row.band}</TableCell>
                              <TableCell className="font-medium">{row.level}</TableCell>
                              <TableCell className="text-sm">{row.description}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(["listening", "reading", "writing", "speaking"] as const).map((skill) => (
                    <div key={skill} className="flex items-center gap-4">
                      <span className="text-sm font-medium min-w-32 capitalize">{skill} Band Score</span>
                      <Select
                        value={overallScores[skill]}
                        onValueChange={(val) => setOverallScores({ ...overallScores, [skill]: val })}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {bandScoreOptions.map((score) => (
                            <SelectItem key={score} value={score}>{score}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button onClick={calculateOverall} className="bg-primary hover:bg-primary/90">
                    Calculate
                  </Button>
                  <Button onClick={resetOverall} variant="secondary">
                    Reset
                  </Button>
                </div>
                {overallBand !== null && (
                  <div className="mt-4 p-3 bg-primary/10 rounded-lg text-center">
                    <span className="text-lg font-bold text-primary">Overall Band: {overallBand}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ScoreCalculator;
