import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import Client from 'socket.io-client';
import express from 'express';
import { PollGateway } from '../../src/interface/ws/poll-gateway';
import { SimpleEventBus } from '../../src/infrastructure/events/simple-event-bus';
import { VoteCastEvent } from '../../src/application/events/vote-cast-event';

let io: SocketIOServer;
let server: any;
let client1: any;
let client2: any;
let gateway: PollGateway;

beforeAll((done) => {
  const app = express();
  server = createServer(app);
  io = new SocketIOServer(server, { cors: { origin: '*' } });
  gateway = new PollGateway(io);
  gateway.init();

  server.listen(() => {
    const port = (server.address() as any).port;
    client1 = Client(`http://localhost:${port}/polls`);
    client2 = Client(`http://localhost:${port}/polls`);
    let connected = 0;
    [client1, client2].forEach((c) =>
      c.on('connect', () => {
        connected++;
        if (connected === 2) done();
      }),
    );
  });
});

afterAll(() => {
  client1.close();
  client2.close();
  io.close();
  server.close();
});

test('clients in same poll room receive broadcast', (done) => {
  const pollId = 'poll123';
  const results = [{ optionId: 'opt1', count: 1 }];

  let received = 0;
  const handler = (data: any) => {
    expect(data.pollId).toBe(pollId);
    expect(data.results).toEqual(results);
    received++;
    if (received === 2) done();
  };

  client1.on('poll_results', handler);
  client2.on('poll_results', handler);

  let joinedCount = 0;
  const onJoined = () => {
    joinedCount++;
    if (joinedCount === 2) {
      // Both clients have joined, now broadcast
      gateway.broadcastResults(new VoteCastEvent(pollId, results));
    }
  };

  client1.on('joined', onJoined);
  client2.on('joined', onJoined);

  client1.emit('join_poll', { pollId });
  client2.emit('join_poll', { pollId });
}, 10000); // 10s timeout
