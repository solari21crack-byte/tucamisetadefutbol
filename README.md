# Tu Camiseta de Fútbol

Vista previa con 4.229 productos y 24.253 variantes del catálogo autorizado de Stellar Jerseys, obtenidos el 25/09/2026. USD / 1,1403 + 10 EUR por variante. La clasificación por etiquetas es aproximada. No hay sincronización, pagos ni pedidos activos. Las condiciones comerciales del proveedor no se trasladan a esta tienda.

## Cuentas de clientes

El registro, acceso, confirmación de correo y recuperación de contraseña usan Supabase Auth a través de `/api/auth`. Configura `SUPABASE_URL` y `SUPABASE_ANON_KEY` como variables de entorno del proyecto en Vercel. La clave `SUPABASE_SERVICE_ROLE_KEY` se reserva para pedidos y nunca se utiliza en el registro.

En Supabase → Authentication → URL Configuration configura el Site URL como `https://tucamisetadefutbol.vercel.app` y permite esa URL como destino de confirmación y recuperación. Mantén la confirmación por correo activada y configura SMTP para enviar correos de producción. Tras cambiar variables de entorno en Vercel, despliega una nueva versión para que las funciones reciban los valores.

## Asistente de la tienda

La burbuja de ayuda utiliza `/api/chat`. Configura `OPENAI_API_KEY` en las variables de entorno privadas de Vercel para activar las respuestas de IA y despliega de nuevo. `OPENAI_CHAT_MODEL` permite sustituir `gpt-4.1-mini`. La clave nunca se envía al navegador. Si falta, el chat responde solo las preguntas frecuentes incluidas en el servidor e indica que la IA no está disponible para otras consultas. Los productos consultados son una vista previa: no se confirma disponibilidad. No se guardan las conversaciones en el proyecto; la solicitud al proveedor usa `store: false`.
