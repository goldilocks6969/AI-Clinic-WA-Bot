import type { IncomingMessage, ServerResponse } from 'node:http';
import { buildApp } from '../src/app.js';

// Vercel serverless entrypoint: wrap the Fastify instance. All paths are
// rewritten to /api (see vercel.json), and Fastify routes on the original URL.
const app = buildApp();
const ready = app.ready();

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  await ready;
  app.server.emit('request', req, res);
}
