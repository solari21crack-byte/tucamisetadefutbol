const fs = require('node:fs');
const path = require('node:path');
const {randomUUID} = require('node:crypto');

const json = (res, code, data) => res.status(code).setHeader('Cache-Control', 'no-store').json(data);
const ready = () => process.env.STORE_CHECKOUT_ENABLED === 'true' &&
  !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_WEBHOOK_SECRET &&
  !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY &&
  /^\d+$/.test(process.env.SHIPPING_EUR_CENTS || '') &&
  /^https:\/\/[^/]+$/.test(process.env.PUBLIC_BASE_URL || '');

function productById(id) {
  if (!/^\d{6,20}$/.test(id)) return null;
  // The public product data is bundled with this function by vercel.json.
  const dir = path.join(process.cwd(), 'public', 'catalogo');
  for (let n = 1; n <= 17; n++) {
    const products = JSON.parse(fs.readFileSync(path.join(dir, String(n).padStart(2, '0') + '.json'), 'utf8'));
    const product = products.find(item => item.id === id);
    if (product) return product;
  }
  return null;
}

module.exports = async function checkout(req, res) {
  if (req.method !== 'POST') return json(res, 405, {error:'Método no permitido'});
  if (!ready()) return json(res, 503, {error:'Los pagos aún no están habilitados'});
  const origin = req.headers.origin;
  if (origin && origin !== process.env.PUBLIC_BASE_URL) return json(res, 403, {error:'Origen no permitido'});
  const items = req.body?.items;
  if (!Array.isArray(items) || items.length < 1 || items.length > 10) return json(res, 400, {error:'Cesta no válida'});
  const params = new URLSearchParams();
  params.set('mode', 'payment');
  params.set('success_url', process.env.PUBLIC_BASE_URL + '/?pago=recibido&session_id={CHECKOUT_SESSION_ID}');
  params.set('cancel_url', process.env.PUBLIC_BASE_URL + '/?pago=cancelado');
  params.set('billing_address_collection', 'required');
  params.set('shipping_address_collection[allowed_countries][0]', 'ES');
  params.set('shipping_options[0][shipping_rate_data][type]', 'fixed_amount');
  params.set('shipping_options[0][shipping_rate_data][fixed_amount][currency]', 'eur');
  params.set('shipping_options[0][shipping_rate_data][fixed_amount][amount]', process.env.SHIPPING_EUR_CENTS);
  params.set('shipping_options[0][shipping_rate_data][display_name]', 'Envío estándar');
  const resolved = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const qty = Number(item?.quantity);
    if (!item || typeof item.productId !== 'string' || typeof item.variantId !== 'string' ||
        !Number.isSafeInteger(qty) || qty < 1 || qty > 5) return json(res, 400, {error:'Cantidad o variante inválida'});
    const product = productById(item.productId);
    const variant = product?.variants.find(v => v.id === item.variantId);
    if (!product?.active || !variant?.available || !Number.isSafeInteger(variant.price) || variant.price < 50)
      return json(res, 409, {error:'Producto no disponible; revisa tu cesta'});
    resolved.push({productId:product.id,variantId:variant.id,quantity:qty});
    const prefix = `line_items[${i}]`;
    params.set(`${prefix}[price_data][currency]`, 'eur');
    params.set(`${prefix}[price_data][unit_amount]`, String(variant.price));
    params.set(`${prefix}[price_data][product_data][name]`, `${product.title} · ${variant.title}`.slice(0, 240));
    if (/^https:\/\//.test(product.image)) params.set(`${prefix}[price_data][product_data][images][0]`, product.image);
    params.set(`${prefix}[quantity]`, String(qty));
  }
  const cart = JSON.stringify(resolved);
  if (cart.length > 480) return json(res, 400, {error:'Divide el pedido en dos cestas'});
  params.set('metadata[cart]', cart);
  try {
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method:'POST',headers:{Authorization:`Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type':'application/x-www-form-urlencoded','Idempotency-Key':randomUUID()},body:params
    });
    const session = await response.json();
    if (!response.ok || !session.url) return json(res, 502, {error:'No se pudo iniciar el pago'});
    return json(res, 200, {url:session.url});
  } catch { return json(res, 502, {error:'Stripe no está disponible'}); }
};
module.exports.ready = ready;
module.exports.productById = productById;
