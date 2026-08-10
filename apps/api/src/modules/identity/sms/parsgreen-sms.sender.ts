import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthErrorCodes } from '@vdb/shared-types';
import { DomainException } from '../../../common/errors/domain.exception';
import type { SmsSender } from './sms-sender';

/**
 * Parsgreen REST SMS (Apiv2).
 * @see https://sms.parsgreen.ir — Authorization: `basic apikey:{token}`
 * SendOtp: POST /Apiv2/Message/SendOtp { Mobile, SmsCode, AddName }
 */
@Injectable()
export class ParsgreenSmsSender implements SmsSender {
  private readonly logger = new Logger(ParsgreenSmsSender.name);

  constructor(private readonly config: ConfigService) {}

  async sendOtp(mobile: string, code: string): Promise<void> {
    const token = this.requireToken();
    const base = this.baseUrl();
    const addName = this.config.get<boolean>('PARSGREEN_ADD_NAME') ?? true;
    const body = {
      Mobile: toLocalIranMobile(mobile),
      SmsCode: code,
      AddName: addName,
    };
    await this.postJson(`${base}/Apiv2/Message/SendOtp`, token, body);
  }

  async sendTransactional(mobile: string, text: string): Promise<void> {
    const token = this.requireToken();
    const base = this.baseUrl();
    const body = {
      Mobile: toLocalIranMobile(mobile),
      SmsBody: text,
    };
    await this.postJson(`${base}/Apiv2/Message/SendSms`, token, body);
  }

  private requireToken(): string {
    const token = String(
      this.config.get<string>('PARSGREEN_API_TOKEN') ?? '',
    ).trim();
    if (!token) {
      throw new DomainException(
        AuthErrorCodes.SmsMisconfigured,
        'PARSGREEN_API_TOKEN is empty — set token and restart API',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return token;
  }

  private baseUrl(): string {
    return String(
      this.config.get<string>('PARSGREEN_BASE_URL') ??
        'https://sms.parsgreen.ir',
    ).replace(/\/$/, '');
  }

  private async postJson(
    url: string,
    token: string,
    body: Record<string, unknown>,
  ): Promise<void> {
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `basic apikey:${token}`,
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      this.logger.error(`Parsgreen network error: ${(err as Error).message}`);
      throw new DomainException(
        AuthErrorCodes.SmsSendFailed,
        'SMS provider unreachable',
        HttpStatus.BAD_GATEWAY,
      );
    }

    const rawText = await response.text();
    let parsed: Record<string, unknown> = {};
    try {
      parsed = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : {};
    } catch {
      parsed = {};
    }

    const success =
      response.ok &&
      (parsed.R_Success === true ||
        parsed.R_Success === 'true' ||
        parsed.R_Code === 1 ||
        parsed.R_Code === '1' ||
        (parsed.R_Success === undefined &&
          parsed.R_Code === undefined &&
          response.status < 300));

    if (!success) {
      const code = parsed.R_Code ?? response.status;
      this.logger.warn(`Parsgreen send failed code=${String(code)}`);
      throw new DomainException(
        AuthErrorCodes.SmsSendFailed,
        'SMS send failed',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}

/** E.164 +98… → 09… for Parsgreen. */
export function toLocalIranMobile(e164: string): string {
  const digits = e164.replace(/\D/g, '');
  if (digits.startsWith('98') && digits.length === 12) {
    return `0${digits.slice(2)}`;
  }
  if (digits.startsWith('9') && digits.length === 10) {
    return `0${digits}`;
  }
  if (digits.startsWith('09') && digits.length === 11) {
    return digits;
  }
  return e164;
}
