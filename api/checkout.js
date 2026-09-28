const fs = require('node:fs');
const path = require('node:path');
const {randomUUID} = require('node:crypto');
const {ready, request, euros, json} = require('./paypal');

function productById(id) {
  if (!/^\d{6,20}$/.test(id)) return null;
  const dir = path.join(process.cwd(), 'public', 'catalogo');
  for (let n = 1; n <= 17; n++) {
    const products = JSON.parse(fs.readFileSync(path.join(dir, String(n).padStart(2, '0') + '.json'), 'utf8'));
    const product = products.find(item => item.id === id);
    if (product) return product;
  }
  return null;
}

function resolveCart(items) {
  if (!Array.isArray(items) || items.length < 1 || items.length > 10) throw Error('Cesta no válida');
  const resolved = [];
  let subtotal = 0;
  for (const item of items) {
    const qty = Number(item?.quantity);
    if (typeof item?.productId !== 'string' || typeof item?.variantId !== 'string' ||
        !Number.isSafeInteger(qty) || qty < 1 || qty > 5) throw Error('Cantidad o variante inválida');
    const product = productById(item.productId);
    const variant = product?.variants.find(v => v.id === item.variantId);
    if (!product?.active || !variant?.available || !Number.isSafeInteger(variant.price) || variant.price < 50)
      throw Error('Producto no disponible; revisa tu cesta');
    subtotal += variant.price * qty;
    resolved.push({product, variant, quantity:qty});
  }
  if (!Number.isSafeInteger(subtotal)) throw Error('Cesta no válida');
  return {resolved, subtotal};
}

module.exports = async function checkout(req, res) {
  if (req.method !== 'POST') return json(res, 405, {error:'Método no permitido'});
  if (!ready()) return json(res, 503, {error:'Los pagos aún no están habilitados'});
  if (req.headers.origin && req.headers.origin !== process.env.PUBLIC_BASE_URL)
    return json(res, 403, {error:'Origen no permitido'});
  let cart;
  try { cart = resolveCart(req.body?.items); }
  catch (error) { return json(res, 409, {error:error.message}); }

  const shipping = Number(process.env.SHIPPING_EUR_CENTS);
  const amount = {currency_code:'EUR',value:euros(cart.subtotal + shipping),breakdown:{
    item_total:{currency_code:'EUR',value:euros(cart.subtotal)},
    shipping:{currency_code:'EUR',value:euros(shipping)}
  }};
  const payload = {
    intent:'CAPTURE',
    purchase_units:[{
      custom_id:'TCDF-'+randomUUID(),
      description:'Camisetas y pantalones · entrega estimada: 7 días laborables',
      amount,
      items:cart.resolved.map(({product,variant,quantity})=>({
        name:`${product.title} · ${variant.title}`.slice(0,127),
        sku:`${product.id}:${variant.id}`,
        unit_amount:{currency_code:'EUR',value:euros(variant.price)},
        quantity:String(quantity),category:'PHYSICAL_GOODS'
      }))
    }],
    payment_source:{paypal:{experience_context:{
      brand_name:'Tu Camiseta de Fútbol',locale:'es-ES',user_action:'PAY_NOW',
      shipping_preference:'GET_FROM_FILE',
      return_url:process.env.PUBLIC_BASE_URL+'/?pago=aprobado',
      cancel_url:process.env.PUBLIC_BASE_URL+'/?pago=cancelado'
    }}}
  };
  try {
    const {response, data} = await request('/v2/checkout/orders',{
      method:'POST',headers:{'PayPal-Request-Id':randomUUID()},body:JSON.stringify(payload)
    });
    const approval = data?.links?.find(link=>link.rel==='payer-action' || link.rel==='approve')?.href;
    if (!response.ok || !data?.id || !approval) return json(res, 502, {error:'No se pudo iniciar el pago con PayPal'});
    const url = new URL(approval);
    if (url.protocol !== 'https:' || !['www.paypal.com','www.sandbox.paypal.com'].includes(url.hostname))
      return json(res, 502, {error:'Respuesta de PayPal no válida'});
    return json(res, 200, {url:url.href});
  } catch (error) {
    console.error('PayPal order creation failed', error?.name || 'unknown');
    return json(res, 502, {error:'PayPal no está disponible en este momento'});
  }
};
module.exports.ready = ready;
module.exports.productById = productById;
module.exports.resolveCart = resolveCart;
