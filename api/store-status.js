const {ready} = require('./checkout');
module.exports = (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({error:'Método no permitido'});
  res.setHeader('Cache-Control', 'no-store');
  const shippingCents = /^\d+$/.test(process.env.SHIPPING_EUR_CENTS || '') ? Number(process.env.SHIPPING_EUR_CENTS) : null;
  res.status(200).json({
    checkoutEnabled:ready(),
    shippingCents:Number.isSafeInteger(shippingCents) && shippingCents >= 0 ? shippingCents : null
  });
};
