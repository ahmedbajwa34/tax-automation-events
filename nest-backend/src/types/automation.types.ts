export type AutomationStatus = 'completed' | 'failed';

export interface AutomationStartPayload {
  returnId: number;
  taxYear: string;
  returnType: 'individual' | 'business';
}

export interface AutomationStartAck {
  ok: boolean;
  runId: string;
  error?: string;
}

interface FormStatusBase {
  runId: string;
  form: string;
  ref: Record<string, string | number>;
  timestamp: string;
}

export type FormStatusPayload =
  | (FormStatusBase & { status: 'started'; startedAt: string })
  | (FormStatusBase & { status: 'in_progress'; detail: string | null })
  | (FormStatusBase & {
      status: 'completed';
      startedAt: string;
      endedAt: string;
      durationSec: number;
    })
  | (FormStatusBase & { status: 'failed'; error: string });

export interface AutomationEndPayload {
  runId: string;
  status: AutomationStatus;
  timestamp: string;
}

export interface Ack {
  ok: boolean;
  error?: string;
}