import 'server-only';

// Browser only sends a brand key. Channel/source/touchpoint and the partner
// account are resolved here from a server-side allow-list so the client can
// never pick its own channel.
const defaultChannel = () => process.env.BSS_CHANNEL || 'BSS';

const BRAND_CONFIG = {
  web: () => ({
    account: 'default',
    channel: defaultChannel(),
    source: 'vietnam-homepage',
    touchpoint: 'WEB_PORTAL',
  }),
  vikki: () => ({
    account: 'vikki',
    channel: process.env.BSS_CHANNEL_VIKKI || 'WEBVIEW_VIKKI_BANK',
    source: process.env.BSS_SOURCE_VIKKI || 'VIKKI_APP',
    touchpoint: 'WEBVIEW',
    paymentMethod: 'VIKKI_BANK',
    partnerId: 'VIKKI_BANK',
  }),
};

export const resolveBssBrand = (value) => {
  const key = String(value || '').toLowerCase();
  return (BRAND_CONFIG[key] || BRAND_CONFIG.web)();
};
