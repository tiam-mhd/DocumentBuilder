export const SMS_SENDER = Symbol('SMS_SENDER');

export interface SmsSender {
  sendOtp(mobile: string, code: string): Promise<void>;
}
