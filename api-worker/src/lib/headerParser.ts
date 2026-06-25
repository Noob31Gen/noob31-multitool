function parseReceivedDate(hop: string): Date | null {
  const parts = hop.split(';');
  if (parts.length < 2) return null;
  const dateStr = parts[parts.length - 1].trim();
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
  } catch { /* ignore parsing failure */ }
  return null;
}

function formatDelay(ms: number): string {
  const isNegative = ms < 0;
  const absMs = Math.abs(ms);
  const seconds = Math.floor(absMs / 1000);
  if (seconds < 60) return `${isNegative ? '-' : ''}${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${isNegative ? '-' : ''}${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${isNegative ? '-' : ''}${hours}h ${remainingMinutes}m`;
}

export function parseEmailHeaders(raw: string) {
  const unfolded = raw.replace(/\r?\n[ \t]+/g, ' ');
  const lines = unfolded.split(/\r?\n/);
  const headers: Record<string, string[]> = {};
  const hops: string[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim().toLowerCase();
      const val = line.slice(colonIdx + 1).trim();
      if (!headers[key]) headers[key] = [];
      headers[key].push(val);
      if (key === 'received') {
        hops.push(val);
      }
    }
  }

  // 1. Calculate transit delays between hops (oldest to newest)
  const rawHops = hops.reverse();
  const processedHops: string[] = [];
  let previousDate: Date | null = null;

  for (let i = 0; i < rawHops.length; i++) {
    const hopVal = rawHops[i];
    const currentDate = parseReceivedDate(hopVal);
    let delayStr = "";
    if (currentDate) {
      if (previousDate) {
        const diffMs = currentDate.getTime() - previousDate.getTime();
        // Skip display for minor clock variance discrepancies (between -1000ms and 1000ms)
        if (diffMs > 1000) {
          delayStr = ` [Delay: ${formatDelay(diffMs)}]`;
        } else if (diffMs < -1000) {
          delayStr = ` [Clock Skew: ${formatDelay(diffMs)}]`;
        }
      }
      previousDate = currentDate;
    }
    processedHops.push(hopVal + delayStr);
  }

  // 2. Parse Authentication-Results
  let spfResult = headers['received-spf']?.[0] || 'Not found';
  let dmarcResult = 'Not found';
  let dkimResult = 'Not found';

  const authHeaders = headers['authentication-results'] || [];
  for (const authHeader of authHeaders) {
    const parts = authHeader.split(';');
    for (const part of parts) {
      const p = part.trim().toLowerCase();
      if (p.startsWith('spf=')) {
        spfResult = part.trim();
      }
      if (p.startsWith('dmarc=')) {
        dmarcResult = part.trim();
      }
      if (p.startsWith('dkim=')) {
        dkimResult = part.trim();
      }
    }
  }

  return {
    from: headers['from']?.[0] || 'Unknown',
    to: headers['to']?.[0] || 'Unknown',
    subject: headers['subject']?.[0] || 'Unknown',
    date: headers['date']?.[0] || 'Unknown',
    messageId: headers['message-id']?.[0] || 'Unknown',
    authResults: authHeaders,
    spf: spfResult,
    dmarc: dmarcResult,
    dkim: dkimResult,
    hops: processedHops,
    rawHeaders: headers
  };
}