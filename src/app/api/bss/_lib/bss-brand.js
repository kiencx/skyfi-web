import 'server-only';

// Browser only sends a brand key. Channel/source/touchpoint are resolved here
// from a server-side allow-list so the client can never pick its own channel.
const defaultChannel = () => process.env.BSS_CHANNEL || 'BSS';

const BRAND_CONFIG = {
  web: () => ({
    channel: defaultChannel(),
    source: 'vietnam-homepage',
    touchpoint: 'WEB_PORTAL',
  }),
  vikki: () => ({
    channel: process.env.BSS_CHANNEL_VIKKI || defaultChannel(),
    source: process.env.BSS_SOURCE_VIKKI || 'vikki-app',
    touchpoint: 'WEB_PORTAL',
  }),
};

export const resolveBssBrand = (value) => {
  const key = String(value || '').toLowerCase();
  return (BRAND_CONFIG[key] || BRAND_CONFIG.web)();
};
