import {
  WebSocketGateway, OnGatewayConnection, OnGatewayDisconnect,
  WebSocketServer, SubscribeMessage, MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { safe } from '../types/safe-handler.js';
import { validateDto } from '../utils/validate.js';
import { FormEventDto, RunEventDto } from '../dto/automation.dto.js';

@WebSocketGateway({ cors: true })
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;


handleConnection(client: Socket) {
  console.log(`Python connected: ${client.id}`);
}

handleDisconnect(client: Socket) {
  console.log(`Python disconnected: ${client.id}`);
}

sendReturn(payload: object): number {
  this.server.emit('return:submitted', payload);
  return this.server.sockets.sockets.size;
}

  @SubscribeMessage('automation:started')
  onRunStart(@MessageBody() body: unknown) {
    return safe('automation:started', () => {
      const b = validateDto(RunEventDto, body);
      console.log(`[client ${b.clientId} | return ${b.returnId}] automation STARTED`);
      return { ok: true };
    });
  }

  @SubscribeMessage('form:started')
  onFormStart(@MessageBody() body: unknown) {
    return safe('form:started', () => {
      const b = validateDto(FormEventDto, body);
      console.log(`[return ${b.returnId}] ${b.form} (${b.ref}) STARTED at ${b.startedAt}`);
      return { ok: true };
    });
  }

  @SubscribeMessage('form:in_progress')
  onFormProgress(@MessageBody() body: unknown) {
    return safe('form:in_progress', () => {
      const b = validateDto(FormEventDto, body);
      console.log(`[return ${b.returnId}] ${b.form} (${b.ref}) IN PROGRESS`);
      return { ok: true };
    });
  }

  @SubscribeMessage('form:completed')
  onFormDone(@MessageBody() body: unknown) {
    return safe('form:completed', () => {
      const b = validateDto(FormEventDto, body);
      console.log(`[return ${b.returnId}] ${b.form} (${b.ref}) COMPLETED in ${b.durationSec}s`);
      return { ok: true };
    });
  }

  @SubscribeMessage('form:failed')
  onFormFail(@MessageBody() body: unknown) {
    return safe('form:failed', () => {
      const b = validateDto(FormEventDto, body);
      console.log(`[return ${b.returnId}] ${b.form} (${b.ref}) FAILED: ${b.error}`);
      return { ok: true };
    });
  }

  @SubscribeMessage('automation:completed')
  onRunEnd(@MessageBody() body: unknown) {
    return safe('automation:completed', () => {
      const b = validateDto(RunEventDto, body);
      console.log(`[client ${b.clientId} | return ${b.returnId}] automation COMPLETED`);
      return { ok: true };
    });
  }
}