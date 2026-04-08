import type { StudentProgressSnapshot, StudentProgressSummary } from '@/lib/studentProgressShare';

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;

export interface StudentProgressImageInput {
  displayName: string | null;
  snapshot: StudentProgressSnapshot;
}

export function buildStudentProgressCardSvg({ displayName, snapshot }: StudentProgressImageInput): string {
  const summary = snapshot.summary;
  const title = escapeXml(displayName || 'Student');
  const subtitle = escapeXml('IELTS progress snapshot');
  const generatedAt = escapeXml(new Date(snapshot.generatedAt).toLocaleDateString());
  const chartPath = buildChartPath(summary, 760, 180, 90, 160);
  const fillPath = buildAreaPath(summary, 760, 180, 90, 160);

  return `
  <svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#041b14" />
        <stop offset="55%" stop-color="#0d1325" />
        <stop offset="100%" stop-color="#02050a" />
      </linearGradient>
      <linearGradient id="panel" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(255,255,255,0.12)" />
        <stop offset="100%" stop-color="rgba(255,255,255,0.06)" />
      </linearGradient>
      <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#86efac" />
        <stop offset="100%" stop-color="#22c55e" />
      </linearGradient>
      <linearGradient id="line" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#22c55e" />
        <stop offset="100%" stop-color="#86efac" />
      </linearGradient>
      <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(34,197,94,0.45)" />
        <stop offset="100%" stop-color="rgba(34,197,94,0.02)" />
      </linearGradient>
      <filter id="blur" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="40" />
      </filter>
    </defs>

    <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="40" fill="url(#bg)" />
    <circle cx="170" cy="140" r="110" fill="#22c55e" opacity="0.18" filter="url(#blur)" />
    <circle cx="1030" cy="90" r="130" fill="#38bdf8" opacity="0.16" filter="url(#blur)" />
    <circle cx="980" cy="530" r="150" fill="#22c55e" opacity="0.12" filter="url(#blur)" />

    <rect x="52" y="52" width="1096" height="526" rx="32" fill="url(#panel)" stroke="rgba(255,255,255,0.12)" />

    <text x="88" y="118" fill="#86efac" font-size="22" font-weight="700" letter-spacing="3">LEXORA</text>
    <text x="88" y="178" fill="#ffffff" font-size="56" font-weight="800">${title}</text>
    <text x="88" y="220" fill="rgba(255,255,255,0.72)" font-size="26">${subtitle}</text>
    <text x="88" y="256" fill="rgba(255,255,255,0.50)" font-size="18">Generated ${generatedAt}</text>

    ${metricCard(88, 292, 200, 118, 'Total tests', summary.totalTests.toString())}
    ${metricCard(304, 292, 200, 118, 'Average band', summary.averageBand.toFixed(1))}
    ${metricCard(520, 292, 200, 118, 'Highest band', summary.highestBand.toFixed(1))}
    ${metricCard(736, 292, 200, 118, 'Streak', `${summary.currentStreakDays}d`)}

    <rect x="88" y="432" width="760" height="132" rx="24" fill="rgba(0,0,0,0.18)" stroke="rgba(255,255,255,0.08)" />
    <text x="116" y="468" fill="rgba(255,255,255,0.65)" font-size="16" font-weight="600" letter-spacing="1.5">PROGRESS GRAPH</text>
    <text x="116" y="495" fill="#ffffff" font-size="28" font-weight="700">Band score trend</text>
    <text x="116" y="524" fill="rgba(255,255,255,0.55)" font-size="16">Average ${summary.averageBand.toFixed(1)} • Best ${summary.highestBand.toFixed(1)} • ${summary.totalTests} tests</text>

    <g transform="translate(800 430)">
      <rect x="0" y="0" width="320" height="134" rx="24" fill="rgba(0,0,0,0.18)" stroke="rgba(255,255,255,0.08)" />
      <text x="22" y="34" fill="rgba(255,255,255,0.65)" font-size="16" font-weight="600" letter-spacing="1.5">LATEST PERFORMANCE</text>
      <text x="22" y="78" fill="url(#accent)" font-size="48" font-weight="800">${summary.totalTests > 0 ? summary.highestBand.toFixed(1) : 'N/A'}</text>
      <text x="22" y="106" fill="rgba(255,255,255,0.60)" font-size="18">Top IELTS band</text>
    </g>

    <g transform="translate(860 470)">
      <path d="${fillPath}" fill="url(#fill)" />
      <path d="${chartPath}" fill="none" stroke="url(#line)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
      ${buildDots(summary, 760, 180, 90, 160)}
    </g>
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

function metricCard(x: number, y: number, width: number, height: number, label: string, value: string): string {
  return `
    <g transform="translate(${x} ${y})">
      <rect width="${width}" height="${height}" rx="20" fill="rgba(0,0,0,0.18)" stroke="rgba(255,255,255,0.08)" />
      <text x="18" y="30" fill="rgba(255,255,255,0.60)" font-size="14" font-weight="600" letter-spacing="1.4">${escapeXml(label.toUpperCase())}</text>
      <text x="18" y="78" fill="#ffffff" font-size="36" font-weight="800">${escapeXml(value)}</text>
    </g>`;
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
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5" fill="#86efac" stroke="rgba(255,255,255,0.9)" stroke-width="2" />`;
    })
    .join('\n');
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
