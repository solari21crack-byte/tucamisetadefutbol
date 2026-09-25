# Tu Camiseta de Fútbol

Vista previa de tienda para Vercel. El catálogo contiene 4.229 modelos y se generó de una copia puntual de Stellar Jerseys el 25/09/2026. Moneda EUR: USD / 1,1367 + 5 €, redondeado a céntimos. No se actualiza automáticamente. Las etiquetas de categoría son una clasificación provisional a partir del nombre del producto.

## Vista previa

Abre `public/index.html` mediante un servidor HTTP (por ejemplo `python3 -m http.server 8000 --directory public`). En Vercel, configura **Framework Preset: Other** y **Output Directory: public**. No hay dependencias de instalación.

## Antes de aceptar compras

1. Conectar Supabase y cargar productos y variantes, verificar derechos de imágenes, stock real, costes de envío y condiciones legales. El archivo `supabase/schema.sql` define la estructura y deja todos los productos desactivados.
2. Configurar cuenta Stripe y su webhooks, y desarrollar la creación de pedidos y cobros contra precios y disponibilidad del servidor. La vista previa no solicita pagos ni registra pedidos.
3. Verificar el catálogo de la nueva web y después configurar DNS en IONOS para apuntar el dominio a Vercel. Hasta entonces mantener el dominio actual.

No colocar claves de servicio de Supabase o Stripe en los archivos de `public/`.
