export interface StudentProgressTestResult {
  id: string;
  test_id: string;
  test_type: string;
  band_score: number | null;
  created_at: string;
}

export interface StudentProgressChartPoint {
  date: string;
  bandScore: number;
  testType: string;
  label: string;
}

export interface StudentProgressSummary {
  totalTests: number;
  averageBand: number;
  highestBand: number;
  lowestBand: number;
  bandChange: number;
  currentStreakDays: number;
  testsByType: Record<string, number>;
  chartPoints: StudentProgressChartPoint[];
  latestTestAt: string | null;
}

export interface StudentProgressSnapshot {
  displayName: string | null;
  generatedAt: string;
  summary: StudentProgressSummary;
  recentResults: StudentProgressTestResult[];
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function getUtcDayKey(value: string): string {
  return new Date(value).toISOString().slice(0, 10);
}

function formatLabel(testType: string, testId: string): string {
  const typeLabel = testType.charAt(0).toUpperCase() + testType.slice(1);
  return `${typeLabel} ${testId}`;
}

function calculateCurrentStreak(days: string[]): number {
  if (days.length === 0) {
    return 0;
  }

  const orderedDays = [...new Set(days)].sort();
  const daySet = new Set(orderedDays);
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  let streak = 0;
  while (daySet.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export function buildStudentProgressSummary(results: StudentProgressTestResult[]): StudentProgressSummary {
  const sortedResults = [...results].sort(
    (left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
  );

  const validBands = sortedResults
    .map((result) => Number(result.band_score))
    .filter((band) => Number.isFinite(band));

  const totalTests = validBands.length;
  const averageBand = totalTests > 0 ? roundToOneDecimal(validBands.reduce((sum, band) => sum + band, 0) / totalTests) : 0;
  const highestBand = totalTests > 0 ? roundToOneDecimal(Math.max(...validBands)) : 0;
  const lowestBand = totalTests > 0 ? roundToOneDecimal(Math.min(...validBands)) : 0;
  const bandChange =
    totalTests > 1
      ? roundToOneDecimal((validBands[validBands.length - 1] || 0) - (validBands[0] || 0))
      : 0;
  const chartPoints = sortedResults.slice(-12).map((result) => ({
    date: getUtcDayKey(result.created_at),
    bandScore: roundToOneDecimal(Number(result.band_score) || 0),
    testType: result.test_type,
    label: formatLabel(result.test_type, result.test_id),
  }));

  const testsByType = sortedResults.reduce<Record<string, number>>((accumulator, result) => {
    accumulator[result.test_type] = (accumulator[result.test_type] || 0) + 1;
    return accumulator;
  }, {});

  return {
    totalTests,
    averageBand,
    highestBand,
    lowestBand,
    bandChange,
    currentStreakDays: calculateCurrentStreak(sortedResults.map((result) => getUtcDayKey(result.created_at))),
    testsByType,
    chartPoints,
    latestTestAt: sortedResults.length > 0 ? sortedResults[sortedResults.length - 1].created_at : null,
  };
}

export function buildStudentProgressTitle(displayName: string | null): string {
  return `${displayName || 'Student'} IELTS progress`;
}

export function buildStudentProgressDescription(displayName: string | null, summary: StudentProgressSummary): string {
  const label = displayName || 'This student';
  return `${label} has completed ${summary.totalTests} IELTS tests, averages ${summary.averageBand.toFixed(1)}, and has a top band of ${summary.highestBand.toFixed(1)}.`;
}

export function buildStudentProgressShareText(displayName: string | null, summary: StudentProgressSummary): string {
  const label = displayName || 'My';
  return `${label} IELTS progress: ${summary.totalTests} tests, ${summary.averageBand.toFixed(1)} average band, ${summary.highestBand.toFixed(1)} highest band.`;
}
