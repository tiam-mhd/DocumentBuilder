export const SMS_SENDER = Symbol('SMS_SENDER');

export interface SmsSender {
  sendOtp(mobile: string, code: string): Promise<void>;
  /** Non-OTP transactional text (dunning, alerts). Never include secrets. */
  sendTransactional(mobile: string, body: string): Promise<void>;
}
