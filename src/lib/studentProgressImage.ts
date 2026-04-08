import type { StudentProgressSnapshot, StudentProgressSummary } from '@/lib/studentProgressShare';

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 900;

export interface StudentProgressImageInput {
  displayName: string | null;
  snapshot: StudentProgressSnapshot;
}

export function buildStudentProgressCardSvg({ displayName, snapshot }: StudentProgressImageInput): string {
  const summary = snapshot.summary;
  const generatedAt = new Date(snapshot.generatedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
  const totalTests = summary.totalTests.toString();
  const chartPath = buildChartPath(summary, 760, 260, 52, 26);
  const fillPath = buildAreaPath(summary, 760, 260, 52, 26);
  const testMixCards = buildTestMixCards(summary);

  return `
  <svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#f9fbff" />
        <stop offset="100%" stop-color="#eef4ff" />
      </linearGradient>
      <linearGradient id="panel" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ffffff" />
        <stop offset="100%" stop-color="#f5f9ff" />
      </linearGradient>
      <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#2563eb" />
        <stop offset="100%" stop-color="#3b82f6" />
      </linearGradient>
      <linearGradient id="line" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#1d4ed8" />
        <stop offset="100%" stop-color="#60a5fa" />
      </linearGradient>
      <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(37,99,235,0.28)" />
        <stop offset="100%" stop-color="rgba(37,99,235,0.02)" />
      </linearGradient>
      <linearGradient id="chipBlue" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#dbeafe" />
        <stop offset="100%" stop-color="#bfdbfe" />
      </linearGradient>
      <linearGradient id="graphBg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ffffff" />
        <stop offset="100%" stop-color="#f4f8ff" />
      </linearGradient>
      <linearGradient id="bottomPanel" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#1d4ed8" />
        <stop offset="100%" stop-color="#2563eb" />
      </linearGradient>
      <filter id="blur" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="40" />
      </filter>
    </defs>

    <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="36" fill="url(#bg)" />
    <rect x="22" y="22" width="1156" height="856" rx="28" fill="url(#panel)" stroke="#d8e2f2" stroke-width="1.5" />

    <rect x="22" y="22" width="22" height="856" rx="11" fill="url(#accent)" />
    <rect x="22" y="248" width="22" height="160" rx="11" fill="#93c5fd" opacity="0.9" />
    <rect x="22" y="514" width="22" height="218" rx="11" fill="#bfdbfe" opacity="0.9" />

    <circle cx="768" cy="40" r="2.8" fill="#bfdbfe" />
    <circle cx="786" cy="40" r="2.8" fill="#bfdbfe" />
    <circle cx="804" cy="40" r="2.8" fill="#bfdbfe" />
    <circle cx="822" cy="40" r="2.8" fill="#bfdbfe" />
    <circle cx="840" cy="40" r="2.8" fill="#bfdbfe" />
    <circle cx="786" cy="58" r="2.8" fill="#bfdbfe" />
    <circle cx="804" cy="58" r="2.8" fill="#bfdbfe" />
    <circle cx="822" cy="58" r="2.8" fill="#bfdbfe" />
    <circle cx="804" cy="76" r="2.8" fill="#bfdbfe" />

    <text x="88" y="112" fill="#1d4ed8" font-size="62" font-weight="900" letter-spacing="-2">LEXORA</text>
    <text x="88" y="154" fill="#1e3a8a" font-size="28" font-weight="800" letter-spacing="1.6">PROGRESS REPORT</text>

    <text x="940" y="86" fill="#2563eb" font-size="18" font-weight="800" text-anchor="end" letter-spacing="1">${generatedAt}</text>
    <text x="940" y="110" fill="#1d4ed8" font-size="18" font-weight="800" text-anchor="end" letter-spacing="1">REPORT</text>
    <text x="940" y="148" fill="#475569" font-size="16" text-anchor="end">Prepared for ${escapeXml(displayName || 'Student')}</text>
    <text x="940" y="170" fill="#64748b" font-size="15" text-anchor="end">Lexora progress summary</text>

    <rect x="392" y="180" width="708" height="34" rx="17" fill="#dbeafe" opacity="0.9" />
    <rect x="392" y="180" width="670" height="34" rx="17" fill="url(#accent)" />

    <text x="88" y="236" fill="#0f172a" font-size="16" font-weight="700">THIS MONTH</text>
    <text x="88" y="258" fill="#0f172a" font-size="16" font-weight="700">HIGHLIGHTS</text>

    ${statPill(312, 214, 120, 66, totalTests, 'Tests')}
    ${statPill(450, 214, 120, 66, summary.averageBand.toFixed(1), 'Avg band')}
    ${statPill(588, 214, 120, 66, summary.highestBand.toFixed(1), 'Highest')}
    ${statPill(726, 214, 120, 66, `${summary.currentStreakDays}d`, 'Streak')}

    <text x="88" y="360" fill="#0f172a" font-size="16" font-weight="700">PROGRESS SUMMARY</text>

    <rect x="316" y="332" width="260" height="122" rx="22" fill="url(#bottomPanel)" />
    <rect x="590" y="332" width="260" height="122" rx="22" fill="url(#bottomPanel)" opacity="0.95" />
    <rect x="864" y="332" width="260" height="122" rx="22" fill="url(#bottomPanel)" opacity="0.9" />
    <text x="346" y="370" fill="rgba(255,255,255,0.88)" font-size="16" font-weight="700">Strong top-end performance</text>
    <text x="346" y="438" fill="#fef08a" font-size="28" font-weight="900">Band trend</text>
    <text x="620" y="370" fill="rgba(255,255,255,0.88)" font-size="16" font-weight="700">Keep pushing the average up</text>
    <text x="620" y="438" fill="#fef08a" font-size="28" font-weight="900">Consistency</text>
    <text x="894" y="370" fill="rgba(255,255,255,0.88)" font-size="16" font-weight="700">Current momentum looks stable</text>
    <text x="894" y="438" fill="#fef08a" font-size="28" font-weight="900">Momentum</text>

    <text x="88" y="500" fill="#0f172a" font-size="16" font-weight="700">GROWTH FORECASTING</text>
    <rect x="316" y="482" width="808" height="250" rx="26" fill="url(#graphBg)" stroke="#dbeafe" stroke-width="1.2" />
    <g transform="translate(344 502)">
      <text x="0" y="0" fill="#64748b" font-size="12" font-weight="700">9</text>
      <text x="0" y="50" fill="#64748b" font-size="12" font-weight="700">7</text>
      <text x="0" y="100" fill="#64748b" font-size="12" font-weight="700">5</text>
      <text x="0" y="150" fill="#64748b" font-size="12" font-weight="700">3</text>
      <text x="0" y="200" fill="#64748b" font-size="12" font-weight="700">0</text>
      <g transform="translate(24 0)">
        <line x1="0" y1="0" x2="710" y2="0" stroke="#dbeafe" stroke-width="1" />
        <line x1="0" y1="50" x2="710" y2="50" stroke="#dbeafe" stroke-width="1" />
        <line x1="0" y1="100" x2="710" y2="100" stroke="#dbeafe" stroke-width="1" />
        <line x1="0" y1="150" x2="710" y2="150" stroke="#dbeafe" stroke-width="1" />
        <line x1="0" y1="200" x2="710" y2="200" stroke="#dbeafe" stroke-width="1" />
      </g>
      <g transform="translate(24 4)">
        <path d="${fillPath}" fill="url(#fill)" />
        <path d="${chartPath}" fill="none" stroke="url(#line)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
        ${buildDots(summary, 760, 260, 52, 26)}
      </g>
      <g fill="#2563eb" font-size="12" font-weight="700" text-anchor="middle">
        ${buildGraphLabels(summary)}
      </g>
    </g>

    <text x="88" y="780" fill="#0f172a" font-size="16" font-weight="700">PERCENTAGE STAT</text>
    ${testMixCards}

    <rect x="316" y="836" width="808" height="16" rx="8" fill="url(#bottomPanel)" />
    <text x="88" y="858" fill="#2563eb" font-size="14" font-weight="800" letter-spacing="1.2">POWERED BY LEXORA</text>
  </svg>`;
}

export async function downloadStudentProgressImage(input: StudentProgressImageInput): Promise<void> {
  const svg = buildStudentProgressCardSvg(input);
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  const image = new Image();

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
    image.src = objectUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const context = canvas.getContext('2d');

  if (!context) {
    URL.revokeObjectURL(objectUrl);
    throw new Error('Canvas not supported');
  }

  context.drawImage(image, 0, 0, CARD_WIDTH, CARD_HEIGHT);
  URL.revokeObjectURL(objectUrl);

  const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png', 1));
  if (!pngBlob) {
    throw new Error('Failed to create image');
  }

  const downloadUrl = URL.createObjectURL(pngBlob);
  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  anchor.download = `lexora-progress-${(input.displayName || 'student').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
  anchor.click();
  URL.revokeObjectURL(downloadUrl);
}

export async function shareStudentProgressImage(input: StudentProgressImageInput): Promise<boolean> {
  try {
    const svg = buildStudentProgressCardSvg(input);
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = reject;
      image.src = objectUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = CARD_WIDTH;
    canvas.height = CARD_HEIGHT;
    const context = canvas.getContext('2d');

    if (!context) {
      URL.revokeObjectURL(objectUrl);
      return false;
    }

    context.drawImage(image, 0, 0, CARD_WIDTH, CARD_HEIGHT);
    URL.revokeObjectURL(objectUrl);

    const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png', 1));
    if (!pngBlob) return false;

    const file = new File([pngBlob], `lexora-progress-${(input.displayName || 'student').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`, { type: 'image/png' });

    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: 'Lexora progress snapshot',
        text: 'My IELTS progress snapshot from Lexora',
        files: [file],
      });
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

function statPill(x: number, y: number, width: number, height: number, value: string, label: string): string {
  return `
    <g transform="translate(${x} ${y})">
      <rect width="${width}" height="${height}" rx="16" fill="url(#chipBlue)" />
      <text x="${width / 2}" y="27" fill="#0f172a" font-size="20" font-weight="900" text-anchor="middle">${escapeXml(value)}</text>
      <text x="${width / 2}" y="48" fill="#334155" font-size="12" font-weight="700" text-anchor="middle">${escapeXml(label)}</text>
    </g>`;
}

function buildTestMixCards(summary: StudentProgressSummary): string {
  const order = ['listening', 'reading', 'writing', 'speaking'];
  const startX = 316;
  const gap = 18;
  const cardWidth = 170;

  return order
    .map((type, index) => {
      const count = summary.testsByType[type] || 0;
      const percentage = summary.totalTests > 0 ? Math.round((count / summary.totalTests) * 100) : 0;
      const label = type.charAt(0).toUpperCase() + type.slice(1);
      const x = startX + index * (cardWidth + gap);
      return `
        <g transform="translate(${x} 792)">
          <rect width="${cardWidth}" height="58" rx="18" fill="url(#bottomPanel)" />
          <circle cx="14" cy="14" r="5" fill="#bfdbfe" />
          <text x="18" y="35" fill="#ffffff" font-size="14" font-weight="800">${escapeXml(label)}</text>
          <text x="${cardWidth - 18}" y="35" fill="#fff7b0" font-size="18" font-weight="900" text-anchor="end">${percentage}%</text>
          <text x="${cardWidth / 2}" y="53" fill="rgba(255,255,255,0.72)" font-size="11" font-style="italic" text-anchor="middle">${count} tests</text>
        </g>`;
    })
    .join('');
}

function buildChartPath(summary: StudentProgressSummary, width: number, height: number, offsetX: number, offsetY: number): string {
  const points = summary.chartPoints.slice(-12);
  if (points.length === 0) return '';

  if (points.length === 1) {
    const x = offsetX;
    const y = offsetY + height - (points[0].bandScore / 9) * height;
    return `M ${x} ${y} L ${x + 1} ${y}`;
  }

  return points
    .map((point, index) => {
      const x = offsetX + (index / (points.length - 1)) * width;
      const y = offsetY + height - (point.bandScore / 9) * height;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

function buildAreaPath(summary: StudentProgressSummary, width: number, height: number, offsetX: number, offsetY: number): string {
  const points = summary.chartPoints.slice(-12);
  if (points.length === 0) return '';

  const path = buildChartPath(summary, width, height, offsetX, offsetY);
  const lastX = offsetX + width;
  const firstX = offsetX;
  const baseY = offsetY + height;

  return `${path} L ${lastX.toFixed(1)} ${baseY.toFixed(1)} L ${firstX.toFixed(1)} ${baseY.toFixed(1)} Z`;
}

function buildDots(summary: StudentProgressSummary, width: number, height: number, offsetX: number, offsetY: number): string {
  const points = summary.chartPoints.slice(-12);
  return points
    .map((point, index) => {
      const x = offsetX + (index / Math.max(points.length - 1, 1)) * width;
      const y = offsetY + height - (point.bandScore / 9) * height;
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5" fill="#60a5fa" stroke="rgba(255,255,255,0.95)" stroke-width="2" />`;
    })
    .join('\n');
}

function buildGraphLabels(summary: StudentProgressSummary): string {
  const points = summary.chartPoints.slice(-5);
  if (points.length === 0) return '';

  return points
    .map((point, index) => {
      const x = 24 + (index / Math.max(points.length - 1, 1)) * 710;
      return `<text x="${x.toFixed(1)}" y="254" fill="#2563eb" font-size="12" font-weight="700" text-anchor="middle">${escapeXml(point.label)}</text>`;
    })
    .join('');
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
