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
  const subtitle = escapeXml('IELTS progress report');
  const generatedAt = escapeXml(new Date(snapshot.generatedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase());
  const chartPath = buildChartPath(summary, 615, 150, 50, 12);
  const fillPath = buildAreaPath(summary, 615, 150, 50, 12);
  const testsByTypeCards = buildTestsByTypeCards(summary);
  const performanceInsights = buildPerformanceInsights(summary);

  return `
  <svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#f7f7f4" />
        <stop offset="100%" stop-color="#f2f1eb" />
      </linearGradient>
      <linearGradient id="panel" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ffffff" />
        <stop offset="100%" stop-color="#f7f5ff" />
      </linearGradient>
      <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#6d28d9" />
        <stop offset="100%" stop-color="#8b5cf6" />
      </linearGradient>
      <linearGradient id="line" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#5b21b6" />
        <stop offset="100%" stop-color="#8b5cf6" />
      </linearGradient>
      <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(109,40,217,0.32)" />
        <stop offset="100%" stop-color="rgba(109,40,217,0.02)" />
      </linearGradient>
      <linearGradient id="chipPink" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#f5c2ff" />
        <stop offset="100%" stop-color="#f0abfc" />
      </linearGradient>
      <linearGradient id="chipGray" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#eceae7" />
        <stop offset="100%" stop-color="#dfdcd7" />
      </linearGradient>
      <linearGradient id="graphBg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#fefbff" />
        <stop offset="100%" stop-color="#f6f1ff" />
      </linearGradient>
      <linearGradient id="bottomPanel" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#6d28d9" />
        <stop offset="100%" stop-color="#8b5cf6" />
      </linearGradient>
      <filter id="blur" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="40" />
      </filter>
    </defs>

    <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="36" fill="url(#bg)" />
    <rect x="22" y="22" width="1156" height="586" rx="28" fill="url(#panel)" stroke="#d6d3d1" stroke-width="1.5" />

    <rect x="22" y="22" width="22" height="586" rx="11" fill="url(#accent)" />
    <rect x="22" y="190" width="22" height="126" rx="11" fill="#9b8cf3" opacity="0.95" />
    <rect x="22" y="390" width="22" height="176" rx="11" fill="#c4b5fd" opacity="0.95" />

    <circle cx="760" cy="42" r="2.8" fill="#f0abfc" />
    <circle cx="778" cy="42" r="2.8" fill="#f0abfc" />
    <circle cx="796" cy="42" r="2.8" fill="#f0abfc" />
    <circle cx="814" cy="42" r="2.8" fill="#f0abfc" />
    <circle cx="832" cy="42" r="2.8" fill="#f0abfc" />
    <circle cx="850" cy="42" r="2.8" fill="#f0abfc" />
    <circle cx="868" cy="42" r="2.8" fill="#f0abfc" />
    <circle cx="778" cy="60" r="2.8" fill="#f0abfc" />
    <circle cx="796" cy="60" r="2.8" fill="#f0abfc" />
    <circle cx="814" cy="60" r="2.8" fill="#f0abfc" />
    <circle cx="832" cy="60" r="2.8" fill="#f0abfc" />
    <circle cx="850" cy="60" r="2.8" fill="#f0abfc" />
    <circle cx="814" cy="78" r="2.8" fill="#f0abfc" />
    <circle cx="832" cy="78" r="2.8" fill="#f0abfc" />

    <text x="88" y="112" fill="#5b21b6" font-size="54" font-weight="900" letter-spacing="-1">GROWTH</text>
    <text x="88" y="166" fill="#5b21b6" font-size="54" font-weight="900" letter-spacing="-1">OPPORTUNITIES</text>

    <text x="940" y="88" fill="#6d28d9" font-size="22" font-weight="800" text-anchor="end" letter-spacing="1">${generatedAt}</text>
    <text x="940" y="112" fill="#6d28d9" font-size="22" font-weight="800" text-anchor="end" letter-spacing="1">REPORT</text>
    <text x="940" y="148" fill="#5c5a66" font-size="17" text-anchor="end">Prepared for ${title}</text>
    <text x="940" y="172" fill="#5c5a66" font-size="16" text-anchor="end">Lexora progress summary</text>

    <rect x="392" y="180" width="708" height="34" rx="17" fill="#e9d5ff" opacity="0.65" />
    <rect x="392" y="180" width="670" height="34" rx="17" fill="url(#accent)" />

    <text x="88" y="240" fill="#2f2f36" font-size="16" font-weight="700">MARKET SENTIMENT</text>
    <text x="88" y="262" fill="#2f2f36" font-size="16" font-weight="700">&amp; TRENDS</text>

    ${pill(312, 216, 108, 62, chipLabel('+', summary.totalTests.toString()), 'Total tests', 'pink')}
    ${pill(438, 216, 108, 62, summary.averageBand.toFixed(1), 'Average band', 'gray')}
    ${pill(564, 216, 108, 62, summary.highestBand.toFixed(1), 'Highest band', 'pink')}
    ${pill(690, 216, 138, 62, `${summary.currentStreakDays}d`, 'Current streak', 'gray')}

    <text x="332" y="301" fill="#56536a" font-size="14" font-style="italic" text-anchor="middle">Tests completed</text>
    <text x="492" y="301" fill="#56536a" font-size="14" font-style="italic" text-anchor="middle">Average band</text>
    <text x="618" y="301" fill="#56536a" font-size="14" font-style="italic" text-anchor="middle">Highest band</text>
    <text x="759" y="301" fill="#56536a" font-size="14" font-style="italic" text-anchor="middle">Consistency</text>

    <text x="88" y="354" fill="#2f2f36" font-size="16" font-weight="700">PROGRESS SUMMARY</text>
    <text x="88" y="376" fill="#2f2f36" font-size="16" font-weight="700">&amp; INSIGHTS</text>

    ${insightCard(320, 332, 250, 118, 'Strength', performanceInsights.strength)}
    ${insightCard(586, 332, 250, 118, 'Focus', performanceInsights.focus)}
    ${insightCard(852, 332, 250, 118, 'Momentum', performanceInsights.momentum)}

    <text x="88" y="470" fill="#2f2f36" font-size="16" font-weight="700">GROWTH FORECASTING</text>
    <rect x="330" y="436" width="640" height="150" rx="22" fill="url(#graphBg)" stroke="#e4e1ff" stroke-width="1.2" />
    <g transform="translate(348 452)">
      <text x="0" y="0" fill="#716f82" font-size="12" font-weight="700">9</text>
      <text x="0" y="29" fill="#716f82" font-size="12" font-weight="700">7</text>
      <text x="0" y="58" fill="#716f82" font-size="12" font-weight="700">5</text>
      <text x="0" y="87" fill="#716f82" font-size="12" font-weight="700">3</text>
      <text x="0" y="116" fill="#716f82" font-size="12" font-weight="700">0</text>
      <g transform="translate(24 0)">
        <line x1="0" y1="0" x2="570" y2="0" stroke="#ddd6fe" stroke-width="1" />
        <line x1="0" y1="29" x2="570" y2="29" stroke="#ddd6fe" stroke-width="1" />
        <line x1="0" y1="58" x2="570" y2="58" stroke="#ddd6fe" stroke-width="1" />
        <line x1="0" y1="87" x2="570" y2="87" stroke="#ddd6fe" stroke-width="1" />
        <line x1="0" y1="116" x2="570" y2="116" stroke="#ddd6fe" stroke-width="1" />
      </g>
      <g transform="translate(24 2)">
        <path d="${fillPath}" fill="url(#fill)" />
        <path d="${chartPath}" fill="none" stroke="url(#line)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
        ${buildDots(summary, 615, 150, 50, 12)}
      </g>
      <g fill="#6f5cc8" font-size="12" font-weight="700" text-anchor="middle">
        ${buildGraphLabels(summary)}
      </g>
    </g>

    <text x="88" y="558" fill="#2f2f36" font-size="16" font-weight="700">TEST TYPE MIX</text>
    ${testsByTypeCards}

    <rect x="330" y="586" width="640" height="14" rx="7" fill="url(#bottomPanel)" opacity="0.95" />
    <text x="108" y="604" fill="#6d28d9" font-size="14" font-weight="800" letter-spacing="1.1">POWERED BY LEXORA</text>
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

function pill(x: number, y: number, width: number, height: number, value: string, label: string, tone: 'pink' | 'gray'): string {
  const fill = tone === 'pink' ? 'url(#chipPink)' : 'url(#chipGray)';
  return `
    <g transform="translate(${x} ${y})">
      <rect width="${width}" height="${height}" rx="16" fill="${fill}" />
      <text x="${width / 2}" y="27" fill="#2f2f36" font-size="20" font-weight="900" text-anchor="middle">${escapeXml(value)}</text>
      <text x="${width / 2}" y="48" fill="#4b4a55" font-size="12" font-weight="700" text-anchor="middle">${escapeXml(label)}</text>
    </g>`;
}

function chipLabel(prefix: string, value: string): string {
  return `${prefix}${value}`;
}

function insightCard(x: number, y: number, width: number, height: number, title: string, body: string): string {
  return `
    <g transform="translate(${x} ${y})">
      <rect width="${width}" height="${height}" rx="22" fill="url(#bottomPanel)" />
      <rect x="0" y="0" width="18" height="18" rx="8" fill="#f5c2ff" opacity="0.95" />
      <text x="18" y="32" fill="rgba(255,255,255,0.82)" font-size="14" font-weight="700">${escapeXml(body)}</text>
      <line x1="18" y1="58" x2="${width - 18}" y2="58" stroke="rgba(255,255,255,0.35)" />
      <text x="${width / 2}" y="104" fill="#fff6a8" font-size="26" font-weight="900" text-anchor="middle">${escapeXml(title)}</text>
    </g>`;
}

function buildTestsByTypeCards(summary: StudentProgressSummary): string {
  const entries = Object.entries(summary.testsByType).filter(([, count]) => count > 0).slice(0, 4);
  const labels = ['Writing', 'Speaking', 'Reading', 'Listening'];
  const used = entries.length > 0 ? entries : labels.map((label) => [label.toLowerCase(), 0] as [string, number]);

  const startX = 320;
  const gap = 14;
  const cardWidth = 150;

  return used
    .slice(0, 4)
    .map(([type, count], index) => {
      const x = startX + index * (cardWidth + gap);
      const label = type.charAt(0).toUpperCase() + type.slice(1);
      const share = summary.totalTests > 0 ? Math.round((count / summary.totalTests) * 100) : 0;
      return `
        <g transform="translate(${x} 510)">
          <rect width="${cardWidth}" height="62" rx="18" fill="rgba(109,40,217,0.92)" />
          <rect x="12" y="12" width="8" height="8" rx="4" fill="#f5c2ff" />
          <text x="18" y="38" fill="#fff" font-size="14" font-weight="800">${escapeXml(label.toUpperCase())}</text>
          <text x="${cardWidth - 16}" y="36" fill="#fff6a8" font-size="18" font-weight="900" text-anchor="end">${share}%</text>
          <text x="${cardWidth / 2}" y="53" fill="rgba(255,255,255,0.75)" font-size="11" font-style="italic" text-anchor="middle">${count} tests</text>
        </g>`;
    })
    .join('');
}

function buildPerformanceInsights(summary: StudentProgressSummary) {
  const strength = summary.highestBand >= 7 ? 'Strong top-end performance' : 'Building stronger top-end scores';
  const focus = summary.averageBand < 6.5 ? 'Raise consistency across papers' : 'Push the average toward 7+';
  const momentum = summary.bandChange > 0 ? 'Improving over recent attempts' : 'Keep the pace and build streaks';
  return { strength, focus, momentum };
}

function buildGraphLabels(summary: StudentProgressSummary): string {
  const points = summary.chartPoints.slice(-5);
  if (points.length === 0) return '';

  return points
    .map((point, index) => {
      const x = 24 + (index / Math.max(points.length - 1, 1)) * 570;
      return `<text x="${x.toFixed(1)}" y="138" fill="#7c3aed" font-size="12" font-weight="700" text-anchor="middle">${escapeXml(point.label)}</text>`;
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
