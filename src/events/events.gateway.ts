import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/ws/jobs',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private clients = new Map<string, Set<string>>();

  handleConnection(client: Socket) {
    const jobId = client.handshake.query.jobId as string;
    if (jobId) {
      if (!this.clients.has(jobId)) this.clients.set(jobId, new Set());
      this.clients.get(jobId)!.add(client.id);
      client.join(`job:${jobId}`);
    }
  }

  handleDisconnect(client: Socket) {
    for (const [, sockets] of this.clients) sockets.delete(client.id);
  }

  emitJobUpdate(jobId: string, event: string, data: any) {
    this.server.to(`job:${jobId}`).emit(event, { jobId, ...data });
  }
}
