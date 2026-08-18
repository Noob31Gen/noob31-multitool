import { Hono } from 'hono';
import { aggregateThreatIntel } from '../services/threatService';
import { lookupCertificates } from '../services/certService';
import { checkBlacklist, checkDomainReputation } from '../services/reputationService';
import { lookupCve } from '../services/cveService';
import { detectTyposquatting } from '../services/typosquatService';
import { jsonSuccess, jsonError } from '../utils/response';

export const securityRouter = new Hono();

securityRouter.get('/threat-intel', async (c) => {
  const query = c.req.query('query') || c.req.query('q') || c.req.query('target');
  if (!query) {
    return jsonError(c, 'Query parameter "query" is required.', 400, 'Example: /api/security/threat-intel?query=example.com');
  }

  try {
    const data = await aggregateThreatIntel(query);
    return jsonSuccess(c, data);
  } catch (err) {
    return jsonError(c, err instanceof Error ? err.message : 'Threat intelligence aggregation failed', 500);
  }
});

securityRouter.get('/cert', async (c) => {
  const domain = c.req.query('domain') || c.req.query('name');
  if (!domain) {
    return jsonError(c, 'Query parameter "domain" is required.', 400, 'Example: /api/security/cert?domain=google.com');
  }

  try {
    const data = await lookupCertificates(domain);
    return jsonSuccess(c, data);
  } catch (err) {
    return jsonError(c, err instanceof Error ? err.message : 'Certificate lookup failed', 500);
  }
});

securityRouter.get('/blacklist', async (c) => {
  const target = c.req.query('target') || c.req.query('ip');
  if (!target) {
    return jsonError(c, 'Query parameter "target" or "ip" is required.', 400, 'Example: /api/security/blacklist?target=1.1.1.1');
  }

  try {
    const data = await checkBlacklist(target);
    return jsonSuccess(c, data);
  } catch (err) {
    return jsonError(c, err instanceof Error ? err.message : 'Blacklist check failed', 500);
  }
});

securityRouter.get('/reputation', async (c) => {
  const target = c.req.query('target') || c.req.query('domain') || c.req.query('ip');
  if (!target) {
    return jsonError(c, 'Query parameter "target" is required.', 400, 'Example: /api/security/reputation?target=example.com');
  }

  try {
    const data = await checkDomainReputation(target);
    return jsonSuccess(c, data);
  } catch (err) {
    return jsonError(c, err instanceof Error ? err.message : 'Reputation check failed', 500);
  }
});

securityRouter.get('/cve', async (c) => {
  const cve = c.req.query('cve') || c.req.query('id');
  if (!cve) {
    return jsonError(c, 'Query parameter "cve" or "id" is required.', 400, 'Example: /api/security/cve?cve=CVE-2021-44228');
  }

  try {
    const data = await lookupCve(cve);
    return jsonSuccess(c, data);
  } catch (err) {
    return jsonError(c, err instanceof Error ? err.message : 'CVE lookup failed', 500);
  }
});

securityRouter.get('/typosquat', async (c) => {
  const domain = c.req.query('domain') || c.req.query('name');
  if (!domain) {
    return jsonError(c, 'Query parameter "domain" is required.', 400, 'Example: /api/security/typosquat?domain=google.com');
  }

  try {
    const data = await detectTyposquatting(domain);
    return jsonSuccess(c, data);
  } catch (err) {
    return jsonError(c, err instanceof Error ? err.message : 'Typosquatting check failed', 500);
  }
});
