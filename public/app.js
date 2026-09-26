const euro = cents => new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(cents/100);
const $ = id => document.getElementById(id);
const state = {items:[],search:'',category:'',sort:'recent',page:1,cart:[],paymentEnabled:false};
const escapeHtml = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const siteHeader=document.querySelector('.header');
let previousScrollY=window.scrollY;
siteHeader.addEventListener('focusin',()=>siteHeader.classList.remove('is-hidden'));
window.addEventListener('scroll',()=>{
  const currentScrollY=window.scrollY;
  if(currentScrollY<80||siteHeader.contains(document.activeElement)){
    siteHeader.classList.remove('is-hidden');previousScrollY=currentScrollY;
  }else if(Math.abs(currentScrollY-previousScrollY)>4){
    siteHeader.classList.toggle('is-hidden',currentScrollY>previousScrollY);
    previousScrollY=currentScrollY;
  }
},{passive:true});
let delay;
async function load(){try{const files=Array.from({length:17},(_,i)=>'/catalogo/'+String(i+1).padStart(2,'0')+'.json');const responses=await Promise.all(files.map(f=>fetch(f)));if(responses.some(r=>!r.ok))throw Error();state.items=(await Promise.all(responses.map(r=>r.json()))).flat();renderCategoryCards();renderCollectionNav();renderCart();const cats=[...new Set(state.items.map(x=>x.category))].sort((a,b)=>a.localeCompare(b,'es'));$('category').innerHTML='<option value="">Todas las categorías</option>'+cats.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c==='Todos los productos'?'Otros':c)}</option>`).join('');render()}catch{$('catalogStatus').textContent='No se pudo cargar el catálogo. Vuelve a intentarlo.'}}
function renderCollectionNav(){const names=[...new Set(state.items.map(x=>x.category))];const preferred=['La Liga','Premier League','Serie A','Bundesliga','Ligue 1','Mundial 2026','Retro','Niños','Entrenamiento','NBA','Todos los productos'];const categories=[...preferred.filter(x=>names.includes(x)),...names.filter(x=>!preferred.includes(x)).sort((a,b)=>a.localeCompare(b,'es'))];$('collectionNav').innerHTML=[['','Todas'],...categories.map(name=>[name,name==='Todos los productos'?'Otros':name])].map(([name,label])=>`<a href="#camisetas" data-category="${escapeHtml(name)}">${escapeHtml(label)}</a>`).join('');updateCollectionNav()}
function updateCollectionNav(){$('collectionNav').querySelectorAll('[data-category]').forEach(link=>{if(link.dataset.category===state.category)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current')})}
function selectCategory(name){state.category=name;$('category').value=name;state.page=1;updateCollectionNav();render()}
function matches(x){const s=state.search.trim().toLowerCase();return s.split(/\s+/).every(t=>x.title.toLowerCase().includes(t))}
function render(){let list=state.items.filter(x=>(!state.category||x.category===state.category)&&matches(x));if(state.sort!=='recent')list.sort((a,b)=>state.sort==='asc'?a.variants[0].price-b.variants[0].price:b.variants[0].price-a.variants[0].price);const pages=Math.max(1,Math.ceil(list.length/24));state.page=Math.min(state.page,pages);$('catalogStatus').textContent=`${list.length.toLocaleString('es-ES')} modelos · Vista previa del catálogo`;$('grid').innerHTML=list.slice((state.page-1)*24,state.page*24).map(x=>`<button class="card" data-id="${x.id}"><div class="card-image"><img src="${escapeHtml(x.image)}" alt="${escapeHtml(x.title)}" loading="lazy"></div><div class="card-info"><strong>${escapeHtml(x.title)}</strong><span>Desde ${euro(Math.min(...x.variants.map(v=>v.price)))}</span></div></button>`).join('')||'<p>No encontramos productos con esa búsqueda.</p>';$('pageIndicator').textContent=`${state.page} / ${pages}`;$('prev').disabled=state.page===1;$('next').disabled=state.page===pages}
$('search').addEventListener('input',e=>{clearTimeout(delay);$('headerSearch').value=e.target.value;delay=setTimeout(()=>{state.search=e.target.value;state.page=1;render()},180)});
$('headerSearchForm').addEventListener('submit',e=>{e.preventDefault();clearTimeout(delay);state.search=$('headerSearch').value.trim();$('search').value=state.search;selectCategory('');$('camisetas').scrollIntoView({behavior:'smooth',block:'start'})});
const account={configured:null,user:null,mode:'login'};
async function authRequest(body){const response=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),credentials:'same-origin'});const data=await response.json();if(!response.ok)throw Error(data.error||'No se pudo completar la solicitud.');return data}
function accountMessage(message,error=false){$('accountStatus').textContent=message;$('accountStatus').classList.toggle('error',error)}
function updateAccountUI(){
  const signedIn=!!account.user&&account.mode!=='reset';
  document.querySelector('.login-button span').textContent=account.user?'Mi cuenta':'Entrar';
  document.querySelector('.register-button').hidden=!!account.user;
  $('accountSignedIn').hidden=!signedIn;
  $('accountForm').hidden=signedIn||account.configured===false;
  $('accountSwitch').hidden=signedIn||account.configured===false||account.mode==='recover'||account.mode==='reset';
  $('accountRecover').hidden=signedIn||account.configured===false||account.mode!=='login';
  $('accountEmailDisplay').textContent=signedIn?account.user.email:'';
  $('accountDialogTitle').textContent=signedIn?'Mi cuenta':({login:'Iniciar sesión',register:'Crear una cuenta',recover:'Recuperar contraseña',reset:'Nueva contraseña'})[account.mode];
  $('accountIntro').textContent=signedIn?'Has iniciado sesión.':account.configured===false?'El acceso de usuarios todavía no está configurado.':({login:'Entra con tu correo y contraseña.',register:'Crea tu cuenta con un correo y una contraseña de al menos 8 caracteres.',recover:'Te enviaremos un enlace para cambiar la contraseña.',reset:'Elige una contraseña nueva de al menos 8 caracteres.'})[account.mode];
  $('accountSubmit').textContent=({login:'Entrar',register:'Registrarse',recover:'Enviar enlace',reset:'Guardar contraseña'})[account.mode];
  $('accountSwitch').textContent=account.mode==='login'?'Crear una cuenta':'Ya tengo una cuenta';
  $('accountEmail').hidden=account.mode==='reset';
  $('accountEmail').previousElementSibling.hidden=account.mode==='reset';
  $('accountEmail').required=account.mode!=='reset';
  $('accountPassword').hidden=account.mode==='recover';
  $('accountPassword').previousElementSibling.hidden=account.mode==='recover';
  $('accountPassword').required=account.mode!=='recover';
  $('accountPassword').autocomplete=account.mode==='register'||account.mode==='reset'?'new-password':'current-password';
}
function setAccountMode(mode){account.mode=mode;$('accountPassword').value='';accountMessage('');updateAccountUI()}
async function loadAccount(){try{const response=await fetch('/api/auth',{cache:'no-store'});const data=await response.json();account.configured=data.configured!==false;account.user=data.user||null}catch{account.configured=false}updateAccountUI()}
document.querySelectorAll('[data-account]').forEach(button=>button.addEventListener('click',async()=>{
  if(account.configured===null)await loadAccount();
  setAccountMode(button.dataset.account==='register'?'register':'login');
  $('accountDialog').showModal();
}));
$('accountSwitch').addEventListener('click',()=>setAccountMode(account.mode==='login'?'register':'login'));
$('accountRecover').addEventListener('click',()=>setAccountMode('recover'));
$('accountForm').addEventListener('submit',async e=>{
  e.preventDefault();const button=$('accountSubmit');button.disabled=true;accountMessage('Un momento…');
  try{
    const data=await authRequest({action:account.mode==='reset'?'update-password':account.mode,email:$('accountEmail').value,password:$('accountPassword').value});
    if(data.user){account.user=data.user;updateAccountUI();accountMessage(account.mode==='reset'?'Contraseña actualizada.':'Sesión iniciada.');if(account.mode==='login'||account.mode==='register')$('accountDialog').close()}
    else if(account.mode==='register'){setAccountMode('login');accountMessage(data.message||'Revisa tu correo para confirmar la cuenta.')}
    else if(account.mode==='recover'){setAccountMode('login');accountMessage(data.message||'Revisa tu correo electrónico.')}
    else if(account.mode==='reset'){setAccountMode('login');accountMessage('Contraseña actualizada. Ya puedes usar tu cuenta.')}
  }catch(error){accountMessage(error.message,true)}finally{button.disabled=false}
});
$('accountLogout').addEventListener('click',async()=>{try{await authRequest({action:'logout'});account.user=null;setAccountMode('login');accountMessage('Sesión cerrada.')}catch(error){accountMessage(error.message,true)}});
async function acceptEmailLink(){
  const params=new URLSearchParams(location.hash.slice(1));const access_token=params.get('access_token'),refresh_token=params.get('refresh_token');
  if(!access_token||!refresh_token)return;
  history.replaceState(null,'',location.pathname+location.search);
  try{const data=await authRequest({action:'session',access_token,refresh_token});account.configured=true;account.user=data.user;setAccountMode(params.get('type')==='recovery'?'reset':'login');$('accountDialog').showModal();accountMessage(account.mode==='reset'?'Introduce tu nueva contraseña.':'Correo confirmado. Ya has iniciado sesión.')}catch(error){accountMessage(error.message,true);$('accountDialog').showModal()}
}
loadAccount().then(acceptEmailLink);
$('closeAccount').addEventListener('click',()=>$('accountDialog').close());
$('accountDialog').addEventListener('click',e=>{if(e.target===$('accountDialog'))$('accountDialog').close()});
$('category').addEventListener('change',e=>selectCategory(e.target.value));
$('sort').addEventListener('change',e=>{state.sort=e.target.value;state.page=1;render()});
function renderCategoryCards(){const counts=new Map(),photos=new Map();for(const item of state.items){counts.set(item.category,(counts.get(item.category)||0)+1);if(item.image&&!photos.has(item.category)&&!(/shorts?|socks?|pants?/i).test(item.title))photos.set(item.category,item.image)}const flags={'La Liga':'🇪🇸','Premier League':'🇬🇧','Serie A':'🇮🇹','Bundesliga':'🇩🇪','Ligue 1':'🇫🇷','NBA':'🇺🇸','Mundial 2026':'🌍','Retro':'⚽','Niños':'👕','Entrenamiento':'🏃','Todos los productos':'⚽'};const cats=[...counts].sort((a,b)=>b[1]-a[1]);$('categoryCards').innerHTML=[['',state.items.length],...cats].map(([name,count])=>{const art=photos.get(name)||photos.get('La Liga')||state.items[0].image;return `<a href="#camisetas" data-category="${escapeHtml(name)}">${art?`<img class="category-art" src="${escapeHtml(art)}" alt="" loading="lazy">`:''}<i class="category-flag" aria-hidden="true">${flags[name]||'⚽'}</i><strong>${escapeHtml(name===''?'Todos los productos':name==='Todos los productos'?'Otros':name)}</strong><small>${count.toLocaleString('es-ES')} productos</small><span aria-hidden="true">↗</span></a>`}).join('')}
$('categoryCards').addEventListener('click',e=>{const link=e.target.closest('a[data-category]');if(link)selectCategory(link.dataset.category)});
$('collectionNav').addEventListener('click',e=>{const link=e.target.closest('a[data-category]');if(link)selectCategory(link.dataset.category)});
$('prev').onclick=()=>{state.page--;render();$('camisetas').scrollIntoView()};$('next').onclick=()=>{state.page++;render();$('camisetas').scrollIntoView()};
$('grid').addEventListener('click',e=>{const button=e.target.closest('[data-id]');if(button)showProduct(button.dataset.id)});
function showProduct(id){const p=state.items.find(x=>x.id===id);if(!p)return;$('productDetail').innerHTML=`<div class="detail"><img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.title)}"><div><span class="eyebrow">ARTÍCULO DE FÚTBOL</span><h2>${escapeHtml(p.title)}</h2><p id="detailPrice">${euro(p.variants[0].price)}</p><label for="variant">Elige una opción</label><select id="variant">${p.variants.map((v,i)=>`<option value="${i}">${escapeHtml(v.title)} · ${euro(v.price)}</option>`).join('')}</select><p class="note">${state.paymentEnabled&&p.active?'Confirma la talla y el precio antes de pagar.': 'Estamos verificando disponibilidad, envíos y condiciones de venta. Aún no aceptamos pedidos.'}</p><button id="addCart">Añadir a la cesta</button></div></div>`;$('variant').onchange=e=>{$('detailPrice').textContent=euro(p.variants[Number(e.target.value)].price)};$('addCart').onclick=()=>{const variant=p.variants[Number($('variant').value)];if(variant&&!state.cart.some(x=>x.productId===p.id&&x.variantId===variant.id)){state.cart.push({productId:p.id,variantId:variant.id,quantity:1});renderCart()}$('productDialog').close();toggleCart(true)};$('productDialog').showModal();history.replaceState(null,'','#producto-'+p.slug)}
$('closeProduct').onclick=()=>{$('productDialog').close();history.replaceState(null,'','#camisetas')};$('productDialog').addEventListener('click',e=>{if(e.target.id==='productDialog')$('productDialog').close()});
function toggleCart(open){$('drawer').classList.toggle('open',open);$('drawer').setAttribute('aria-hidden',String(!open));$('overlay').hidden=!open}$('cartButton').onclick=()=>toggleCart(true);$('closeCart').onclick=()=>toggleCart(false);$('overlay').onclick=()=>toggleCart(false);

function renderCart(){
  const lines=state.cart.map((item,i)=>{const p=state.items.find(x=>x.id===item.productId),v=p?.variants.find(x=>x.id===item.variantId);return p&&v?{i,item,p,v}:null}).filter(Boolean);
  $('cartItems').innerHTML=lines.map(({i,item,p,v})=>`<div class="cart-line"><strong>${escapeHtml(p.title)}</strong><small>${escapeHtml(v.title)} · ${euro(v.price)} × ${item.quantity}</small><button type="button" data-remove="${i}" aria-label="Quitar ${escapeHtml(p.title)}">Quitar</button></div>`).join('')||'<p>Tu cesta está vacía.</p>';
  $('cartCount').textContent=lines.reduce((sum,x)=>sum+x.item.quantity,0);
  $('total').textContent='Productos: '+euro(lines.reduce((sum,x)=>sum+x.v.price*x.item.quantity,0))+' · Envío calculado al pagar';
  const allowed=state.paymentEnabled&&lines.length>0&&lines.every(({p,v})=>p.active&&v.available);
  $('payButton').disabled=!allowed;
  $('payButton').textContent=state.paymentEnabled?'Ir al pago seguro':'Pagos disponibles próximamente';
}
$('cartItems').addEventListener('click',e=>{const b=e.target.closest('[data-remove]');if(!b)return;state.cart.splice(Number(b.dataset.remove),1);renderCart()});
$('payButton').addEventListener('click',async()=>{
  $('payButton').disabled=true;$('checkoutMessage').textContent='Preparando el pago…';
  try{const r=await fetch('/api/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items:state.cart})});const data=await r.json();if(!r.ok)throw Error(data.error||'No se pudo iniciar el pago');const url=new URL(data.url);if(url.protocol!=='https:'||url.hostname!=='checkout.stripe.com')throw Error('Respuesta de pago no válida');location.assign(url.href)}
  catch(e){$('checkoutMessage').textContent=e.message;renderCart()}
});
async function loadPaymentStatus(){try{const r=await fetch('/api/store-status',{cache:'no-store'});if(!r.ok)throw Error();state.paymentEnabled=(await r.json()).checkoutEnabled===true}catch{state.paymentEnabled=false}renderCart()}
loadPaymentStatus();

load();
