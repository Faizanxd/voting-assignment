// src/app.ts
// Minimal Express app export used by Supertest in integration tests.
// If your real application already exports an Express app, replace this file
// with a simple re-export of that app (e.g., `export { app } from './yourAppFile'`).

import express from 'express';
import bodyParser from 'body-parser';

// Import your existing route handlers if available and mount them here.
// Example:
// import votesRouter from './routes/votes';
// app.use('/api/polls/:id/votes', votesRouter);

// For tests we provide a lightweight implementation that calls into your
// VoteService via Prisma if you wire it in. If you already have controllers,
// prefer to re-export your real app instead of using this file.

const app = express();
app.use(bodyParser.json());

// Health check
app.get('/health', (_req, res) => res.status(200).json({ ok: true }));

// Minimal POST /api/polls/:id/votes handler used by tests.
// Replace the handler body with your real controller logic or re-export your app.
app.post('/api/polls/:id/votes', async (req, res) => {
  // Expected body: { userId: string, pollOptionId: string }
  const pollId = req.params.id;
  const { userId, pollOptionId } = req.body;

  // If you have a real VoteService or controller, call it here instead.
  // This placeholder returns 404 to encourage wiring your real implementation.
  return res
    .status(404)
    .json({ error: 'Not implemented: mount real vote handler here' });
});

export default app;
