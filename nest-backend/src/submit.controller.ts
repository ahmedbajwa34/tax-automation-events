

import { Controller, Post, Query } from '@nestjs/common';
import { WebsocketGateway } from './websocket/websocket.gateway.js';
import { safe } from './types/safe-handler.js';
import { validateDto } from './utils/validate.js';
import { ReturnPayloadDto } from './dto/automation.dto.js';
import { readFileSync } from 'fs';
import { join } from 'path';


const DUMMY = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'dummy', 'job.json'), 'utf-8'),
);
@Controller()
export class SubmitController {
  constructor(private readonly gateway: WebsocketGateway) {}

  // POST /submit?clientId=1054&returnId=962  (both optional)
@Post('individual-return-details')
submit(
  @Query('clientId') clientId?: string,
  @Query('returnId') returnId?: string,
  @Query('userId') userId?: string,
  @Query('returnType') returnType?: string,
  @Query('fromPortal') fromPortal?: string,
) {
  return safe('submit', () => {
    const payload = validateDto(
      ReturnPayloadDto,
      {
        ...DUMMY,
        clientId: clientId ? Number(clientId) : 1697,
        returnId: returnId ? Number(returnId) : DUMMY.returnId,
        userId: userId ? Number(userId) : 613,
        returnType: returnType ?? 'individual',
        fromPortal: fromPortal === 'true',
      },
      false,
    );
   const delivered = this.gateway.sendReturn(payload);
    if (delivered === 0) throw new Error('No Python client connected');
    return { ok: true, clientId: payload.clientId, returnId: payload.returnId };
    });
  }
}