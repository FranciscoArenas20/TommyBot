# TommyBot

Backend para Mascotienda Tommy — asistente de atención al cliente con IA (Gemini) integrado a n8n/WhatsApp.

## Comandos

```bash
npm run dev           # Dev con nodemon + ts-node (puerto 3000 por defecto)
npm run build         # Compilar a dist/
npm run start         # Ejecutar build en producción
npm run migration:run        # Ejecutar migraciones pendientes
npm run migration:generate   # Generar migración desde cambios en entidades
npm run migration:revert     # Revertir última migración
```

No hay tests configurados.

## Arquitectura

Single-package TypeScript. Tres módulos en `src/`:

| Directorio | Responsabilidad |
|---|---|
| `src/api/server.ts` | Express 5 — define todos los endpoints |
| `src/ai/gemini.ts` | GeminiService — analiza intención del cliente y genera respuestas |
| `src/database/` | TypeORM + PostgreSQL — entidades, queries, seed |

**Flujo de inicio** (`src/index.ts`): `dotenv → initializeDatabase → seedDatabase → app.listen`. La DB debe estar conectada antes de que el servidor arranque.

## Base de datos

PostgreSQL (Railway). Conexión vía `DATABASE_URL` en `.env`.

**Entidades** (en `src/database/entities/`):

- **Categoria** → `categorias` (nombre, descripción)
- **Producto** → `productos` (nombre, categoriaId, precioKilo, precioSaco, pesoSacoKg, disponible)
- **DeliveryZona** → `delivery_zonas` (zona, precio, tiempoEstimado, disponible)
- **Pedido** → `pedidos` (clienteNombre, clienteTelefono, productos como JSON string, total, zonaEntrega, estado)

**Importante**: `synchronize: true` en `data-source.ts`. Esto auto-crea/modifica tablas en dev pero **debe ser `false` en producción**. Las migraciones están configuradas en `src/database/migrations/**/*.ts` pero el directorio aún no existe.

**Seed**: `src/database/seed.ts` inserta datos inicia (5 categorías, 10 productos, 4 zonas). Se saltea si ya hay categorías en la BD.

## API Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/api/productos` | Lista todos los productos disponibles |
| GET | `/api/productos/buscar?nombre=` | Busca producto por nombre (LIKE) |
| GET | `/api/productos/categoria/:categoria` | Productos por categoría |
| GET | `/api/delivery/buscar?zona=` | Busca zona de delivery |
| POST | `/api/chat/inteligente` | Chat con IA — recibe `{mensaje, clientNumber}`, retorna análisis + respuesta |
| POST | `/api/pedidos/crear` | Crea pedido — recibe `{clienteNombre, clienteTelefono, productos, total, zonaEntrega}` |

## IA (Gemini)

`GeminiService` tiene dos métodos estáticos:

1. **`analizarMensaje(mensaje)`** — Extrae intención (JSON): `consulta_precio`, `consulta_producto`, `consulta_delivery`, `consulta_horario`, `pedido`, `saludo`, `otro`. También extrae **categoria** (Gatarina, Perrarina, etc.), productos, zona y cantidad mencionados. Las categorías se extraen separadas de los productos — "gatarina" va en `categoria`, "Mirringo" va en `productos`.

2. **`generarRespuesta(contexto)`** — Genera respuesta conversacional para WhatsApp con emojis. Reglas estrictas anti-hallucinación: nunca inventa nombres ni precios. Si un producto no se encuentra, sugiere productos relacionados de la misma categoría. Precios 0.00 → decir que están disponibles y consultar precio.

## Convenciones

- TypeScript strict mode con decorators experimentales (`experimentalDecorators`, `emitDecoratorMetadata`)
- CommonJS modules, target ES2020
- `strictPropertyInitialization: false` — las entidades TypeORM no inicializan propiedades en el constructor
- Queries en `src/database/queries.ts` usan `Like()` para búsqueda flexible
- Middleware en `server.ts` bloquea requests si la DB no está inicializada (503)
- Idiomas: código y comentarios en español

## Variables de entorno requeridas

| Variable | Descripción |
|---|---|
| `GEMINI_API_KEY` | API key de Google Gemini |
| `DATABASE_URL` | Connection string PostgreSQL |
| `PORT` | Puerto del servidor (default: 3000) |
| `NODE_ENV` | development / production |

## CI/CD

GitHub Actions con Claude Code para review automática en PRs (`.github/workflows/claude-code-review.yml`) y comentarios con `@claude` (`.github/workflows/claude.yml`).
