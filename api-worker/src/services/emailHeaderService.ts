export interface EmailHop {
  hopNumber: number;
  from?: string;
  by?: string;
  with?: string;
  timestamp?: string;
  delaySeconds?: number;
  ip?: string;
}

export interface ParsedEmailHeaders {
  subject?: string;
  from?: string;
  to?: string;
  date?: string;
  messageId?: string;
  returnPath?: string;
  replyTo?: string;
  mailer?: string;
  listUnsubscribe?: string;
  authResults?: {
    raw?: string;
    spf?: { result?: string; ip?: string; domain?: string };
    dkim?: { result?: string; domain?: string; selector?: string };
    dmarc?: { result?: string; action?: string; domain?: string };
  };
  totalHops: number;
  totalDelaySeconds: number;
  hops: EmailHop[];
}

export function parseRawEmailHeaders(rawHeaders: string): ParsedEmailHeaders {
  // Normalize multi-line folded headers (RFC 5322 folding)
  const unfolded = rawHeaders.replace(/\r\n/g, '\n').replace(/\n[ \t]+/g, ' ');
  const lines = unfolded.split('\n');

  const headersMap = new Map<string, string[]>();

  lines.forEach(line => {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim().toLowerCase();
      const val = line.slice(colonIdx + 1).trim();
      const existing = headersMap.get(key) || [];
      existing.push(val);
      headersMap.set(key, existing);
    }
  });

  const getFirst = (key: string) => headersMap.get(key)?.[0];

  const subject = getFirst('subject');
  const from = getFirst('from');
  const to = getFirst('to');
  const date = getFirst('date');
  const messageId = getFirst('message-id');
  const returnPath = getFirst('return-path');
  const replyTo = getFirst('reply-to');
  const mailer = getFirst('x-mailer') || getFirst('user-agent');
  const listUnsubscribe = getFirst('list-unsubscribe');

  // Parse Authentication-Results
  const authHeader = getFirst('authentication-results');
  let authResults: ParsedEmailHeaders['authResults'] = undefined;
  if (authHeader) {
    const spfMatch = authHeader.match(/spf=([a-zA-Z]+)(?:\s+\([^)]*\))?(?:\s+smtp\.(?:mailfrom|helo)=([^\s;]+))?/i);
    const dkimMatch = authHeader.match(/dkim=([a-zA-Z]+)(?:\s+\([^)]*\))?(?:\s+header\.(?:i|d)=([^\s;]+))?/i);
    const dmarcMatch = authHeader.match(/dmarc=([a-zA-Z]+)(?:\s+\([^)]*\))?(?:\s+action=([^\s;]+))?(?:\s+header\.from=([^\s;]+))?/i);

    authResults = {
      raw: authHeader,
      spf: spfMatch ? { result: spfMatch[1], domain: spfMatch[2] } : undefined,
      dkim: dkimMatch ? { result: dkimMatch[1], domain: dkimMatch[2] } : undefined,
      dmarc: dmarcMatch ? { result: dmarcMatch[1], action: dmarcMatch[2], domain: dmarcMatch[3] } : undefined
    };
  }

  // Parse Received: Hops (in reverse order: bottom to top = chronological sender to recipient)
  const receivedList = (headersMap.get('received') || []).slice().reverse();
  const hops: EmailHop[] = [];
  let previousDate: Date | null = null;
  let totalDelay = 0;

  receivedList.forEach((rec, idx) => {
    const fromMatch = rec.match(/from\s+([^\s;]+)/i);
    const byMatch = rec.match(/by\s+([^\s;]+)/i);
    const withMatch = rec.match(/with\s+([^\s;]+)/i);
    const ipMatch = rec.match(/\[((?:\d{1,3}\.){3}\d{1,3}|[0-9a-fA-F:]+)\]/);
    const dateMatch = rec.split(';').pop()?.trim();

    let hopDate: Date | null = null;
    let delaySeconds: number | undefined = undefined;

    if (dateMatch) {
      const parsedTime = Date.parse(dateMatch);
      if (!isNaN(parsedTime)) {
        hopDate = new Date(parsedTime);
        if (previousDate) {
          const diffMs = hopDate.getTime() - previousDate.getTime();
          delaySeconds = Math.max(0, Math.round(diffMs / 1000));
          totalDelay += delaySeconds;
        }
        previousDate = hopDate;
      }
    }

    hops.push({
      hopNumber: idx + 1,
      from: fromMatch?.[1],
      by: byMatch?.[1],
      with: withMatch?.[1],
      ip: ipMatch?.[1],
      timestamp: hopDate ? hopDate.toISOString() : dateMatch,
      delaySeconds
    });
  });

  return {
    subject,
    from,
    to,
    date,
    messageId,
    returnPath,
    replyTo,
    mailer,
    listUnsubscribe,
    authResults,
    totalHops: hops.length,
    totalDelaySeconds: totalDelay,
    hops
  };
}
