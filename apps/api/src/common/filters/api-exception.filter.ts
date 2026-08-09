import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { DomainException } from '../errors/domain.exception';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof DomainException) {
      const body = exception.getResponse() as { code: string; message: string };
      response.status(exception.getStatus()).json({
        errors: [{ code: body.code, message: body.message }],
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();
      let code = 'HTTP_ERROR';
      let message = exception.message;

      if (typeof raw === 'string') {
        message = raw;
      } else if (raw && typeof raw === 'object') {
        const obj = raw as Record<string, unknown>;
        if (typeof obj.code === 'string') code = obj.code;
        if (typeof obj.message === 'string') message = obj.message;
        else if (Array.isArray(obj.message)) message = obj.message.join(', ');
      }

      response.status(status).json({
        errors: [{ code, message }],
      });
      return;
    }

    this.logger.error(
      exception instanceof Error ? exception.stack : String(exception),
    );
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      errors: [{ code: 'INTERNAL_ERROR', message: 'Internal server error' }],
    });
  }
}
