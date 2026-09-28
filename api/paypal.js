const apiBase = () => process.env.PAYPAL_MODE === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
const json = (res, code, data) => res.status(code).setHeader('Cache-Control', 'no-store').json(data);
const euros = cents => (cents / 100).toFixed(2);
const cents = value => /^\d+\.\d{2}$/.test(value || '') ? Number(value.replace('.', '')) : NaN;
const ready = () => process.env.STORE_CHECKOUT_ENABLED === 'true' &&
  ['live','sandbox'].includes(process.env.PAYPAL_MODE) &&
  (process.env.VERCEL_ENV !== 'production' || process.env.PAYPAL_MODE === 'live') &&
  !!process.env.PAYPAL_CLIENT_ID && !!process.env.PAYPAL_CLIENT_SECRET &&
  !!process.env.SUPABASE_URL && !!(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY) &&
  /^\d+$/.test(process.env.SHIPPING_EUR_CENTS || '') &&
  /^https:\/\/[^/]+$/.test(process.env.PUBLIC_BASE_URL || '');

async function request(endpoint, options = {}) {
  const tokenResponse = await fetch(apiBase()+'/v1/oauth2/token',{
    method:'POST',headers:{Authorization:'Basic '+Buffer.from(
      process.env.PAYPAL_CLIENT_ID+':'+process.env.PAYPAL_CLIENT_SECRET).toString('base64'),
      'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials'
  });
  const token = await tokenResponse.json();
  if (!tokenResponse.ok || !token.access_token) throw Error('PayPal authentication failed');
  const response = await fetch(apiBase()+endpoint,{
    ...options,headers:{Authorization:'Bearer '+token.access_token,
      'Content-Type':'application/json',...options.headers}
  });
  return {response,data:await response.json().catch(()=>null)};
}
module.exports = {ready,request,euros,cents,json};
