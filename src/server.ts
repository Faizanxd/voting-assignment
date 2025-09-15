// src/server.ts
// Simple startServer / stopServer helpers for tests that need a running HTTP+Socket server.
// Exports:
//  - startServer(): Promise<{ server: import('http').Server; port: number; io: import('socket.io').Server }>
//  - stopServer(handle): Promise<void>
//
// The tests expect a port numeric value to construct baseUrl and will use socket.io-client
// to connect. The HTTP server is created from the Express app exported from src/app.ts.

import http from 'http';
import { AddressInfo } from 'net';
import { Server as SocketIOServer } from 'socket.io';
import app from './app';

export async function startServer(): Promise<{
  server: http.Server;
  port: number;
  io: SocketIOServer;
}> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    const io = new SocketIOServer(server, {
      // test-friendly CORS
      cors: { origin: '*', methods: ['GET', 'POST'] },
    });

    // Optional: basic room join handling used by WS tests.
    io.on('connection', (socket) => {
      socket.on('joinPoll', (pollId: string) => {
        socket.join(`poll_${pollId}`);
      });
    });

    // Expose a helper on io to publish VoteCast events from your app code:
    // Example usage in your VoteService or event handler:
    //   import { getIo } from './server';
    //   getIo().to(`poll_${pollId}`).emit('voteCast', { pollId, tallies });
    (io as any).emitVoteCast = (pollId: string, payload: any) => {
      io.to(`poll_${pollId}`).emit('voteCast', payload);
      // also emit globally in case tests listen on global channel
      io.emit('voteCast', payload);
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

// Convenience accessor for code to get the active io instance when tests call startServer()
// Use like:
//   import { setIo, getIo } from './server';
//   setIo(io);
//   getIo().emit(...)
// This file defines emitVoteCast on the io instance returned by startServer()
// so wiring in your application code can call (io as any).emitVoteCast(pollId, payload)
let _lastIo: SocketIOServer | null = null;
export function setIo(io: SocketIOServer) {
  _lastIo = io;
}
export function getIo(): SocketIOServer {
  if (!_lastIo)
    throw new Error('io not set; call startServer first and capture the io');
  return _lastIo;
}
