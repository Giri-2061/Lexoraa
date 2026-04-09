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
      <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#1e3a8a" />
        <stop offset="100%" stop-color="#3b82f6" />
      </linearGradient>
      <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(37,99,235,0.2)" />
        <stop offset="100%" stop-color="rgba(37,99,235,0.0)" />
      </linearGradient>
    </defs>

    <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="24" fill="white" />
    
    <text x="60" y="100" fill="#1e3a8a" font-family="sans-serif" font-size="72" font-weight="900">${displayName || 'Student'}</text>
    <text x="60" y="140" fill="#1e3a8a" font-family="sans-serif" font-size="24" font-weight="800" letter-spacing="4">LEXORA</text>
    
    <text x="1140" y="80" fill="#64748b" font-family="sans-serif" font-size="22" font-weight="800" text-anchor="end">${generatedAt}</text>
    <text x="1140" y="110" fill="#94a3b8" font-family="sans-serif" font-size="18" font-weight="500" text-anchor="end">Monthly Report</text>

    <line x1="60" y1="180" x2="1140" y2="180" stroke="#cbd5e1" stroke-width="4" stroke-linecap="round" />
    <line x1="60" y1="180" x2="800" y2="180" stroke="#1e3a8a" stroke-width="4" stroke-linecap="round" />

    <g transform="translate(60, 210)">
      ${/* Stat Box Helper Logic would go here. Example for 'Tests': */ ''}
      <rect x="0" y="0" width="250" height="110" rx="20" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5" />
      <text x="125" y="55" fill="#1e3a8a" font-family="sans-serif" font-size="36" font-weight="800" text-anchor="middle">${totalTests}</text>
      <text x="125" y="85" fill="#64748b" font-family="sans-serif" font-size="14" font-weight="700" text-anchor="middle" letter-spacing="1">TESTS</text>

      <rect x="270" y="0" width="250" height="110" rx="20" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5" />
      <text x="395" y="55" fill="#1e3a8a" font-family="sans-serif" font-size="36" font-weight="800" text-anchor="middle">${summary.averageBand.toFixed(1)}</text>
      <text x="395" y="85" fill="#64748b" font-family="sans-serif" font-size="14" font-weight="700" text-anchor="middle" letter-spacing="1">AVG BAND</text>

      <rect x="540" y="0" width="250" height="110" rx="20" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5" />
      <text x="665" y="55" fill="#1e3a8a" font-family="sans-serif" font-size="36" font-weight="800" text-anchor="middle">${summary.highestBand.toFixed(1)}</text>
      <text x="665" y="85" fill="#64748b" font-family="sans-serif" font-size="14" font-weight="700" text-anchor="middle" letter-spacing="1">HIGHEST</text>

      <rect x="810" y="0" width="250" height="110" rx="20" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5" />
      <text x="935" y="55" fill="#1e3a8a" font-family="sans-serif" font-size="36" font-weight="800" text-anchor="middle">${summary.currentStreakDays}d</text>
      <text x="935" y="85" fill="#64748b" font-family="sans-serif" font-size="14" font-weight="700" text-anchor="middle" letter-spacing="1">STREAK</text>
    </g>

    <text x="60" y="360" fill="#64748b" font-family="sans-serif" font-size="18" font-weight="800" letter-spacing="1.5">GROWTH FORECASTING</text>
    <rect x="60" y="380" width="1080" height="220" rx="16" fill="#f1f5f9" opacity="0.5" />
    <path d="${fillPath}" fill="url(#fill)" />
    <path d="${chartPath}" fill="none" stroke="#3b82f6" stroke-width="4" stroke-linecap="round" />

    <g transform="translate(60, 650)">
      <text x="0" y="0" fill="#64748b" font-family="sans-serif" font-size="18" font-weight="800" letter-spacing="1.5">SKILL BREAKDOWN</text>
      
      <text x="0" y="45" fill="#1e3a8a" font-family="sans-serif" font-size="18" font-weight="600">Reading</text>
      <rect x="110" y="32" width="850" height="12" rx="6" fill="#e2e8f0" />
      <rect x="110" y="32" width="${850 * 0.78}" height="12" rx="6" fill="#1e3a8a" />
      <text x="1000" y="45" fill="#1e3a8a" font-family="sans-serif" font-size="18" font-weight="800">78%</text>

      <text x="0" y="95" fill="#1e3a8a" font-family="sans-serif" font-size="18" font-weight="600">Writing</text>
      <rect x="110" y="82" width="850" height="12" rx="6" fill="#e2e8f0" />
      <rect x="110" y="82" width="${850 * 0.82}" height="12" rx="6" fill="#1e3a8a" />
      <text x="1000" y="95" fill="#1e3a8a" font-family="sans-serif" font-size="18" font-weight="800">82%</text>
    </g>
  </svg>`;
};
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
