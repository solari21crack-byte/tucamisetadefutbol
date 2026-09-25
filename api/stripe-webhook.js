const {createHmac, timingSafeEqual} = require('node:crypto');

function verify(body, header, secret) {
  if (!secret || !header || typeof header !== 'string') return false;
  const fields = header.split(',').map(x => x.trim().split('='));
  const time = fields.find(x => x[0] === 't')?.[1];
  const candidates = fields.filter(x => x[0] === 'v1').map(x => x[1]);
  if (!/^\d+$/.test(time || '') || Math.abs(Date.now()/1000 - Number(time)) > 300) return false;
  const expected = createHmac('sha256',secret).update(`${time}.${body}`).digest();
  return candidates.some(hex => {
    if (!/^[a-f0-9]{64}$/i.test(hex || '')) return false;
    return timingSafeEqual(expected, Buffer.from(hex,'hex'));
  });
}

module.exports = async function webhook(req,res) {
  if (req.method !== 'POST') return res.status(405).end();
  let body = '';
  for await (const chunk of req) {
    body += chunk.toString('utf8');
    if (body.length > 1024*1024) return res.status(413).end();
  }
  if (!verify(body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET))
    return res.status(400).json({error:'Firma incorrecta'});
  const event = JSON.parse(body);
  if (!['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type))
    return res.status(200).json({received:true});
  const session = event.data?.object;
  if (!session?.id || session.payment_status !== 'paid' || session.currency !== 'eur' ||
      !Number.isSafeInteger(session.amount_total)) return res.status(200).json({received:true});
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return res.status(503).end();
  const record = {
    stripe_session_id:session.id,
    status:'paid',
    total_cents:session.amount_total,
    currency:'eur',
    customer_email:session.customer_details?.email || null,
    shipping_details:session.shipping_details || session.collected_information?.shipping_details || null,
    items:JSON.parse(session.metadata?.cart || '[]')
  };
  try {
    const db = await fetch(`${process.env.SUPABASE_URL}/rest/v1/orders?on_conflict=stripe_session_id`,{
      method:'POST',headers:{apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization:`Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(record)
    });
    if (!db.ok) return res.status(503).json({error:'No se pudo registrar el pedido'});
    return res.status(200).json({received:true});
  } catch { return res.status(503).json({error:'No se pudo registrar el pedido'}); }
};
module.exports.verify = verify;
