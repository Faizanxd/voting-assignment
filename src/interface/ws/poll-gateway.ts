import { Server as SocketIOServer, Socket } from 'socket.io';
import { VoteCastEvent } from '../../application/events/vote-cast-event';

export class PollGateway {
  constructor(private io: SocketIOServer) {}
  // src/interface/ws/poll-gateway.ts
  init() {
    const nsp = this.io.of('/polls');

    nsp.on('connection', (socket) => {
      socket.on('join_poll', ({ pollId }) => {
        socket.join(`poll:${pollId}`);
        socket.emit('joined', { pollId }); // ACK back to client
      });

      socket.on('leave_poll', ({ pollId }) => {
        socket.leave(`poll:${pollId}`);
      });
    });
  }

  broadcastResults(event: VoteCastEvent) {
    this.io.of('/polls').to(`poll:${event.pollId}`).emit('poll_results', {
      pollId: event.pollId,
      results: event.results,
    });
  }

  broadcastError(pollId: string, message: string) {
    this.io.of('/polls').to(`poll:${pollId}`).emit('poll_error', { message });
  }
}
