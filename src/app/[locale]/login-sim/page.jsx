'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'react-toastify';
import { Link, useRouter } from '../../../i18n/navigation';
import Footer from '../../components/Footer';
import Header from '../../components/Header';
import SelfCareService from '../../services/selfCareService';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ICCID_PATTERN = /^[0-9]{18,22}$/;
const OTP_PATTERN = /^[0-9]{6}$/;
const RESEND_COOLDOWN_MS = 30 * 1000;

const formatCountdown = (ms) => {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
};

const IconMail = () => (
  <svg width="42" height="42" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect width="42" height="42" rx="10" fill="#FFF6F3" />
    <path
      d="M11 15.5h20c.83 0 1.5.67 1.5 1.5v14c0 .83-.67 1.5-1.5 1.5H11c-.83 0-1.5-.67-1.5-1.5V17c0-.83.67-1.5 1.5-1.5Z"
      stroke="#EC242A"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path d="m11 17 10 7.5L31 17" stroke="#EC242A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconSim = () => (
  <svg width="42" height="42" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect width="42" height="42" rx="21" fill="#FFF6F3" />
    <path
      d="M16.5 12.5h7.2L27.5 16.3V29.5c0 .83-.67 1.5-1.5 1.5h-9.5c-.83 0-1.5-.67-1.5-1.5v-15.5c0-.83.67-1.5 1.5-1.5Z"
      stroke="#EC242A"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <rect x="17.5" y="19" width="7" height="8" rx="1" stroke="#EC242A" strokeWidth="1.5" />
  </svg>
);

const IconLock = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path
      d="M5.25 8.25V6a3.75 3.75 0 0 1 7.5 0v2.25"
      stroke="#333"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
    <rect x="3.75" y="8.25" width="10.5" height="7.5" rx="1.5" stroke="#333" strokeWidth="1.4" />
  </svg>
);

export default function LoginSimPage() {
  const t = useTranslations('loginSim');
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [simSerial, setSimSerial] = useState('');
  const [step, setStep] = useState('form');
  const [pendingToken, setPendingToken] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpExpiresAt, setOtpExpiresAt] = useState(0);
  const [resendAvailableAt, setResendAvailableAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (step !== 'otp') return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [step]);

  const otpRemainingMs = otpExpiresAt - now;
  const resendRemainingMs = resendAvailableAt - now;
  const isOtpExpired = step === 'otp' && otpRemainingMs <= 0;
  const canResend = resendRemainingMs <= 0 || isOtpExpired;

  const getErrorMessage = (error, context) => {
    switch (error?.status) {
      case 400:
        if (context === 'iccid') return t('errorInvalidSerial');
        if (context === 'otp') return t('otpWrong');
        return t('errorInvalidEmail');
      case 401:
        return context === 'otp' ? t('otpWrong') : t('errorSystem');
      case 404:
        return context === 'iccid' ? t('errorSerialNotFound') : t('errorServiceOff');
      case 429:
        return t('errorTooMany');
      default:
        return t('errorSystem');
    }
  };

  const beginOtpStep = (data) => {
    const startedAt = Date.now();
    setPendingToken(data?.pendingToken || '');
    setOtpExpiresAt(startedAt + (Number(data?.expiresInSeconds) || 300) * 1000);
    setResendAvailableAt(startedAt + RESEND_COOLDOWN_MS);
    setNow(startedAt);
    setOtpCode('');
    setStep('otp');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');

    const trimmedEmail = email.trim().toLowerCase();
    const iccid = simSerial.replace(/\s/g, '');

    if (!trimmedEmail && !iccid) {
      setErrorMessage(t('errorRequired'));
      return;
    }
    if (trimmedEmail && (!EMAIL_PATTERN.test(trimmedEmail) || trimmedEmail.length > 254)) {
      setErrorMessage(t('errorInvalidEmail'));
      return;
    }
    if (!trimmedEmail && !ICCID_PATTERN.test(iccid)) {
      setErrorMessage(t('errorInvalidSerial'));
      return;
    }

    setIsSubmitting(true);
    try {
      if (trimmedEmail) {
        const data = await SelfCareService.startEmailSession(trimmedEmail);
        setEmail(trimmedEmail);
        beginOtpStep(data);
      } else {
        await SelfCareService.lookupByIccid(iccid);
        router.push('/manage-sim');
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error, trimmedEmail ? 'email' : 'iccid'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async (event) => {
    event.preventDefault();
    setErrorMessage('');

    if (isOtpExpired) {
      setErrorMessage(t('otpExpired'));
      return;
    }
    if (!OTP_PATTERN.test(otpCode)) {
      setErrorMessage(t('otpWrong'));
      return;
    }

    setIsSubmitting(true);
    try {
      await SelfCareService.verifyOtp(email, pendingToken, otpCode);
      router.push('/manage-sim');
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'otp'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!canResend || isSubmitting) return;
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      if (isOtpExpired) {
        // An expired pending token can no longer be resent, so a fresh session is started instead.
        beginOtpStep(await SelfCareService.startEmailSession(email));
      } else {
        await SelfCareService.resendOtp(email, pendingToken);
        const resentAt = Date.now();
        setOtpExpiresAt(resentAt + 300 * 1000);
        setResendAvailableAt(resentAt + RESEND_COOLDOWN_MS);
        setNow(resentAt);
        setOtpCode('');
      }
      toast.success(t('otpResent'));
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'email'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangeEmail = () => {
    setStep('form');
    setPendingToken('');
    setOtpCode('');
    setErrorMessage('');
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />

      <nav className="w-full bg-white px-4 py-4">
        <div className="container flex items-center gap-2 text-sm">
          <Link href="/" className="font-inter text-[#666] transition-colors hover:text-[#ED1B2F]">
            {t('breadcrumbHome')}
          </Link>
          <span className="text-[#999]" aria-hidden="true">›</span>
          <span className="font-inter font-semibold text-[#333]">{t('breadcrumbCurrent')}</span>
        </div>
      </nav>

      <main
        className="relative w-full flex-1 overflow-hidden bg-[#FFF8F4] bg-cover bg-bottom bg-no-repeat"
        style={{ backgroundImage: "url('/assets/my-esim-access/bg-main.png')" }}
      >
        <div className="container px-4 py-8 lg:py-[60px]">
          <div className="flex flex-col items-center gap-8 lg:flex-row lg:items-center lg:justify-center lg:gap-[68px]">
            {/* Left illustration — row 1 on small, left column on L+ */}
            <div className="flex w-full max-w-[420px] shrink-0 justify-center lg:max-w-[560px] lg:flex-1">
              <img
                src="/assets/my-esim-access/img-left.png"
                alt=""
                className="h-auto w-full max-w-[360px] object-contain lg:max-w-[520px]"
              />
            </div>

            {/* Right form — row 2 on small, right column on L+ */}
            {step === 'form' ? (
            <form
              onSubmit={handleSubmit}
              noValidate
              className="flex w-full max-w-[490px] flex-col gap-4 sm:gap-5 lg:shrink-0"
            >
              <h1 className="font-inter text-[32px] font-bold leading-tight text-[#333] sm:text-[40px] lg:text-[48px] lg:leading-[48px]">
                {t('titlePrefix')}{' '}
                <span className="text-[#EC242A]">{t('titleHighlight')}</span>
              </h1>
              <p className="font-inter text-sm leading-[19px] text-black sm:text-base">
                {t('subtitle')}
              </p>

              <div className="flex w-full flex-col gap-2.5 rounded-[14px] border border-[#EAEAEA] bg-white p-4 sm:p-5">
                <div className="flex items-start gap-2.5">
                  <IconMail />
                  <div className="min-w-0 flex-1">
                    <p className="font-inter text-lg font-bold leading-[19px] text-[#333] sm:text-xl">
                      {t('emailTitle')}
                    </p>
                    <p className="mt-1.5 font-inter text-sm leading-[19px] text-[#333] sm:text-base">
                      {t('emailDesc')}
                    </p>
                  </div>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('emailPlaceholder')}
                  autoComplete="email"
                  className="w-full rounded-lg border border-[#EAEAEA] px-4 py-3.5 font-inter text-base font-medium text-[#181818] outline-none placeholder:opacity-50 focus:border-[#FAA61A]"
                />
                <p className="font-inter text-xs leading-[18px] text-[#666] sm:text-sm">{t('emailHint')}</p>
              </div>

              <div className="flex w-full flex-col gap-2.5 rounded-[14px] border border-[#EAEAEA] bg-white p-4 sm:p-5">
                <div className="flex items-start gap-2.5">
                  <IconSim />
                  <div className="min-w-0 flex-1">
                    <p className="font-inter text-lg font-bold leading-[19px] text-[#333] sm:text-xl">
                      {t('serialTitle')}
                    </p>
                    <p className="mt-1.5 font-inter text-sm leading-[19px] text-[#333] sm:text-base">
                      {t('serialDesc')}
                    </p>
                  </div>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  value={simSerial}
                  onChange={(e) => setSimSerial(e.target.value)}
                  placeholder={t('serialPlaceholder')}
                  className="w-full rounded-lg border border-[#EAEAEA] px-4 py-3.5 font-inter text-base font-medium text-[#181818] outline-none placeholder:opacity-50 focus:border-[#FAA61A]"
                />
              </div>

              {errorMessage && (
                <p role="alert" className="font-inter text-sm text-[#ED1B2F]">{errorMessage}</p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-[#FAA61A] px-6 py-4 font-inter text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? t('processing') : t('continue')}
              </button>

              <div className="flex items-center justify-center gap-1">
                <IconLock />
                <p className="font-inter text-sm leading-[19px] text-[#333]">
                  {t('secureNote')}
                </p>
              </div>
            </form>
            ) : (
            <form
              onSubmit={handleVerify}
              noValidate
              className="flex w-full max-w-[490px] flex-col gap-4 sm:gap-5 lg:shrink-0"
            >
              <h1 className="font-inter text-[32px] font-bold leading-tight text-[#333] sm:text-[40px]">
                {t('otpTitle')}
              </h1>
              <p className="font-inter text-sm leading-[19px] text-black sm:text-base">
                {t('otpSentTo', { email: SelfCareService.maskEmail(email) })}
              </p>

              <div className="flex w-full flex-col gap-2.5 rounded-[14px] border border-[#EAEAEA] bg-white p-4 sm:p-5">
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  maxLength={6}
                  autoFocus
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder={t('otpPlaceholder')}
                  className="w-full rounded-lg border border-[#EAEAEA] px-4 py-3.5 text-center font-inter text-2xl font-semibold tracking-[0.5em] text-[#181818] outline-none placeholder:text-base placeholder:tracking-normal placeholder:opacity-50 focus:border-[#FAA61A]"
                />
                <div className="flex items-center justify-between gap-3 font-inter text-sm">
                  <span className={isOtpExpired ? 'text-[#ED1B2F]' : 'text-[#666]'}>
                    {isOtpExpired ? t('otpExpired') : t('otpExpiresIn', { time: formatCountdown(otpRemainingMs) })}
                  </span>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={!canResend || isSubmitting}
                    className="shrink-0 font-semibold text-[#EC242A] disabled:cursor-not-allowed disabled:text-[#999]"
                  >
                    {canResend
                      ? t('otpResend')
                      : t('otpResendIn', { seconds: Math.ceil(resendRemainingMs / 1000) })}
                  </button>
                </div>
              </div>

              {errorMessage && (
                <p role="alert" className="font-inter text-sm text-[#ED1B2F]">{errorMessage}</p>
              )}

              <button
                type="submit"
                disabled={isSubmitting || otpCode.length < 6 || isOtpExpired}
                className="w-full rounded-lg bg-[#FAA61A] px-6 py-4 font-inter text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? t('processing') : t('otpConfirm')}
              </button>

              <button
                type="button"
                onClick={handleChangeEmail}
                className="self-center font-inter text-sm font-semibold text-[#333] underline underline-offset-2 hover:text-[#EC242A]"
              >
                {t('otpChangeEmail')}
              </button>
            </form>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
