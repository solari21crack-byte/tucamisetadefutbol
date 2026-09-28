const test=require('node:test');
const assert=require('node:assert/strict');
const chat=require('../api/chat');

function reply(){return {statusCode:200,status(code){this.statusCode=code;return this},setHeader(){return this},json(data){this.data=data;return this}}}
async function ask(message,ip){const res=reply();await chat({method:'POST',headers:{},body:{message},socket:{remoteAddress:ip}},res);return res}

test('sin Cloudflare, mantiene preguntas frecuentes y no llama a OpenAI',async()=>{
  const oldFetch=global.fetch;
  process.env.OPENAI_API_KEY='do-not-use';
  delete process.env.CLOUDFLARE_ACCOUNT_ID;delete process.env.CLOUDFLARE_AI_API_TOKEN;
  global.fetch=()=>{throw Error('No debe invocar un proveedor')};
  try{const res=await ask('¿Puedo devolver una camiseta?','chat-no-provider');assert.equal(res.statusCode,200);assert.match(res.data.reply,/14 días/)}
  finally{global.fetch=oldFetch;delete process.env.OPENAI_API_KEY}
});

test('envía pregunta e información verificada a Cloudflare sin exponer el token',async()=>{
  const oldFetch=global.fetch;
  process.env.CLOUDFLARE_ACCOUNT_ID='0123456789abcdef0123456789abcdef';process.env.CLOUDFLARE_AI_API_TOKEN='test-only-token';
  try{
    global.fetch=async(url,options)=>{
      assert.match(url,/api\.cloudflare\.com\/client\/v4\/accounts\/0123456789abcdef0123456789abcdef\/ai\/v1\/chat\/completions$/);
      assert.equal(options.headers.Authorization,'Bearer test-only-token');
      const body=JSON.parse(options.body);
      assert.equal(body.model,'@cf/meta/llama-3.1-8b-instruct-fp8-fast');
      assert.match(body.messages[0].content,/pedidos y pagos desactivados/);
      return {ok:true,json:async()=>({choices:[{message:{content:'No hay guía de medidas verificada.'}}]})};
    };
    const res=await ask('¿Qué talla debo pedir?','chat-cloudflare');
    assert.equal(res.statusCode,200);assert.equal(res.data.reply,'No hay guía de medidas verificada.');assert.doesNotMatch(JSON.stringify(res.data),/test-only-token/);
  }finally{global.fetch=oldFetch;delete process.env.CLOUDFLARE_ACCOUNT_ID;delete process.env.CLOUDFLARE_AI_API_TOKEN}
});
