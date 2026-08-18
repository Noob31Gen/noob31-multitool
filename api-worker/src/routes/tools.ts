import { Hono } from 'hono';
import { calculateSubnet } from '../services/subnetService';
import { identifyHashType, generateHashes } from '../services/hashService';
import { checkDnsPropagation } from '../services/dnsPropagationService';
import { detectTyposquatting } from '../services/typosquatService';
import { jsonSuccess, jsonError } from '../utils/response';

export const toolsRouter = new Hono();

// 1. Subnet / CIDR Calculator
toolsRouter.get('/subnet', (c) => {
  const cidr = c.req.query('cidr') || c.req.query('ip');
  if (!cidr) {
    return jsonError(c, 'Parameter "cidr" or "ip" is required.', 400, 'Example: /api/tools/subnet?cidr=192.168.1.0/24');
  }

  try {
    const data = calculateSubnet(cidr);
    return jsonSuccess(c, data);
  } catch (err) {
    return jsonError(c, err instanceof Error ? err.message : 'Subnet calculation failed', 400);
  }
});

// 2. Hash Analyzer & Multi-Algorithm Generator
toolsRouter.get('/hash', async (c) => {
  const input = c.req.query('input') || c.req.query('text') || c.req.query('hash');
  if (!input) {
    return jsonError(c, 'Parameter "input" or "hash" is required.', 400, 'Example: /api/tools/hash?input=hello+world');
  }

  try {
    const identifiedTypes = identifyHashType(input);
    const generatedHashes = await generateHashes(input);

    return jsonSuccess(c, {
      input,
      identifiedTypes,
      generatedHashes
    });
  } catch (err) {
    return jsonError(c, err instanceof Error ? err.message : 'Hash processing failed', 500);
  }
});

// 3. Global Multi-Resolver DNS Propagation
toolsRouter.get('/propagation', async (c) => {
  const domain = c.req.query('domain') || c.req.query('name');
  const type = c.req.query('type') || 'A';

  if (!domain) {
    return jsonError(c, 'Parameter "domain" is required.', 400, 'Example: /api/tools/propagation?domain=google.com&type=A');
  }

  try {
    const data = await checkDnsPropagation(domain, type);
    return jsonSuccess(c, data);
  } catch (err) {
    return jsonError(c, err instanceof Error ? err.message : 'DNS propagation check failed', 500);
  }
});

// 4. Typosquatting & Permutation Check
toolsRouter.get('/typosquat', async (c) => {
  const domain = c.req.query('domain') || c.req.query('name');
  if (!domain) {
    return jsonError(c, 'Parameter "domain" is required.', 400, 'Example: /api/tools/typosquat?domain=google.com');
  }

  try {
    const data = await detectTyposquatting(domain);
    return jsonSuccess(c, data);
  } catch (err) {
    return jsonError(c, err instanceof Error ? err.message : 'Typosquatting check failed', 500);
  }
});
