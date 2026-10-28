# CloudLab API

API REST para gestionar usuarios, workspaces e imágenes de contenedores Docker.

## Requisitos previos

- Node.js 20 o superior
- pnpm 12
- MariaDB 10.6 o superior
- Docker, si se utilizarán las funciones de contenedores

## Instalación

```bash
git clone <URL_DEL_REPOSITORIO>
cd CloudLab/backend
pnpm install
```

## Configuración

Crea un archivo `.env` en `backend/` (no lo subas al repositorio):

```dotenv
NODE_ENV=development
LOG_LEVEL=info
LOG_FORMAT=text
APP_HOST=localhost
APP_PORT=8000
DB_HOST=localhost
DB_USER=cloudlab
DB_PASSWORD=tu contraseña
DB_NAME=cloudlab
JWT_SECRET=un secreto largo para access tokens
JWT_REFRESH_SECRET=otro secreto largo para refresh tokens
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
MAX_REFRESH_TOKENS_PER_USER=5
```

La base de datos debe contener las tablas requeridas por la aplicación. Las variables de
entorno se validan al iniciar; los secretos y credenciales no deben registrarse ni compartirse.
`LOG_LEVEL` acepta `debug`, `info`, `warn` o `error`; `LOG_FORMAT` acepta `text` o `json`.
El formato JSON facilita la integración con agregadores de logs en producción.

## Ejecución

```bash
pnpm dev       # desarrollo con recarga automática
pnpm build     # compilación TypeScript en dist/
pnpm start     # ejecución de la compilación
```

## Tests

```bash
pnpm test
pnpm exec vitest run tests/user-controller.test.ts
pnpm typecheck
```

Los tests unitarios mockean los repositorios y no requieren una conexión real a MariaDB.

## Catálogo de imágenes

La tabla `container_images` contiene las imágenes Docker que los usuarios pueden
seleccionar al crear un workspace. El script base para MariaDB puede ejecutarse con:

```sql
CREATE TABLE container_images (
    id CHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    image VARCHAR(255) NOT NULL,
    description TEXT NULL,
    icon VARCHAR(255) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_container_images_image (image),
    INDEX idx_container_images_active_order (is_active, sort_order)
);
```
