// src/server.ts
import http from 'http';
import { AddressInfo } from 'net';
import { Server as SocketIOServer } from 'socket.io';
import app, { wsConnectionsGauge, wsBroadcastsTotal } from './app';

export async function startServer(): Promise<{
  server: http.Server;
  port: number;
  io: SocketIOServer;
}> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    const io = new SocketIOServer(server, {
      cors: { origin: '*', methods: ['GET', 'POST'] },
    });

    io.on('connection', (socket) => {
      wsConnectionsGauge.inc();

      socket.on('joinPoll', (pollId: string) => {
        socket.join(`poll_${pollId}`);
      });

      socket.on('disconnect', () => {
        wsConnectionsGauge.dec();
      });
    });

    // Broadcast helper with metric
    (io as any).emitVoteCast = (pollId: string, payload: any) => {
      io.to(`poll_${pollId}`).emit('voteCast', payload);
      io.emit('voteCast', payload);
      wsBroadcastsTotal.inc({ pollId });
    };

    server.listen(0, () => {
      const address = server.address() as AddressInfo;
      if (!address || !address.port) {
        reject(new Error('Failed to start server'));
        return;
      }
      resolve({ server, port: address.port, io });
    });

    server.on('error', (err) => reject(err));
  });
}

export async function stopServer(
  handle:
    | { server: http.Server; io?: SocketIOServer }
    | { server: http.Server; port?: number },
) {
  return new Promise<void>((resolve, reject) => {
    try {
      const server: http.Server = (handle as any).server ?? (handle as any);
      const io: SocketIOServer | undefined = (handle as any).io;
      if (io) {
        io.removeAllListeners();
        try {
          io.close();
        } catch (e) {}
      }
      server.close((err) => {
        if (err) return reject(err);
        resolve();
      });
    } catch (err) {
      reject(err);
    }
  });
}

let _lastIo: SocketIOServer | null = null;
export function setIo(io: SocketIOServer) {
  _lastIo = io;
}
export function getIo(): SocketIOServer {
  if (!_lastIo)
    throw new Error('io not set; call startServer first and capture the io');
  return _lastIo;
}
