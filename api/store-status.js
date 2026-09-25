const {ready} = require('./checkout');
module.exports = (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({error:'Método no permitido'});
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({checkoutEnabled:ready()});
};
