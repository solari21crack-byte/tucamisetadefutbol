const json=(res,status,body)=>res.status(status).setHeader('Cache-Control','no-store').json(body);
const cookies=req=>Object.fromEntries((req.headers.cookie||'').split(';').map(part=>part.trim().split(/=(.*)/s).slice(0,2)).filter(([key])=>key));
const cookie=(name,value,maxAge)=>`${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
const clearCookies=res=>res.setHeader('Set-Cookie',[cookie('tcdf_access','',0),cookie('tcdf_refresh','',0)]);
const storeSession=(res,session)=>res.setHeader('Set-Cookie',[
  cookie('tcdf_access',session.access_token,Math.min(Math.max(Number(session.expires_in)||3600,60),86400)),
  cookie('tcdf_refresh',session.refresh_token,60*60*24*30)
]);
const safeUser=user=>user&&{id:user.id,email:user.email};

module.exports=async(req,res)=>{
  const url=process.env.SUPABASE_URL?.replace(/\/$/,'');
  const key=process.env.SUPABASE_ANON_KEY;
  if(!url||!key)return json(res,503,{configured:false,error:'El acceso de usuarios aún no está configurado.'});
  if(!/^https:\/\/[^/]+$/.test(url))return json(res,503,{configured:false,error:'Configuración de usuarios no válida.'});
  if(req.method!=='GET'&&req.method!=='POST')return json(res,405,{error:'Método no permitido.'});
  if(req.method==='POST'&&req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)
    return json(res,403,{error:'Solicitud no permitida.'});
  const headers={apikey:key,'Content-Type':'application/json'};
  const authFetch=async(path,method='GET',body,token)=>{
    const response=await fetch(url+'/auth/v1'+path,{method,headers:{...headers,...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(12000)});
    const data=await response.json().catch(()=>({}));
    return {response,data};
  };
  try{
    const stored=cookies(req);
    if(req.method==='GET'){
      if(!stored.tcdf_access&&!stored.tcdf_refresh)return json(res,200,{configured:true,user:null});
      if(stored.tcdf_access){
        const {response,data}=await authFetch('/user','GET',null,decodeURIComponent(stored.tcdf_access));
        if(response.ok)return json(res,200,{configured:true,user:safeUser(data)});
      }
      if(stored.tcdf_refresh){
        const {response,data}=await authFetch('/token?grant_type=refresh_token','POST',{refresh_token:decodeURIComponent(stored.tcdf_refresh)});
        if(response.ok&&data.access_token&&data.refresh_token){storeSession(res,data);return json(res,200,{configured:true,user:safeUser(data.user)})}
      }
      clearCookies(res);return json(res,200,{configured:true,user:null});
    }
    const body=typeof req.body==='object'&&req.body!==null?req.body:{};
    const action=body.action;
    if(action==='logout'){
      if(stored.tcdf_access)await authFetch('/logout','POST',{},decodeURIComponent(stored.tcdf_access)).catch(()=>{});
      clearCookies(res);return json(res,200,{user:null});
    }
    if(action==='session'){
      if(typeof body.access_token!=='string'||typeof body.refresh_token!=='string'||body.access_token.length>5000||body.refresh_token.length>5000)return json(res,400,{error:'Enlace de acceso no válido.'});
      const {response,data}=await authFetch('/user','GET',null,body.access_token);
      if(!response.ok)return json(res,401,{error:'El enlace ha caducado. Solicita uno nuevo.'});
      storeSession(res,{access_token:body.access_token,refresh_token:body.refresh_token,expires_in:3600});
      return json(res,200,{user:safeUser(data)});
    }
    if(action==='update-password'){
      if(typeof body.password!=='string'||body.password.length<8||body.password.length>72||!stored.tcdf_access)return json(res,400,{error:'Introduce una contraseña de entre 8 y 72 caracteres.'});
      const {response}=await authFetch('/user','PUT',{password:body.password},decodeURIComponent(stored.tcdf_access));
      return response.ok?json(res,200,{ok:true}):json(res,400,{error:'No se pudo cambiar la contraseña. Solicita un nuevo enlace.'});
    }
    const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
    if(email.length>254||!/^\S+@\S+\.\S+$/.test(email))return json(res,400,{error:'Introduce un correo electrónico válido.'});
    if(action==='recover'){
      const redirect=process.env.PUBLIC_BASE_URL||'https://tucamisetadefutbol.vercel.app';
      const {response}=await authFetch('/recover?redirect_to='+encodeURIComponent(redirect),'POST',{email});
      return response.ok?json(res,200,{message:'Si el correo está registrado, recibirás un enlace para cambiar tu contraseña.'}):json(res,502,{error:'No se pudo enviar el correo. Inténtalo más tarde.'});
    }
    if(!['register','login'].includes(action))return json(res,400,{error:'Acción no válida.'});
    if(typeof body.password!=='string'||body.password.length<8||body.password.length>72)return json(res,400,{error:'La contraseña debe tener entre 8 y 72 caracteres.'});
    const redirect=process.env.PUBLIC_BASE_URL||'https://tucamisetadefutbol.vercel.app';
    const path=action==='register'?'/signup?redirect_to='+encodeURIComponent(redirect):'/token?grant_type=password';
    const {response,data}=await authFetch(path,'POST',{email,password:body.password});
    if(!response.ok){
      const message=action==='login'?'Correo o contraseña incorrectos.':data.msg||data.message||data.error_description||'No se pudo crear la cuenta.';
      return json(res,response.status===429?429:400,{error:message});
    }
    if(data.access_token&&data.refresh_token){storeSession(res,data);return json(res,200,{user:safeUser(data.user)})}
    return json(res,200,{user:null,message:'Revisa tu correo para confirmar la cuenta y después inicia sesión.'});
  }catch{return json(res,502,{error:'No se pudo conectar con el servicio de usuarios. Inténtalo de nuevo.'})}
};
