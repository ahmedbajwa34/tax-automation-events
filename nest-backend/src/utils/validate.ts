



import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

export function validateDto<T extends object>(cls: new () => T, data: unknown): T {
  const obj = plainToInstance(cls, data);
  const errors = validateSync(obj, { whitelist: true, forbidNonWhitelisted: true });
  if (errors.length) {
    const msg = errors
      .map((e) => Object.values(e.constraints ?? {}).join(', '))
      .join('; ');
    throw new Error(`Invalid payload: ${msg}`);
  }
  return obj;
}