const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const checkout = require('../api/checkout');
const capture = require('../api/paypal-capture');

const originalCwd = process.cwd;
const originalFetch = global.fetch;
const originalEnv = {...process.env};
const product = {id:'1234567890',title:'Camiseta de prueba',active:true,
  variants:[{id:'9876543210',title:'M',price:2228,available:true}]};
const makeResponse = () => ({status(code){this.code=code;return this},setHeader(){return this},json(data){this.body=data;return this}});
const apiResponse = (status, data) => ({ok:status>=200&&status<300,status,json:async()=>data});
const unit = (country='ES') => ({custom_id:'TCDF-12345678-1234-1234-1234-123456789abc',
  items:[{sku:'1234567890:9876543210',quantity:'1',unit_amount:{currency_code:'EUR',value:'22.28'}}],
  amount:{currency_code:'EUR',value:'23.28',breakdown:{item_total:{value:'22.28'},shipping:{value:'1.00'}}},
  shipping:{name:{full_name:'Comprador Prueba'},address:{country_code:country}}});
const order = (status, country='ES') => ({id:'5O190127TN364715T',intent:'CAPTURE',status,payer:{email_address:'buyer@example.org'},purchase_units:[unit(country)]});

function setup(t) {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tcdf-paypal-'));
  fs.mkdirSync(path.join(dir,'public','catalogo'),{recursive:true});
  for(let n=1;n<=17;n++)fs.writeFileSync(path.join(dir,'public','catalogo',String(n).padStart(2,'0')+'.json'),JSON.stringify(n===1?[product]:[]));
  process.cwd=()=>dir;
  Object.assign(process.env,{STORE_CHECKOUT_ENABLED:'true',PAYPAL_MODE:'sandbox',PAYPAL_CLIENT_ID:'sandbox-client',
    PAYPAL_CLIENT_SECRET:'sandbox-secret',SUPABASE_URL:'https://example.supabase.co',SUPABASE_SECRET_KEY:'sb_secret_test',
    PUBLIC_BASE_URL:'https://store.example.org',SHIPPING_EUR_CENTS:'100',VERCEL_ENV:'preview'});
  t.after(()=>{process.cwd=originalCwd;global.fetch=originalFetch;process.env=originalEnv;fs.rmSync(dir,{recursive:true,force:true})});
}

test('PayPal create order uses catalog price, EUR and fixed shipping',async t=>{
  setup(t);let sent;
  global.fetch=async (url,options)=>{
    if(url.endsWith('/v1/oauth2/token'))return apiResponse(200,{access_token:'fake-token'});
    sent=JSON.parse(options.body);
    return apiResponse(201,{id:'5O190127TN364715T',links:[{rel:'payer-action',href:'https://www.sandbox.paypal.com/checkoutnow?token=5O190127TN364715T'}]});
  };
  const res=makeResponse();await checkout({method:'POST',headers:{origin:process.env.PUBLIC_BASE_URL},body:{items:[{productId:product.id,variantId:product.variants[0].id,quantity:1}]}},res);
  assert.equal(res.code,200);assert.equal(sent.purchase_units[0].amount.value,'23.28');
  assert.equal(sent.purchase_units[0].amount.breakdown.shipping.value,'1.00');
  assert.equal(sent.purchase_units[0].items[0].unit_amount.value,'22.28');
  assert.match(res.body.url,/sandbox\.paypal\.com/);
});

test('PayPal rejects altered amount or delivery outside Spain before capture',async t=>{
  setup(t);
  assert.equal(capture.validateOrder(order('APPROVED')).total,2328);
  const wrong=order('APPROVED');wrong.purchase_units[0].amount.value='22.28';
  assert.throws(()=>capture.validateOrder(wrong),/Total/);
  assert.throws(()=>capture.validateOrder(order('APPROVED','FR')),/España/);
});

test('PayPal captures approved order and records only completed payment',async t=>{
  setup(t);let writes=0;let captured=0;
  global.fetch=async (url,options)=>{
    if(url.endsWith('/v1/oauth2/token'))return apiResponse(200,{access_token:'fake-token'});
    if(url.endsWith('/capture')){captured++;const paid=order('COMPLETED');paid.purchase_units[0].payments={captures:[{status:'COMPLETED',amount:{currency_code:'EUR',value:'23.28'}}]};return apiResponse(201,paid)}
    if(url.includes('/rest/v1/orders')){writes++;assert.equal(JSON.parse(options.body).paypal_order_id,'5O190127TN364715T');return apiResponse(201,{})}
    return apiResponse(200,order('APPROVED'));
  };
  const res=makeResponse();await capture({method:'POST',headers:{origin:process.env.PUBLIC_BASE_URL},body:{orderId:'5O190127TN364715T'}},res);
  assert.equal(res.code,200);assert.deepEqual(res.body,{paid:true,recorded:true});assert.equal(captured,1);assert.equal(writes,1);
});
