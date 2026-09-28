# Tu Camiseta de Fútbol

Vista previa con 4.229 productos y 24.253 variantes del catálogo autorizado de Stellar Jerseys, obtenidos el 25/09/2026. USD / 1,1403 + 10 EUR por variante. La clasificación por etiquetas es aproximada. No hay sincronización, pagos ni pedidos activos. Las condiciones comerciales del proveedor no se trasladan a esta tienda.

## Cuentas de clientes

El registro, acceso, confirmación de correo y recuperación de contraseña usan Supabase Auth a través de `/api/auth`. Configura `SUPABASE_URL` y `SUPABASE_ANON_KEY` como variables de entorno del proyecto en Vercel. La clave `SUPABASE_SERVICE_ROLE_KEY` se reserva para pedidos y nunca se utiliza en el registro.

En Supabase → Authentication → URL Configuration configura el Site URL como `https://tucamisetadefutbol.vercel.app` y permite esa URL como destino de confirmación y recuperación. Mantén la confirmación por correo activada y configura SMTP para enviar correos de producción. Tras cambiar variables de entorno en Vercel, despliega una nueva versión para que las funciones reciban los valores.

## Asistente de la tienda

La burbuja de ayuda utiliza `/api/chat`. Si la conexión con el proveedor no está configurada, responde solo las preguntas frecuentes incluidas en el servidor e indica que la IA no está disponible para otras consultas. Los productos consultados son una vista previa: no se confirma disponibilidad. No se guardan las conversaciones en el proyecto.

### Cloudflare Workers AI

El chat usa Cloudflare cuando `CLOUDFLARE_ACCOUNT_ID` y `CLOUDFLARE_AI_API_TOKEN` están configuradas en el entorno Production de Vercel. Usa el modelo `@cf/meta/llama-3.1-8b-instruct-fp8-fast` y el endpoint Chat Completions de Workers AI. Crea el token desde Cloudflare → Workers AI → Use REST API → Create a Workers AI API Token y copia el Account ID desde esa misma página. Redepliega el proyecto para aplicar las variables. Si falta una variable o Cloudflare da error, el chat responde preguntas frecuentes. El chat ya no realiza solicitudes a OpenAI; conviene eliminar `OPENAI_API_KEY` de Vercel cuando se confirme el funcionamiento de Cloudflare.
