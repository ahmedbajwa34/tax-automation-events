import {
  WebSocketGateway, OnGatewayConnection, OnGatewayDisconnect,
  WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { randomUUID } from 'crypto';
import { safe } from '../types/safe-handler.js';
import { validateDto } from '../utils/validate.js';
import {
  AutomationStartDto,
  FormStatusDto,
  AutomationEndDto,
} from '../dto/automation.dto.js';

@WebSocketGateway({ cors: true })
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private runs = new Map<string, string>();        
  private processed = new Map<string, unknown>();  

  private once<T>(eventId: string, fn: () => T): T {
    if (this.processed.has(eventId)) {
      return this.processed.get(eventId) as T;
    }
    const res = fn();
    this.processed.set(eventId, res);
    if (this.processed.size > 5000) {
      const oldest = this.processed.keys().next().value;
      if (oldest) this.processed.delete(oldest);
    }
    return res;
  }

  handleConnection(client: Socket): void {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    const runId = this.runs.get(client.id);
    if (runId) {
      console.log(`[${runId}] interrupted (client disconnected)`);
      this.runs.delete(client.id);
    }
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('automation:start')
  onStart(@ConnectedSocket() client: Socket, @MessageBody() body: unknown) {
    return safe('automation:start', () => {
      const b = validateDto(AutomationStartDto, body);
      return this.once(b.eventId, () => {
        const runId = randomUUID();
        this.runs.set(client.id, runId);
        console.log(`[${runId}] started: return=${b.returnId} year=${b.taxYear} type=${b.returnType}`);
        return { ok: true, runId };
      });
    });
  }

  @SubscribeMessage('form:status')
  onFormStatus(@MessageBody() body: unknown) {
    return safe('form:status', () => {
      const b = validateDto(FormStatusDto, body);
      return this.once(b.eventId, () => {
        const time = new Date(b.timestamp).toLocaleTimeString();
        const label = Object.entries(b.ref).map(([k, v]) => `${k}=${v}`).join(', ');
        const prefix = `[${b.runId}] ${time} - Form ${b.form} (${label})`;

        switch (b.status) {
          case 'started':
            console.log(`${prefix} started`);
            break;
          case 'in_progress':
            console.log(`${prefix} in progress${b.detail ? `: ${b.detail}` : ''}`);
            break;
          case 'completed':
            console.log(`${prefix} completed (took ${b.durationSec}s)`);
            break;
          case 'failed':
            console.log(`${prefix} failed: ${b.error}`);
            break;
        }
        return { ok: true };
      });
    });
  }

  @SubscribeMessage('automation:end')
  onEnd(@ConnectedSocket() client: Socket, @MessageBody() body: unknown) {
    return safe('automation:end', () => {
      const b = validateDto(AutomationEndDto, body);
      return this.once(b.eventId, () => {
        const time = new Date(b.timestamp).toLocaleTimeString();
        console.log(`[${b.runId}] ${time} - Automation finished: ${b.status}`);
        this.runs.delete(client.id);
        return { ok: true };
      });
    });
  }
}