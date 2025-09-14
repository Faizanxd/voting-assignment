import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

import { PrismaUserRepository } from './infrastructure/repositories/prisma-user-repository';
import { PrismaPollRepository } from './infrastructure/repositories/prisma-poll-repository';
import { PrismaVoteRepository } from './infrastructure/repositories/prisma-vote-repository';
import { PollGateway } from './interface/ws/poll-gateway';
import { SimpleEventBus } from './infrastructure/events/simple-event-bus';

import { UserService } from './application/services/user-service';
import { PollService } from './application/services/poll-service';
import { VoteService } from './application/services/vote-service';

import { userRoutes } from './interface/http/routes/user-routes';
import { pollRoutes } from './interface/http/routes/poll-routes';
import { voteRoutes } from './interface/http/routes/vote-routes';

import { UserController } from './interface/http/controllers/user-controller';
import { PollController } from './interface/http/controllers/poll-controller';
import { VoteController } from './interface/http/controllers/vote-controller';

// --- Setup ---
const prisma = new PrismaClient();
const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, { cors: { origin: '*' } });

app.use(express.json());

// --- Event bus & WebSocket gateway ---
const eventBus = new SimpleEventBus();
const pollGateway = new PollGateway(io);
pollGateway.init();

// --- Repositories ---
const userRepo = new PrismaUserRepository(prisma);
const pollRepo = new PrismaPollRepository(prisma);
const voteRepo = new PrismaVoteRepository(prisma);

// --- Services ---
const userService = new UserService(userRepo);
const pollService = new PollService(pollRepo);
const voteService = new VoteService(voteRepo, pollRepo, eventBus);

// Subscribe gateway to VoteCastEvent
eventBus.subscribe('VoteCastEvent', (event) =>
  pollGateway.broadcastResults(event),
);

// --- Controllers ---
const userController = new UserController(userService);
const pollController = new PollController(pollService, voteRepo);
const voteController = new VoteController(voteService);

// --- Routes ---
app.use('/api/users', userRoutes(userController));
app.use('/api/polls', pollRoutes(pollController));
app.use('/api/polls/:pollId/votes', voteRoutes(voteController));

// --- Serve static files ---
app.use(express.static(path.join(__dirname, '../public')));

// --- Swagger docs ---
const swaggerDocument = YAML.load(path.join(__dirname, '../docs/openapi.yaml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// --- Error handler ---
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// --- Start server ---
server.listen(3000, () => console.log('Server running on port 3000'));
