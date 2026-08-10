'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  fetchLoginOptions,
  loginWithPassword,
  requestOtp,
  verifyOtp,
  verifyTwoFactor,
  type PasswordLoginResult,
  type RequestOtpResult,
  type VerifyOtpResult,
} from '@/shared/api/auth';
import { ApiClientError, mapApiErrorCode } from '@/shared/api/client';
import { useAuth } from '@/shared/lib/auth-context';
import styles from './auth-forms.module.css';

export const PENDING_MOBILE_KEY = 'vdb_otp_mobile';
export const PENDING_DEV_CODE_KEY = 'vdb_otp_dev_code';

type Step = 'mobile' | 'method' | 'password' | 'otp';
type Direction = 1 | -1;

type OptionsState = {
  hasPassword: boolean;
  twoFactorEnabled: boolean;
  methods: Array<'otp' | 'password'>;
};

function isSessionResult(
  data: PasswordLoginResult,
): data is VerifyOtpResult {
  return 'accessToken' in data && Boolean(data.accessToken);
}

export function LoginWizard({ locale }: { locale: string }) {
  const t = useTranslations('auth');
  const tErrors = useTranslations('errors');
  const router = useRouter();
  const { setSession } = useAuth();

  const [step, setStep] = useState<Step>('mobile');
  const [direction, setDirection] = useState<Direction>(1);
  const [animKey, setAnimKey] = useState(0);
  const [mobileInput, setMobileInput] = useState('');
  const [mobile, setMobile] = useState('');
  const [options, setOptions] = useState<OptionsState | null>(null);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [otpMode, setOtpMode] = useState<'login' | '2fa'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  function goTo(next: Step, dir: Direction) {
    setDirection(dir);
    setAnimKey((k) => k + 1);
    setStep(next);
    setError(null);
  }

  function startCooldown(seconds: number) {
    setCooldownLeft(seconds);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldownLeft((s) => {
        if (s <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  function applyOtpMeta(result: RequestOtpResult | { devCode?: string; cooldownSeconds: number }) {
    if ('devCode' in result && result.devCode) {
      setDevCode(result.devCode);
      sessionStorage.setItem(PENDING_DEV_CODE_KEY, result.devCode);
    } else {
      setDevCode(null);
      sessionStorage.removeItem(PENDING_DEV_CODE_KEY);
    }
    startCooldown(result.cooldownSeconds);
  }

  function finishSession(result: VerifyOtpResult) {
    sessionStorage.removeItem(PENDING_MOBILE_KEY);
    sessionStorage.removeItem(PENDING_DEV_CODE_KEY);
    setSession(result.accessToken, result.expiresInSeconds, result.user);
    router.replace(`/${locale}/app`);
  }

  function mapErr(err: unknown) {
    const code = err instanceof ApiClientError ? err.code : 'UNKNOWN';
    setError(mapApiErrorCode(code, tErrors));
  }

  async function onMobileSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const opts = await fetchLoginOptions(mobileInput.trim());
      setMobile(opts.mobile);
      sessionStorage.setItem(PENDING_MOBILE_KEY, opts.mobile);
      setOptions({
        hasPassword: opts.hasPassword,
        twoFactorEnabled: opts.twoFactorEnabled,
        methods: opts.methods,
      });
      if (opts.methods.includes('password')) {
        goTo('method', 1);
      } else {
        const otp = await requestOtp(opts.mobile);
        applyOtpMeta(otp);
        setOtpMode('login');
        setChallengeToken(null);
        goTo('otp', 1);
      }
    } catch (err) {
      mapErr(err);
    } finally {
      setLoading(false);
    }
  }

  async function chooseOtp() {
    setLoading(true);
    setError(null);
    try {
      const otp = await requestOtp(mobile);
      applyOtpMeta(otp);
      setOtpMode('login');
      setChallengeToken(null);
      goTo('otp', 1);
    } catch (err) {
      mapErr(err);
    } finally {
      setLoading(false);
    }
  }

  function choosePassword() {
    setPassword('');
    goTo('password', 1);
  }

  async function onPasswordSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await loginWithPassword(mobile, password);
      if (isSessionResult(result)) {
        finishSession(result);
        return;
      }
      applyOtpMeta(result);
      setChallengeToken(result.challengeToken);
      setOtpMode('2fa');
      setCode('');
      goTo('otp', 1);
    } catch (err) {
      mapErr(err);
    } finally {
      setLoading(false);
    }
  }

  async function onOtpSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (otpMode === '2fa' && challengeToken) {
        finishSession(await verifyTwoFactor(challengeToken, code.trim()));
      } else {
        finishSession(await verifyOtp(mobile, code.trim()));
      }
    } catch (err) {
      mapErr(err);
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    if (cooldownLeft > 0 || loading) return;
    setLoading(true);
    setError(null);
    try {
      if (otpMode === '2fa') {
        setError(t('resendViaPassword'));
        return;
      }
      const otp = await requestOtp(mobile);
      applyOtpMeta(otp);
      setCode('');
    } catch (err) {
      mapErr(err);
    } finally {
      setLoading(false);
    }
  }

  const panelClass = [
    styles.stepPanel,
    direction === 1 ? styles.enterForward : styles.enterBack,
  ].join(' ');

  return (
    <div className={styles.shell}>
      <div className={styles.atmosphere} aria-hidden />
      <div className={styles.card}>
        <div className={styles.progress} aria-hidden>
          <span
            className={styles.progressBar}
            style={{
              width:
                step === 'mobile'
                  ? '25%'
                  : step === 'method'
                    ? '50%'
                    : step === 'password'
                      ? '75%'
                      : '100%',
            }}
          />
        </div>

        <div key={`${step}-${animKey}`} className={panelClass}>
          {step === 'mobile' ? (
            <form className={styles.form} onSubmit={onMobileSubmit}>
              <p className={styles.eyebrow}>{t('brandEyebrow')}</p>
              <h1 className={styles.title}>{t('loginTitle')}</h1>
              <p className={styles.hint}>{t('loginHint')}</p>
              <label className={styles.field}>
                <span>{t('mobileLabel')}</span>
                <input
                  className={styles.input}
                  type="tel"
                  name="mobile"
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder={t('mobilePlaceholder')}
                  value={mobileInput}
                  onChange={(e) => setMobileInput(e.target.value)}
                  required
                  autoFocus
                />
              </label>
              {error ? <p className={styles.error}>{error}</p> : null}
              <button className={styles.submit} type="submit" disabled={loading}>
                {loading ? t('sending') : t('continue')}
              </button>
            </form>
          ) : null}

          {step === 'method' && options ? (
            <div className={styles.form}>
              <p className={styles.eyebrow}>{mobile}</p>
              <h1 className={styles.title}>{t('methodTitle')}</h1>
              <p className={styles.hint}>
                {options.twoFactorEnabled ? t('methodHint2fa') : t('methodHint')}
              </p>
              <div className={styles.methodGrid}>
                <button
                  type="button"
                  className={styles.methodCard}
                  onClick={() => void chooseOtp()}
                  disabled={loading}
                >
                  <span className={styles.methodTitle}>{t('methodOtp')}</span>
                  <span className={styles.methodDesc}>{t('methodOtpDesc')}</span>
                </button>
                <button
                  type="button"
                  className={styles.methodCard}
                  onClick={choosePassword}
                  disabled={loading}
                >
                  <span className={styles.methodTitle}>{t('methodPassword')}</span>
                  <span className={styles.methodDesc}>
                    {options.twoFactorEnabled
                      ? t('methodPassword2faDesc')
                      : t('methodPasswordDesc')}
                  </span>
                </button>
              </div>
              {error ? <p className={styles.error}>{error}</p> : null}
              <button
                type="button"
                className={styles.linkButton}
                onClick={() => goTo('mobile', -1)}
              >
                {t('changeMobile')}
              </button>
            </div>
          ) : null}

          {step === 'password' ? (
            <form className={styles.form} onSubmit={onPasswordSubmit}>
              <p className={styles.eyebrow}>{mobile}</p>
              <h1 className={styles.title}>{t('passwordTitle')}</h1>
              <p className={styles.hint}>
                {options?.twoFactorEnabled
                  ? t('passwordHint2fa')
                  : t('passwordHint')}
              </p>
              <label className={styles.field}>
                <span>{t('passwordLabel')}</span>
                <input
                  className={styles.input}
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoFocus
                />
              </label>
              {error ? <p className={styles.error}>{error}</p> : null}
              <button className={styles.submit} type="submit" disabled={loading}>
                {loading ? t('signingIn') : t('signIn')}
              </button>
              <button
                type="button"
                className={styles.linkButton}
                onClick={() => goTo('method', -1)}
              >
                {t('back')}
              </button>
            </form>
          ) : null}

          {step === 'otp' ? (
            <form className={styles.form} onSubmit={onOtpSubmit}>
              <p className={styles.eyebrow}>
                {otpMode === '2fa' ? t('twoFactorBadge') : t('otpBadge')}
              </p>
              <h1 className={styles.title}>
                {otpMode === '2fa' ? t('twoFactorTitle') : t('verifyTitle')}
              </h1>
              <p className={styles.hint}>
                {otpMode === '2fa'
                  ? t('twoFactorHint', { mobile })
                  : t('verifyHint', { mobile })}
              </p>
              {devCode ? (
                <p className={styles.devHint}>{t('devCode', { code: devCode })}</p>
              ) : null}
              <label className={styles.field}>
                <span>{t('codeLabel')}</span>
                <input
                  className={`${styles.input} ${styles.otpInput}`}
                  type="text"
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="\d{4,8}"
                  maxLength={8}
                  placeholder="••••••"
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/\D/g, '').slice(0, 8))
                  }
                  required
                  autoFocus
                />
              </label>
              {error ? <p className={styles.error}>{error}</p> : null}
              <button className={styles.submit} type="submit" disabled={loading}>
                {loading ? t('verifying') : t('verify')}
              </button>
              {otpMode === 'login' ? (
                <button
                  type="button"
                  className={styles.linkButton}
                  onClick={() => void resendOtp()}
                  disabled={cooldownLeft > 0 || loading}
                >
                  {cooldownLeft > 0
                    ? t('resendIn', { seconds: cooldownLeft })
                    : t('resend')}
                </button>
              ) : null}
              <button
                type="button"
                className={styles.linkButton}
                onClick={() =>
                  goTo(options?.hasPassword ? 'method' : 'mobile', -1)
                }
              >
                {t('back')}
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** @deprecated Use LoginWizard — kept for import compatibility. */
export function LoginForm({ locale }: { locale: string }) {
  return <LoginWizard locale={locale} />;
}
