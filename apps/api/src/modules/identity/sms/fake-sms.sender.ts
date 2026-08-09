import { Injectable, Logger } from '@nestjs/common';
import { SmsSender } from './sms-sender';

/**
 * Dev/test SMS: never logs the raw OTP. Tests can read lastCode via getter.
 */
@Injectable()
export class FakeSmsSender implements SmsSender {
  private readonly logger = new Logger(FakeSmsSender.name);
  private last: { mobile: string; code: string } | null = null;

  async sendOtp(mobile: string, code: string): Promise<void> {
    this.last = { mobile, code };
    this.logger.log(`OTP queued for ${mobile} (fake SMS; code not logged)`);
  }

  /** Test-only helper — do not expose via HTTP. */
  getLastOtp(): { mobile: string; code: string } | null {
    return this.last;
  }

  clear(): void {
    this.last = null;
  }
}
