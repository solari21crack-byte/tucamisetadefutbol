# Stripe Checkout

La tienda recibe pagos en euros con Stripe Checkout. El servidor comprueba precio, variante y disponibilidad usando el catálogo incluido en el despliegue; no acepta precios enviados por el navegador. El webhook con firma de Stripe registra pedidos pagados en Supabase. Las claves privadas solo se configuran en Vercel, nunca en el repositorio.
Tras volver de Stripe, la página consulta la sesión directamente en Stripe antes de mostrar una confirmación. El registro del pedido sigue dependiendo del webhook firmado.

## Activación

1. Ejecutar `supabase/orders.sql` en el editor SQL de Supabase.
2. En Vercel, configurar las variables de `.env.example` para producción con valores reales. Usar una clave secreta de Supabase `sb_secret_...` en `SUPABASE_SECRET_KEY`, solo en el servidor. Se admite temporalmente la clave antigua en `SUPABASE_SERVICE_ROLE_KEY`. `SHIPPING_EUR_CENTS` es el coste fijo de envío a España expresado en céntimos. `PUBLIC_BASE_URL` debe coincidir exactamente con el dominio público, sin `/` final.
3. Crear en Stripe un endpoint de webhook `https://tucamisetadefutbol.vercel.app/api/stripe-webhook` (o el dominio final) para `checkout.session.completed` y `checkout.session.async_payment_succeeded`. Guardar su secreto `whsec_...` en `STRIPE_WEBHOOK_SECRET` de Vercel.
4. Verificar licencia para vender cada artículo, inventario, precios finales en EUR, impuestos aplicables, información de envío y política de devoluciones. Marcar `active: true` únicamente los productos revisados en los ficheros `public/catalogo/*.json`.
5. Probar un pedido en modo de prueba Stripe y comprobar su fila en `public.orders`. Después introducir las claves de producción, establecer `STORE_CHECKOUT_ENABLED=true` y desplegar de nuevo.

El navegador nunca lee el secreto de Stripe ni la clave de servicio de Supabase. La página de éxito no da el pedido por pagado; la fuente de verdad es el webhook firmado.
