import type { Context } from 'hono';

export interface ApiEnvelope<T = unknown> {
  success: boolean;
  status: number;
  timestamp: string;
  endpoint: string;
  executionTimeMs: number;
  data?: T;
  error?: string;
  hint?: string;
}

export function jsonSuccess<T>(c: Context, data: T, status: 200 | 201 = 200) {
  const start = c.get('startTime') as number || performance.now();
  const executionTimeMs = Math.round(performance.now() - start);

  const envelope: ApiEnvelope<T> = {
    success: true,
    status,
    timestamp: new Date().toISOString(),
    endpoint: c.req.path,
    executionTimeMs,
    data
  };

  // Support ?pretty=true for human-readable JSON
  const isPretty = c.req.query('pretty') === 'true' || c.req.query('pretty') === '1';
  if (isPretty) {
    return new Response(JSON.stringify(envelope, null, 2), {
      status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Server-Timing': `total;dur=${executionTimeMs}`
      }
    });
  }

  c.header('Server-Timing', `total;dur=${executionTimeMs}`);
  return c.json(envelope, status);
}

export function jsonError(c: Context, error: string, status: 400 | 404 | 500 = 400, hint?: string) {
  const start = c.get('startTime') as number || performance.now();
  const executionTimeMs = Math.round(performance.now() - start);

  const envelope: ApiEnvelope<null> = {
    success: false,
    status,
    timestamp: new Date().toISOString(),
    endpoint: c.req.path,
    executionTimeMs,
    error,
    hint
  };

  const isPretty = c.req.query('pretty') === 'true' || c.req.query('pretty') === '1';
  if (isPretty) {
    return new Response(JSON.stringify(envelope, null, 2), {
      status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Server-Timing': `total;dur=${executionTimeMs}`
      }
    });
  }

  c.header('Server-Timing', `total;dur=${executionTimeMs}`);
  return c.json(envelope, status);
}
