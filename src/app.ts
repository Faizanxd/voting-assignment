import express from 'express';
import bodyParser from 'body-parser';
import { PrismaClient } from '@prisma/client';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import cookieParser from 'cookie-parser';

const prisma = new PrismaClient();
const app = express();

// --- Security & middleware ---
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*', // tighten in prod
    credentials: true, // allow cookies
  }),
);
app.use(bodyParser.json({ limit: '100kb' }));
app.use(cookieParser(process.env.COOKIE_SECRET || 'dev-secret'));

// Correlation ID + logging
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
app.use((req, _res, next) => {
  (req as any).correlationId = req.headers['x-correlation-id'] || uuid();
  next();
});
app.use(
  pinoHttp({
    logger,
    genReqId: (req) => (req as any).correlationId,
    customLogLevel: (res, err) =>
      err || res.statusCode >= 500 ? 'error' : 'info',
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers["set-cookie"]',
      ],
    },
  }),
);

// Rate limit write endpoints
const writeLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(['/api/polls'], writeLimiter);

// --- Zod schemas ---
const createPollSchema = z
  .object({
    question: z.string().min(1),
    options: z.array(z.string().min(1)).min(2),
    creatorId: z.string().optional(),
  })
  .strict();

const castVoteSchema = z
  .object({
    userId: z.string().optional(),
    pollOptionId: z.string().min(1),
  })
  .strict();

// --- Audit log helper ---
function auditLog(
  req: express.Request,
  action: string,
  details: Record<string, any>,
) {
  const correlationId = (req as any).correlationId;
  req.log?.info({ correlationId, action, ...details }, 'AUDIT');
  console.log(
    `[AUDIT] ${new Date().toISOString()} [${correlationId}] ${action} ${JSON.stringify(details)}`,
  );
}

// --- Routes ---

// Create poll
app.post('/api/polls', async (req, res, next) => {
  try {
    const { question, options, creatorId } = createPollSchema.parse(req.body);

    const creator = creatorId
      ? await prisma.user.findUnique({ where: { id: creatorId } })
      : await prisma.user.create({
          data: {
            name: 'anon',
            email: `anon+${Date.now()}@local`,
            passwordHash: '',
          },
        });

    const poll = await prisma.poll.create({
      data: {
        question,
        creatorId: creator!.id,
        options: { create: options.map((text) => ({ text })) },
      },
      include: { options: true },
    });

    auditLog(req, 'POLL_CREATED', {
      pollId: poll.id,
      creatorId: creator!.id,
      question,
      optionCount: options.length,
    });

    res.status(201).json(poll);
  } catch (err) {
    next(err);
  }
});

// Cast vote with cookie-based anon user persistence
app.post('/api/polls/:id/votes', async (req, res, next) => {
  try {
    const { pollOptionId, userId: bodyUserId } = castVoteSchema.parse(req.body);
    const pollId = req.params.id;

    // Prefer signed cookie, then body
    let userId = req.signedCookies.userId || bodyUserId;
    let user = null;

    if (userId) {
      user = await prisma.user.findUnique({ where: { id: userId } });
    }

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: 'anon',
          email: `anon+${Date.now()}@local`,
          passwordHash: '',
        },
      });
      userId = user.id;
      res.cookie('userId', userId, {
        httpOnly: true,
        signed: true,
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year
      });
    }

    await prisma.vote.create({
      data: { userId: userId!, pollId, pollOptionId },
    });

    auditLog(req, 'VOTE_CAST', {
      pollId,
      pollOptionId,
      userId: userId!,
    });

    res.status(201).json({ status: 'ok', userId: userId! });
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return res.status(409).json({ error: 'already voted' });
    }
    next(err);
  }
});

// --- Error handling ---
app.use((err: any, req: express.Request, res: express.Response, _next: any) => {
  const correlationId = (req as any).correlationId;
  req.log?.error({ err, correlationId }, 'Unhandled error');

  if (err?.name === 'ZodError') {
    return res.status(400).type('application/problem+json').json({
      type: 'https://example.com/problems/validation-error',
      title: 'Invalid request body',
      status: 400,
      detail: err.errors,
      correlationId,
    });
  }

  if (typeof err?.status === 'number') {
    return res
      .status(err.status)
      .type('application/problem+json')
      .json({
        type: 'about:blank',
        title: err.message || 'Request failed',
        status: err.status,
        correlationId,
      });
  }

  return res.status(500).type('application/problem+json').json({
    type: 'about:blank',
    title: 'Internal Server Error',
    status: 500,
    correlationId,
  });
});

export default app;
