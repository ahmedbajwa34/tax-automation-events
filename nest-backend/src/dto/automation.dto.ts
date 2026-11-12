


import {
  IsIn, IsInt, IsISO8601, IsNotEmpty, IsNumber,
  IsObject, IsOptional, IsString, IsUUID, ValidateIf,
} from 'class-validator';

export class AutomationStartDto {
  @IsUUID() eventId: string;
  @IsInt() returnId: number;
  @IsString() @IsNotEmpty() taxYear: string;
  @IsIn(['individual', 'business']) returnType: 'individual' | 'business';
}

export class FormStatusDto {
  @IsUUID() eventId: string;
  @IsUUID() runId: string;
  @IsString() @IsNotEmpty() form: string;
  @IsObject() ref: Record<string, string | number>;
  @IsIn(['started', 'in_progress', 'completed', 'failed'])
  status: 'started' | 'in_progress' | 'completed' | 'failed';
  @IsISO8601() timestamp: string;

  @ValidateIf((o) => o.status === 'started' || o.status === 'completed')
  @IsISO8601() startedAt?: string;

  @ValidateIf((o) => o.status === 'completed')
  @IsISO8601() endedAt?: string;

  @ValidateIf((o) => o.status === 'completed')
  @IsNumber() durationSec?: number;

  @IsOptional() @IsString() detail?: string | null;

  @ValidateIf((o) => o.status === 'failed')
  @IsString() error?: string;
}

export class AutomationEndDto {
  @IsUUID() eventId: string;
  @IsUUID() runId: string;
  @IsIn(['completed', 'failed']) status: 'completed' | 'failed';
  @IsISO8601() timestamp: string;
}