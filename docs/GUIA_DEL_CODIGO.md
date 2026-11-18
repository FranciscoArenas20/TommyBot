# Guía de código de Tommy Bot

Esta guía describe el código TypeScript del backend y su relación con los servicios que forman la demo. Se centra en lo que está implementado hoy. La fase actual responde consultas de productos, disponibilidad y precios de prueba. El registro de pedidos pertenece a la fase 2.

## 1. Arquitectura general

```text
WhatsApp personal
   ↓ mensaje entrante
Evolution API (instancia Tommy Bot)
   ↓ webhook MESSAGES_UPSERT
Backend: POST /api/evolution/incoming
   ├─ valida un secreto entre servicios
   ├─ permite solo el número configurado para la demo
   └─ remite el evento al webhook de n8n
n8n: workflow de catálogo
   ├─ consulta el backend para generar una respuesta
   └─ envía el texto a Evolution API
Backend: POST /api/chat/inteligente
   ├─ vuelve a verificar el número permitido
   ├─ analiza el mensaje con Groq
   ├─ consulta el catálogo PostgreSQL
   └─ redacta la respuesta con Groq
```

Evolution mantiene la sesión de WhatsApp. n8n coordina los pasos. El backend conserva las reglas de acceso, consulta los datos y llama a Groq. PostgreSQL es la fuente del catálogo.

El repositorio no contiene el contenido de los workflows. n8n los guarda en su propia base de datos. Los nombres y pasos descritos abajo corresponden a los workflows que se inspeccionaron en la instancia TommyBot.

## 2. Archivos del proyecto

### `src/index.ts`

Punto de inicio del servidor.

1. Carga `reflect-metadata`, que TypeORM necesita para sus decorators.
2. Carga variables desde `.env` con `dotenv`.
3. Inicializa PostgreSQL.
4. Corre el seed de datos iniciales si aún no hay categorías.
5. Inicia Express en `PORT` o en el puerto 3000.

Si la conexión de PostgreSQL falla, el proceso termina. Por eso `/health` solo está disponible cuando el backend ya pudo iniciar.

### `src/api/server.ts`

Crea la aplicación Express y registra middleware y rutas antiguas.

- `cors()` habilita llamadas desde otros orígenes.
- `express.json()` y `express.urlencoded()` leen cuerpos JSON y formularios.
- Un middleware devuelve 503 cuando TypeORM todavía no conecta.
- Monta el router de fase 1 definido en `phaseOne.ts`.

Rutas HTTP declaradas aquí:

| Método y ruta | Función |
|---|---|
| `GET /health` | Estado básico del backend |
| `GET /api/productos` | Lista productos disponibles |
| `GET /api/productos/buscar?nombre=` | Busca productos por coincidencia parcial |
| `GET /api/productos/categoria/:categoria` | Lista productos de una categoría |
| `GET /api/delivery/buscar?zona=` | Busca zonas de entrega |
| `POST /api/chat/inteligente` | Implementación anterior del chat, conservada en este archivo |
| `POST /api/pedidos/crear` | Guarda un pedido; endpoint de la fase 2 |

La ruta anterior `/api/chat/inteligente` de este archivo quedó conservada. Express registra antes el router de `phaseOne.ts`, que también define esa ruta y responde primero. El código antiguo ayuda a entender la primera versión del chat, aunque no es la ruta que procesa actualmente esas peticiones.

El endpoint de pedidos guarda el objeto de productos como JSON dentro de una columna de texto. Actualmente no valida el contenido ni restringe el acceso por número. No forma parte del flujo publicado de fase 1.

### `src/api/phaseOne.ts`

Contiene las rutas actuales del chatbot de prueba.

#### `POST /api/evolution/incoming`

Evolution envía aquí los eventos de WhatsApp. El backend:

1. Compara el header `x-tommy-secret` con `TOMMY_WEBHOOK_SECRET`.
2. Acepta únicamente el evento `messages.upsert` de la instancia `Tommy Bot`.
3. Descarta mensajes enviados por el propio bot.
4. Normaliza remitentes de WhatsApp `@lid` usando `remoteJidAlt` cuando existe.
5. Compara el remitente con la lista de números de `TOMMY_TEST_NUMBERS` (o con `TOMMY_TEST_NUMBER` si no se definió la lista).
6. Requiere texto normal o texto extendido.
7. Remite el evento al webhook guardado en `TOMMY_N8N_WEBHOOK`.

Responde 403 si el secreto interno no coincide, 204 si el evento no debe activar la automatización, 200 cuando n8n acepta el evento y 502 si no puede contactar el webhook.

#### `POST /api/chat/inteligente`

n8n llama a esta ruta para obtener el texto que enviará al usuario.

- Vuelve a comprobar `clientNumber` contra la lista de números autorizados.
- Ejecuta `GroqService.analizarMensaje()` para extraer intención, producto y categoría.
- Consulta los productos de PostgreSQL.
- Si el usuario menciona una marca, selecciona esa marca. Si menciona una categoría, selecciona sus productos. Si no identifica ninguno, prepara la lista disponible.
- Arma datos de respuesta con nombre, disponibilidad, precio por kilo y categoría.
- Ejecuta `GroqService.generarRespuesta()` y devuelve `respuesta`, `analisis`, `productos`, `productosRelacionados` y `zonasDelivery`.

`demoPrices` contiene precios de ejemplo en dólares para diez alimentos. Se usan solo cuando el precio real de `precioKilo` está vacío o es cero. El campo `precioEsDemo` permite al modelo marcar esos importes como demostración. Hay que reemplazarlos por precios autorizados antes de presentar el bot como catálogo real.

La allowlist depende de `TOMMY_TEST_NUMBERS` (separados por comas) o, en su defecto, de `TOMMY_TEST_NUMBER`. Sin ninguna de las dos variables el endpoint rechaza el acceso.

### `src/ai/groq.ts`

Cliente de Groq y prompts del modelo.

- Lee `GROQ_API_KEY` al inicializar el SDK.
- Usa `GROQ_MODEL` o `openai/gpt-oss-20b` por defecto.
- `analizarMensaje()` solicita JSON con intención, productos, categoría, zona, cantidad y confianza. El prompt define las intenciones de negocio. Si Groq responde con un error o JSON inválido, registra el error y retorna intención `otro`.
- `generarRespuesta()` envía el mensaje y los datos de productos al modelo. El prompt le indica que use solamente esa información, que no invente datos y que responda de forma breve.
- Ambas funciones quitan bloques `<think>` antes de procesar la salida.
- Si falla la redacción, `generarRespuesta()` devuelve un texto genérico de error.

En el chat de fase 1, un mensaje normalmente causa dos solicitudes a Groq: una para analizar y otra para redactar. El catálogo y el filtro de remitente se procesan en el backend, no los decide el modelo.

### `src/database/data-source.ts`

Configura TypeORM para PostgreSQL usando `DATABASE_URL` y registra las cuatro entidades.

` synchronize: true` hace que TypeORM cree o ajuste tablas al iniciar. En la configuración actual también está activo en producción. Eso facilita la demo, pero conviene migrar a cambios versionados y desactivar `synchronize` antes de operar con datos importantes.

La configuración TLS usa `rejectUnauthorized: false`. El comentario original menciona Render, aunque el despliegue actual está en Railway.

### `src/database/init.ts`

Abre la conexión de TypeORM. Registra el éxito y vuelve a lanzar cualquier error para que `src/index.ts` detenga el arranque.

### `src/database/seed.ts`

Inserta datos de prueba solo cuando no existe ninguna categoría.

Crea cinco categorías, diez marcas de alimentos y cuatro zonas de delivery. Los productos empiezan con precios cero y disponibles. El seed no actualiza los datos existentes y no rellena categorías faltantes cuando ya hay al menos una.

### `src/database/queries.ts`

Agrupa consultas TypeORM:

- `buscarProducto()` usa coincidencia parcial `LIKE`, exige `disponible = true` e incluye la relación categoría.
- `obtenerProductosPorCategoria()` usa coincidencia parcial sobre el nombre de la categoría y exige disponibilidad.
- `buscarZonaDelivery()` busca una zona por coincidencia parcial y disponibilidad.
- `listarCategorias()` recupera las categorías.
- `listarProductosDisponibles()` lista productos disponibles junto con su categoría, ordenados por categoría y nombre.

Las consultas usan `LIKE` de PostgreSQL. No convierten explícitamente a minúsculas, así que la sensibilidad a mayúsculas depende de la comparación configurada por la base de datos.

### `src/database/entities/`

Las clases representan tablas y relaciones de PostgreSQL.

- `Categoria.ts` representa `categorias`. Tiene nombre, descripción, fecha de creación y relación uno a muchos con productos.
- `Producto.ts` representa `productos`. Guarda categoría, precios por kilo y saco, peso del saco, disponibilidad y descripción. Cada producto pertenece a una categoría.
- `DeliveryZona.ts` representa `delivery_zonas`. Guarda nombre de zona, costo, tiempo estimado y disponibilidad.
- `Pedido.ts` representa `pedidos`. Guarda nombre y teléfono del cliente, productos serializados como texto JSON, total, zona, estado y fecha de creación.

Los campos `decimal` de PostgreSQL pueden llegar al código como strings dependiendo del driver. El código de fase 1 los convierte a `Number` al evaluar el precio.

## 3. Workflows de n8n

### Workflow de catálogo de fase 1

El workflow guardado en n8n se llama **TommyBot · Catálogo de prueba** y contiene cuatro nodos:

1. `Webhook - Whatsapp` recibe el evento de Evolution.
2. `Filter` compara el JID de origen con el número de prueba.
3. `Consultar catálogo` hace POST a `/api/chat/inteligente` y envía el texto y número.
4. `Enviar Mensaje al Cliente` hace POST a Evolution `message/sendText/Tommy Bot` con la respuesta.

La verificación de remitente está duplicada deliberadamente: el backend filtra antes de n8n y n8n vuelve a comprobarlo antes de llamar al chat. El backend también verifica el número otra vez en `/api/chat/inteligente`.

### Workflow original

El workflow original **TommyBot** incluye extracción del mensaje, solicitud al endpoint de chat, envío al usuario y una rama para detectar y registrar pedidos. Contiene nodos como `Definir si es un Pedido`, `Ordenar datos para el Pedido` y `Post al EP de Crear Pedido`.

Ese flujo se inspeccionó para conservar el diseño de fase 2, pero no es el flujo de catálogo de prueba. El endpoint de crear pedido del backend permanece disponible.

## 4. Variables de entorno

Las variables se configuran en Railway. Los valores secretos no deben añadirse a documentación ni al repositorio.

| Variable | Servicio | Para qué se usa |
|---|---|---|
| `DATABASE_URL` | TommyBot_Backend | Conexión PostgreSQL del backend |
| `GROQ_API_KEY` | TommyBot_Backend | Autentica solicitudes a Groq |
| `GROQ_MODEL` | TommyBot_Backend | Modelo opcional; por defecto `openai/gpt-oss-20b` |
| `PORT` | TommyBot_Backend | Puerto HTTP del backend |
| `TOMMY_TEST_NUMBERS` | TommyBot_Backend | Números autorizados separados por comas, sin prefijo `+` |
| `TOMMY_TEST_NUMBER` | TommyBot_Backend | Número autorizado individual (compatibilidad), sin prefijo `+` |
| `TOMMY_WEBHOOK_SECRET` | TommyBot_Backend y configuración del webhook de Evolution | Protege la entrada desde Evolution al backend |
| `TOMMY_N8N_WEBHOOK` | TommyBot_Backend | URL del webhook del workflow de catálogo |

Evolution usa además `AUTHENTICATION_API_KEY` para autenticar clientes API y sus variables de conexión PostgreSQL/Redis. n8n usa variables de conexión de PostgreSQL y Redis, modo queue y `N8N_ENCRYPTION_KEY` para credenciales guardadas.

## 5. Cómo probar el backend

El endpoint de chat acepta el número permitido y no envía mensajes a WhatsApp por sí solo:

```powershell
$body = @{ mensaje = 'Hola'; clientNumber = '584245620837' } | ConvertTo-Json
Invoke-RestMethod -Method Post `
  -Uri 'https://tommybotbackend-production.up.railway.app/api/chat/inteligente' `
  -ContentType 'application/json' -Body $body
```

Para probar un precio, cambia el texto a `¿Cuánto cuesta Mirringo?`. La respuesta de precio puede ser un dato demo.

## 6. Limitaciones conocidas de esta versión

- La memoria de conversación estática no está implementada. Una pregunta como “¿y el precio?” no necesariamente conserva el producto de un turno anterior.
- Los precios en `demoPrices` son ilustrativos, no datos comerciales confirmados.
- El seed se salta si encuentra cualquier categoría. No es un reconciliador de catálogo.
- El workflow original de pedidos no forma parte del flujo de catálogo de fase 1.
- El endpoint de pedidos todavía necesita validación de datos y control de acceso antes de usarlo con clientes.
- Hay dos implementaciones de `/api/chat/inteligente`; la del router de fase 1 se registra primero y es la usada por la demo.
- El middleware de Express espera PostgreSQL antes de responder incluso a `/health`.
- Hay endpoints de catálogo y pedido en `server.ts` sin autenticación propia. Railway expone el servicio públicamente, así que deben limitarse si se van a abrir al público general.

## 7. Árbol de código

```text
src/
├── index.ts                       # Arranque, conexión y seed
├── api/
│   ├── server.ts                  # Express y API histórica
│   └── phaseOne.ts                # Allowlist, webhook Evolution y catálogo con Groq
├── ai/
│   └── groq.ts                    # Análisis y generación de respuestas con Groq
└── database/
    ├── data-source.ts             # Configuración TypeORM/PostgreSQL
    ├── init.ts                    # Inicialización de conexión
    ├── seed.ts                    # Datos iniciales de demostración
    ├── queries.ts                 # Consultas de catálogo
    └── entities/
        ├── Categoria.ts
        ├── Producto.ts
        ├── DeliveryZona.ts
        └── Pedido.ts
```

## 8. Archivos auxiliares y configuración

- `package.json` define dependencias y comandos. `npm run dev` inicia TypeScript con nodemon; `npm run build` compila `src/` en `dist/`; `npm start` ejecuta el JavaScript compilado. Los comandos `migration:*` son scaffolding de TypeORM. No hay pruebas automatizadas configuradas.
- `tsconfig.json` fija ES2020 y CommonJS, compila solo `src/**/*`, usa modo estricto y activa decorators para TypeORM.
- `prueba.ts` es un script antiguo para consultar modelos de Gemini usando `GEMINI_API_KEY`. No forma parte del arranque del backend ni de la integración actual de Groq. Imprime un prefijo de la clave al ejecutarse.
- `whatsapp-test.js` es un script de prueba antiguo para consultar Evolution y enviar un mensaje. Tiene URL, nombre de instancia y una API key escritos directamente en el archivo. No se usa en el flujo actual y sus credenciales deben considerarse obsoletas. Antes de ejecutar o conservar ese script, mueve la clave a una variable de entorno y rota la clave antigua si sigue válida.
- `AGENTS.md` contiene convenciones y contexto de trabajo para herramientas de desarrollo. Parte de su texto es anterior a la recuperación en Railway, así que la guía actual prevalece para describir la demo desplegada.
