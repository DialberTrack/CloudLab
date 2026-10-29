# CloudLab

CloudLab es una aplicación para administrar usuarios, workspaces y catálogos de
imágenes Docker. El repositorio contiene la API REST en `backend/` y una interfaz
React/Vite independiente en `frontend/`.

## Requisitos

- Node.js 20 o superior.
- pnpm 12.15.0.
- Docker y Docker Compose para MariaDB y las funciones de contenedores.

## Puesta en marcha

### API

```bash
cd backend
pnpm install
cp .env.example .env # si existe una plantilla local; también puedes crear .env manualmente
pnpm dev
```

La API escucha en `http://APP_HOST:APP_PORT/api`. El proceso valida las variables
de entorno al iniciar y termina si falta una variable obligatoria.

### Base de datos

Define las variables usadas por Compose antes de iniciar MariaDB:

```bash
export DB_ROOT_PASSWORD='cambia-esta-clave'
export DB_NAME='cloudlab'
export DB_USER='cloudlab'
export DB_PASSWORD='cambia-esta-clave'
docker compose up -d mariadb
```

El servicio publica MariaDB únicamente en `127.0.0.1:3306` y conserva sus datos
en el volumen `mariadb_data`. Los scripts de `db/init/` se ejecutan solamente
cuando el volumen se inicializa por primera vez.

### Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

El frontend actual es el scaffold inicial de React + Vite; todavía no consume la
API de CloudLab.

## Variables de entorno de la API

Crea `backend/.env` y no lo subas al repositorio:

```dotenv
NODE_ENV=development
LOG_LEVEL=info
LOG_FORMAT=text
APP_HOST=localhost
APP_PORT=8000
FRONTEND_URL=http://localhost:5173
DB_HOST=localhost
DB_USER=cloudlab
DB_PASSWORD=tu-clave
DB_NAME=cloudlab
JWT_SECRET=secreto-largo-para-access-tokens
JWT_REFRESH_SECRET=secreto-distinto-para-refresh-tokens
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
MAX_REFRESH_TOKENS_PER_USER=5
```

`NODE_ENV` acepta `development`, `production` o `test`; `LOG_LEVEL` acepta
`debug`, `info`, `warn` y `error`; `LOG_FORMAT` acepta `text` y `json`.
Las duraciones JWT usan un número seguido de `ms`, `s`, `m`, `h`, `d`, `w` o `y`.

## Scripts

Desde `backend/`:

| Comando             | Uso                                 |
| ------------------- | ----------------------------------- |
| `pnpm dev`          | API con recarga automática          |
| `pnpm build`        | Compilar TypeScript en `dist/`      |
| `pnpm start`        | Ejecutar la compilación             |
| `pnpm typecheck`    | Comprobar tipos sin emitir archivos |
| `pnpm test`         | Ejecutar Vitest                     |
| `pnpm lint`         | Ejecutar Oxlint                     |
| `pnpm format:check` | Comprobar formato                   |
| `pnpm check`        | Tipos, lint, formato y pruebas      |

Desde `frontend/`:

| Comando        | Uso                               |
| -------------- | --------------------------------- |
| `pnpm dev`     | Servidor de desarrollo Vite       |
| `pnpm build`   | Comprobar tipos y generar `dist/` |
| `pnpm lint`    | Ejecutar Oxlint                   |
| `pnpm preview` | Servir la compilación localmente  |

## Arquitectura

La API sigue las capas `routes -> controllers -> repositories -> base de datos`.
La autenticación usa access tokens JWT y refresh tokens en una cookie HTTP-only.
La validación de cuerpos y parámetros se realiza con Zod; los errores se traducen
a respuestas HTTP mediante el middleware global.

- `src/routes/`: rutas y métodos permitidos.
- `src/controllers/`: handlers HTTP.
- `src/services/`: lógica de workspaces y Docker.
- `src/repositories/`: contratos y persistencia MariaDB.
- `src/schemas/`: validación de entrada.
- `src/docker/`: cliente y operaciones Docker.
- `doc/README.md`: contrato detallado para consumidores de la API.
- `openapi.yaml`: contrato OpenAPI 3.1 importable en Swagger, Postman o generadores.
- `restclient/api-test.http`: ejemplos ejecutables desde un cliente REST.
- `tests/README.md`: convenciones y alcance de las pruebas.

## API

La documentación de endpoints, autenticación, permisos, cuerpos y errores está en
[`doc/README.md`](doc/README.md). Las rutas principales son:

- `/api/auth`: login, refresh, logout, perfil y cambio de contraseña.
- `/api/workspaces`: workspaces del usuario y operaciones Docker.
- `/api/container-images`: catálogo de imágenes.
- `/api/admin`: administración de usuarios y workspaces.

## Seguridad

No registres contraseñas, hashes ni tokens. Usa secretos JWT diferentes y
suficientemente largos en cada entorno. Las consultas SQL deben permanecer
parametrizadas y el archivo `.env` debe mantenerse fuera del control de versiones.
