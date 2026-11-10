'use client';

// Bọc tag tracking của trang (GA, GTM…) theo mã đồng ý cookie của CMP.
// - Tắt CMP: render nguyên như cũ.
// - Bật CMP: không render gì (kể cả lúc SSR) cho tới khi khách đồng ý đúng mã; SDK lỗi thì không bao giờ render.
//
//   <ConsentGate code="COOKIE_ANALYTICS">
//     <Script src="https://www.googletagmanager.com/gtag/js?id=G-XXXX" />
//   </ConsentGate>
import { useEffect, useState } from 'react';
import { CMP_ENABLED, isConsentGranted, onConsentGranted } from '@/app/utils/cmpConsent';

export default function ConsentGate({ code, children }) {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!CMP_ENABLED) return undefined;
    if (isConsentGranted(code)) {
      setAllowed(true);
      return undefined;
    }
    return onConsentGranted((granted) => {
      if (granted === code) setAllowed(true);
    });
  }, [code]);

  if (!CMP_ENABLED) return children;
  return allowed ? children : null;
}
