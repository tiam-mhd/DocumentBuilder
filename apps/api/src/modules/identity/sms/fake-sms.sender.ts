import { Injectable, Logger } from '@nestjs/common';
import { SmsSender } from './sms-sender';

/**
 * Dev/test SMS: never logs the raw OTP. Tests can read lastCode via getter.
 */
@Injectable()
export class FakeSmsSender implements SmsSender {
  private readonly logger = new Logger(FakeSmsSender.name);
  private last: { mobile: string; code: string } | null = null;
  private lastTransactional: { mobile: string; body: string } | null = null;
  private transactionalLog: Array<{ mobile: string; body: string }> = [];

  async sendOtp(mobile: string, code: string): Promise<void> {
    this.last = { mobile, code };
    this.logger.log(`OTP queued for ${mobile} (fake SMS; code not logged)`);
  }

  async sendTransactional(mobile: string, body: string): Promise<void> {
    const entry = { mobile, body };
    this.lastTransactional = entry;
    this.transactionalLog.push(entry);
    this.logger.log(
      `Transactional SMS queued for ${mobile} (fake; body length=${body.length})`,
    );
  }

  /** Test-only helper — do not expose via HTTP. */
  getLastOtp(): { mobile: string; code: string } | null {
    return this.last;
  }

  getLastTransactional(): { mobile: string; body: string } | null {
    return this.lastTransactional;
  }

  getTransactionalLog(): Array<{ mobile: string; body: string }> {
    return [...this.transactionalLog];
  }

  clear(): void {
    this.last = null;
    this.lastTransactional = null;
    this.transactionalLog = [];
  }
}
