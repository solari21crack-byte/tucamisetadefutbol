# Cobro con PayPal

La cesta usa PayPal Orders API. El servidor calcula los importes en euros desde el catálogo incluido en el despliegue, añade 1 € de envío a España y crea una orden en PayPal. Tras la aprobación del comprador, comprueba el importe, cada producto, la dirección de entrega española y el estado de captura. Registra los pedidos cobrados en Supabase. No guarda secretos en el navegador ni acepta precios enviados por el cliente.

## Para conectar la cuenta Business

1. Crear o seleccionar una aplicación REST en [PayPal Developer → Apps & Credentials](https://developer.paypal.com/dashboard/applications) y obtener su Client ID y Secret para Sandbox y Live. No enviar el Secret por chat ni guardarlo en GitHub.
2. Ejecutar `supabase/orders.sql` en el proyecto Supabase de la tienda para añadir `paypal_order_id` y conservar los pedidos de prueba antiguos de Stripe.
3. Configurar en Vercel `PAYPAL_MODE=live`, `PAYPAL_CLIENT_ID` y `PAYPAL_CLIENT_SECRET` de la cuenta Business, además de `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `PUBLIC_BASE_URL=https://tucamisetadefutbol.vercel.app` y `SHIPPING_EUR_CENTS=100`. En entorno de prueba usar `PAYPAL_MODE=sandbox` con sus credenciales correspondientes.
4. Revisar qué artículos son camisetas o pantalones y confirmar licencia, impuestos y datos de venta. Solo entonces marcar `active:true` en los productos autorizados. El catálogo actual mantiene los 4.229 productos desactivados y 18 variantes marcadas sin disponibilidad en los datos del proveedor.
5. Probar un pedido completo en Sandbox: aprobar el pago, comprobar la captura y la fila en `public.orders`. Antes de activar producción, añadir identidad y contacto del vendedor, procedimiento de devolución y costes de devolución. Establecer `STORE_CHECKOUT_ENABLED=true` únicamente después de verificar el flujo de producción y la información precontractual.

Precios actuales definitivos según el propietario; camisetas y pantalones disponibles, entrega estimada de 7 días laborables en España y envío fijo de 1 €. Camisetas normales y pantalones: cambios de talla y desistimiento legal dentro de 14 días naturales desde la recepción. Las camisetas hechas con nombre o dorsal elegido por el cliente no admiten cambio por talla o preferencia ni desistimiento; defectos o artículos distintos al pedido se sustituyen o reembolsan sin coste. La web no recoge todavía nombre o dorsal, por lo que esta excepción no se aplica automáticamente a los productos con nombre preimpreso.

Stripe se descartó por decisión del propietario. Los antiguos endpoints de webhook y consulta de estado de Stripe se conservan únicamente para no alterar pedidos de prueba; la cesta ya no los utiliza. Los pagos públicos permanecen desactivados mientras falten la conexión Business, la revisión del catálogo y los datos comerciales.
