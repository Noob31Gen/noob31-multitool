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
  return {
    from: headers['from']?.[0] || 'Unknown',
    to: headers['to']?.[0] || 'Unknown',
    subject: headers['subject']?.[0] || 'Unknown',
    date: headers['date']?.[0] || 'Unknown',
    messageId: headers['message-id']?.[0] || 'Unknown',
    authResults: headers['authentication-results'] || [],
    spf: headers['received-spf']?.[0] || 'Not found',
    hops: hops.reverse(),
    rawHeaders: headers
  }
}