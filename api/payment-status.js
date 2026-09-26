const json = (res, code, data) => res.status(code).setHeader('Cache-Control', 'no-store').json(data);

module.exports = async function paymentStatus(req, res) {
  if (req.method !== 'GET') return json(res, 405, {error: 'Método no permitido'});
  const id = req.query?.session_id;
  if (typeof id !== 'string' || !/^cs_(test_|live_)[A-Za-z0-9]{10,}$/.test(id))
    return json(res, 400, {error: 'Referencia de pago inválida'});
  if (!process.env.STRIPE_SECRET_KEY) return json(res, 503, {error: 'Pagos no configurados'});

  try {
    const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${id}`, {
      headers: {Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`}
    });
    if (!response.ok) return json(res, 404, {error: 'Pago no encontrado'});
    const session = await response.json();
    return json(res, 200, {
      paid: session.mode === 'payment' && session.payment_status === 'paid',
      pending: session.status === 'complete' && session.payment_status === 'unpaid'
    });
  } catch {
    return json(res, 502, {error: 'No se pudo comprobar el pago'});
  }
};
