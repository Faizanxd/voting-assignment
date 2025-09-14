import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { PrismaUserRepository } from './infrastructure/repositories/prisma-user-repository';
import { PrismaPollRepository } from './infrastructure/repositories/prisma-poll-repository';
import { PrismaVoteRepository } from './infrastructure/repositories/prisma-vote-repository';
import { PollGateway } from './interface/ws/poll-gateway';
import { SimpleEventBus } from './infrastructure/events/simple-event-bus';
import { VoteService } from './application/services/vote-service';
import path from 'path';
const prisma = new PrismaClient();
const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, { cors: { origin: '*' } });

app.use(express.json());

// Event bus
const eventBus = new SimpleEventBus();

// WebSocket gateway
const pollGateway = new PollGateway(io);
pollGateway.init();

// Repositories
const userRepo = new PrismaUserRepository(prisma);
const pollRepo = new PrismaPollRepository(prisma);
const voteRepo = new PrismaVoteRepository(prisma);

// Services
const voteService = new VoteService(voteRepo, pollRepo, eventBus);

// Subscribe gateway to VoteCastEvent
eventBus.subscribe('VoteCastEvent', (event) =>
  pollGateway.broadcastResults(event),
);

// Example route to cast a vote
app.post('/api/polls/:pollId/votes', async (req, res, next) => {
  try {
    await voteService.castVote({
      userId: req.body.userId,
      pollId: req.params.pollId,
      pollOptionId: req.body.pollOptionId,
    });
    res.status(201).json({ status: 'ok' });
  } catch (err) {
    next(err);
  }
});
app.use((err, req, res, next) => {
  console.error('❌ Vote error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

app.use(express.static(path.join(__dirname, '../public')));
server.listen(3000, () => console.log('Server running on port 3000'));
