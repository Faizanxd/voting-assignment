// server-side sketch (Node / Express + Prisma) - put into src/app.ts or your controller file
import express from 'express';
import bodyParser from 'body-parser';
import { PrismaClient } from '@prisma/client';
import cuid from 'cuid'; // optional: or use crypto

const prisma = new PrismaClient();
const app = express();
app.use(bodyParser.json());

// Create poll: if creatorId missing, create a lightweight user and use its id
app.post('/api/polls', async (req, res) => {
  const { question, options = [], creatorId } = req.body;
  try {
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
        creatorId: creator.id,
        options: { create: options.map((text: string) => ({ text })) },
      },
      include: { options: true },
    });
    res.status(201).json(poll);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Cast vote: if userId missing, create lightweight user and use it
app.post('/api/polls/:id/votes', async (req, res) => {
  const { userId: incomingUserId, pollOptionId } = req.body;
  const pollId = req.params.id;
  try {
    const user = incomingUserId
      ? await prisma.user.findUnique({ where: { id: incomingUserId } })
      : await prisma.user.create({
          data: {
            name: 'anon',
            email: `anon+${Date.now()}@local`,
            passwordHash: '',
          },
        });

    // call your VoteService / logic here; example:
    // await voteService.castVote({ userId: user.id, pollId, pollOptionId });
    // for placeholder:
    await prisma.vote.create({
      data: { userId: user.id, pollId, pollOptionId },
    });

    res.status(201).json({ status: 'ok', userId: user.id });
  } catch (err: any) {
    if (err?.code === 'P2002')
      return res.status(409).json({ error: 'already voted' });
    res.status(500).json({ error: String(err) });
  }
});
