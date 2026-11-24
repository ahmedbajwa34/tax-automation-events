import {
  IsArray, IsDefined, IsInt, IsISO8601, IsNotEmpty,
  IsNumber, IsObject, IsOptional, IsString, IsIn, IsBoolean
} from 'class-validator';

// Nest -> Python
export class ReturnPayloadDto {
  @IsInt() clientId: number;
  @IsInt() returnId: number;
  @IsInt() userId: number;
  @IsIn(['individual', 'business']) returnType: 'individual' | 'business';
  @IsBoolean() fromPortal: boolean;
  @IsOptional() @IsObject() mis?: Record<string, unknown>;
  @IsOptional() @IsArray() w2?: Record<string, unknown>[];
  @IsOptional() @IsArray() f1099c?: Record<string, unknown>[];
}

// Python -> Nest
export class RunEventDto {
  @IsInt() clientId: number;
  @IsInt() returnId: number;
  @IsInt() userId: number;
  @IsIn(['individual', 'business']) returnType: 'individual' | 'business';
  @IsString() @IsNotEmpty() taxYear: string;
}

export class FormEventDto extends RunEventDto {
  @IsString() @IsNotEmpty() form: string;
  @IsDefined() ref: string | number;
  @IsOptional() @IsISO8601() startedAt?: string;
  @IsOptional() @IsNumber() durationSec?: number;
  @IsOptional() @IsString() error?: string;
}