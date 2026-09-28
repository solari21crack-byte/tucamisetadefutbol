const {ready, request, cents, json} = require('./paypal');
const {resolveCart} = require('./checkout');
const validId = id => typeof id === 'string' && /^[A-Za-z0-9]{10,30}$/.test(id);

function validateOrder(order) {
  const unit = order?.purchase_units?.[0];
  if (order?.intent !== 'CAPTURE' || order.purchase_units.length !== 1 ||
      !/^TCDF-[0-9a-f-]{36}$/.test(unit?.custom_id || '') ||
      !Array.isArray(unit.items) || unit.items.length < 1 || unit.items.length > 10)
    throw Error('Pedido de PayPal no válido');
  const cart = unit.items.map(item => {
    const ids = item.sku?.split(':');
    if (ids?.length !== 2) throw Error('Artículo no válido');
    return {productId:ids[0],variantId:ids[1],quantity:Number(item.quantity)};
  });
  const {resolved, subtotal} = resolveCart(cart);
  for (let i = 0; i < resolved.length; i++) {
    const item = unit.items[i];
    if (item.unit_amount?.currency_code !== 'EUR' ||
        cents(item.unit_amount.value) !== resolved[i].variant.price) throw Error('Precio modificado');
  }
  const shipping = Number(process.env.SHIPPING_EUR_CENTS);
  const total = subtotal + shipping;
  if (unit.amount?.currency_code !== 'EUR' || cents(unit.amount.value) !== total ||
      cents(unit.amount.breakdown?.item_total?.value) !== subtotal ||
      cents(unit.amount.breakdown?.shipping?.value) !== shipping)
    throw Error('Total de PayPal no válido');
  if (unit.shipping?.address?.country_code !== 'ES')
    throw Error('El envío solo está disponible a España. Elige una dirección española en PayPal.');
  return {unit,cart,total};
}

async function persistOrder(order, cart, total, shippingDetails, customerEmail) {
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/orders?on_conflict=paypal_order_id`,{
    method:'POST',headers:{apikey:key,...(key.startsWith('sb_secret_')?{}:{Authorization:`Bearer ${key}`}),
      'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},
    body:JSON.stringify({paypal_order_id:order.id,status:'paid',total_cents:total,currency:'eur',
      customer_email:customerEmail || null,
      shipping_details:shippingDetails || null,items:cart})
  });
  if (!response.ok) {
    console.error('PayPal order write rejected', response.status);
    return false;
  }
  return true;
}

module.exports = async function capture(req,res) {
  if (req.method !== 'POST') return json(res,405,{error:'Método no permitido'});
  if (!ready()) return json(res,503,{error:'Los pagos aún no están habilitados'});
  if (req.headers.origin && req.headers.origin !== process.env.PUBLIC_BASE_URL)
    return json(res,403,{error:'Origen no permitido'});
  const id = req.body?.orderId;
  if (!validId(id)) return json(res,400,{error:'Referencia de PayPal inválida'});
  try {
    const found = await request(`/v2/checkout/orders/${id}`);
    if (!found.response.ok || !found.data) return json(res,404,{error:'Pedido de PayPal no encontrado'});
    let check;
    try { check = validateOrder(found.data); }
    catch (error) { return json(res,409,{error:error.message}); }
    let order = found.data;
    if (order.status === 'APPROVED') {
      const captured = await request(`/v2/checkout/orders/${id}/capture`,{
        method:'POST',headers:{'PayPal-Request-Id':`TCDF-capture-${id}`},body:'{}'
      });
      if (!captured.response.ok || !captured.data) return json(res,502,{error:'No se pudo confirmar el pago con PayPal'});
      order = captured.data;
    }
    if (order.status !== 'COMPLETED') return json(res,409,{error:'El pago aún no está confirmado'});
    const completedCapture = order.purchase_units?.[0]?.payments?.captures?.find(x =>
      x.status === 'COMPLETED' && x.amount?.currency_code === 'EUR' && cents(x.amount.value) === check.total);
    if (!completedCapture) return json(res,409,{error:'El pago aún no está confirmado en PayPal'});
    const recorded = await persistOrder(order,check.cart,check.total,
      order.purchase_units[0].shipping || check.unit.shipping,
      order.payer?.email_address || found.data.payer?.email_address).catch(error=>{
      console.error('PayPal order write failed',error?.name || 'unknown');return false;
    });
    return json(res,200,{paid:true,recorded});
  } catch (error) {
    console.error('PayPal capture failed',error?.name || 'unknown');
    return json(res,502,{error:'No se pudo comprobar el pago en PayPal'});
  }
};
module.exports.validateOrder = validateOrder;
