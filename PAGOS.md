# Stripe Checkout

La tienda recibe pagos en euros con Stripe Checkout. El servidor comprueba precio, variante y disponibilidad usando el catálogo incluido en el despliegue; no acepta precios enviados por el navegador. El webhook con firma de Stripe registra pedidos pagados en Supabase. Las claves privadas solo se configuran en Vercel, nunca en el repositorio.
Tras volver de Stripe, la página consulta la sesión directamente en Stripe antes de mostrar una confirmación. El registro del pedido sigue dependiendo del webhook firmado.

## Activación

1. Ejecutar `supabase/orders.sql` en el editor SQL de Supabase.
2. En Vercel, configurar las variables de `.env.example` para producción con valores reales. Usar una clave secreta de Supabase `sb_secret_...` en `SUPABASE_SECRET_KEY`, solo en el servidor. Se admite temporalmente la clave antigua en `SUPABASE_SERVICE_ROLE_KEY`. `SHIPPING_EUR_CENTS` es el coste fijo de envío a España expresado en céntimos. `PUBLIC_BASE_URL` debe coincidir exactamente con el dominio público, sin `/` final.
3. Crear en Stripe un endpoint de webhook `https://tucamisetadefutbol.vercel.app/api/stripe-webhook` (o el dominio final) para `checkout.session.completed` y `checkout.session.async_payment_succeeded`. Guardar su secreto `whsec_...` en `STRIPE_WEBHOOK_SECRET` de Vercel.
4. Verificar licencia para vender cada artículo, impuestos aplicables, y separar camisetas y pantalones de las demás categorías. Los precios actuales en EUR, la disponibilidad de camisetas y pantalones y la entrega estimada de 7 días laborables han sido confirmados por el propietario. Marcar `active: true` únicamente los productos identificados en los ficheros `public/catalogo/*.json`.
5. Probar un pedido en modo de prueba Stripe y comprobar su fila en `public.orders`. Después introducir las claves de producción, establecer `STORE_CHECKOUT_ENABLED=true` y desplegar de nuevo.

Alcance comercial indicado: camisetas y pantalones disponibles, precios actuales definitivos, entrega estimada de 7 días laborables a España y envío fijo de 1 €. Para camisetas normales y pantalones se ofrecen cambios de talla y el desistimiento legal durante 14 días naturales desde la recepción. Las camisetas confeccionadas con nombre o dorsal elegido por el cliente no admiten cambios por talla o preferencia ni desistimiento; cualquier artículo defectuoso o distinto al pedido conserva su garantía legal. El catálogo carece de campos de personalización, así que no se debe atribuir esta excepción a un producto solo por su título. Excluir de la venta los artículos que no sean camisetas o pantalones. Los datos del proveedor son una vista previa sin sincronización de inventario; 18 variantes figuran como no disponibles en estos datos y requieren revisión antes de activarlas.

Antes de abrir cobros: facilitar identidad y datos de contacto del vendedor, canal y procedimiento para solicitar cambios/desistimiento, modelo de formulario, reparto de gastos directos de devolución e información fiscal aplicable. Configurar claves y webhook de Stripe en modo producción. El checkout sigue desactivado hasta entonces.

El navegador nunca lee el secreto de Stripe ni la clave de servicio de Supabase. La página de éxito no da el pedido por pagado; la fuente de verdad es el webhook firmado.
