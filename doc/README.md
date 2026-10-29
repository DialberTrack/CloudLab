# Contrato HTTP de CloudLab

Base URL local: `http://<APP_HOST>:<APP_PORT>/api`. Con la configuración
predeterminada es `http://localhost:8000/api`. Los endpoints de este documento
se muestran sin el prefijo `/api`.

El contrato formal y reutilizable está en
[`../openapi.yaml`](../openapi.yaml). Puede importarse en Swagger UI, Postman,
Insomnia o herramientas de generación de clientes.

## Convenciones

- Los errores responden `{ "error": "...", "code": "..." }`; los errores de
  validación `400` incluyen `issues`. `code` es estable para que el cliente
  pueda distinguir errores sin depender del texto.
- Un endpoint protegido requiere `Authorization: Bearer <accessToken>`.
- El refresh token se guarda en la cookie HTTP-only `refreshToken`. El cliente
  debe usar `credentials: 'include'` en `fetch`.
- El access token debe conservarse en memoria y renovarse con `/auth/refresh`.
- Los identificadores son UUID y las fechas se serializan como strings ISO 8601.
- Las rutas rechazan métodos no declarados con `405`.
- El frontend local usa `FRONTEND_URL` (por defecto `http://localhost:5173`);
  el backend permite ese origen con credenciales para enviar la cookie de refresh.

## Autenticación

### `POST /auth/login`

No requiere autenticación.

```json
{
    "email": "usuario@example.com",
    "password": "contraseña"
}
```

Responde `200` con un `accessToken`, un usuario sin `password` y establece
`refreshToken`:

```json
{
    "message": "Inicio de sesión exitoso",
    "accessToken": "<jwt>",
    "user": {
        "id": "<uuid>",
        "email": "usuario@example.com",
        "role": "user"
    }
}
```

Errores: `400` entrada inválida, `401` credenciales inválidas, `403` usuario
inactivo.

### `POST /auth/refresh`

No requiere header Bearer; usa la cookie `refreshToken`. Revoca la cookie
anterior, rota el token y responde `{ "message": "...", "accessToken": "<jwt>" }`.
Errores: `401` cookie ausente, inválida, expirada o revocada de forma concurrente;
`403` reutilización de un token revocado o usuario inactivo.

### `POST /auth/logout`

No requiere header Bearer. Revoca el refresh token si existe, limpia la cookie y
responde `{ "message": "Sesión cerrada correctamente" }`.

### `GET /auth/me`

Requiere access token. Responde `{ "user": { ... } }` sin `password` ni
`is_active`. Errores: `401` token ausente o inválido, `404` usuario inexistente.

### `POST /auth/change-password`

Requiere access token:

```json
{
    "current": "contraseña-actual",
    "password": "contraseña-nueva"
}
```

La nueva contraseña debe tener entre 8 y 255 caracteres. Revoca sesiones
anteriores, establece una nueva cookie y responde con un access token nuevo.

## Administración

Todas estas rutas requieren access token con rol `admin`.

| Método   | Endpoint                          | Descripción                |
| -------- | --------------------------------- | -------------------------- |
| `GET`    | `/admin/users`                    | Lista usuarios             |
| `POST`   | `/admin/users`                    | Crea usuario               |
| `GET`    | `/admin/users/:id`                | Consulta usuario           |
| `PATCH`  | `/admin/users/:id`                | Actualiza usuario          |
| `DELETE` | `/admin/users/:id`                | Elimina usuario            |
| `POST`   | `/admin/users/:id/reset-password` | Genera contraseña temporal |
| `GET`    | `/admin/workspaces`               | Lista todos los workspaces |

`GET /admin/users` acepta `page` (por defecto `1`), `limit` (por defecto `10`,
máximo `100`) y `q` para buscar por nombre o email. Responde con `data` y
`pagination`.

`POST /admin/users` recibe `name`, `email`, `password` y opcionalmente `role`
(`user` o `admin`). `PATCH` permite `name`, `email`, `role` e `is_active`, y
requiere al menos un campo. Las respuestas de usuario nunca incluyen
`password`.

Por seguridad, un administrador no puede autoeliminarse, auto-restablecerse,
modificarse ni eliminar a otro administrador. El restablecimiento devuelve la
contraseña temporal una sola vez. Errores habituales: `400` validación o UUID
inválido, `403` operación no permitida, `404` usuario inexistente y `409` email
duplicado.

## Workspaces

Todas las rutas requieren autenticación. Los usuarios normales solo acceden a
sus workspaces; `/admin/workspaces` requiere rol `admin`.

| Método   | Endpoint                  | Descripción                  |
| -------- | ------------------------- | ---------------------------- |
| `GET`    | `/workspaces`             | Lista workspaces del usuario |
| `POST`   | `/workspaces`             | Crea workspace               |
| `GET`    | `/workspaces/:id`         | Consulta workspace           |
| `DELETE` | `/workspaces/:id`         | Elimina workspace            |
| `POST`   | `/workspaces/:id/start`   | Inicia contenedor            |
| `POST`   | `/workspaces/:id/stop`    | Detiene contenedor           |
| `POST`   | `/workspaces/:id/restart` | Reinicia contenedor          |
| `GET`    | `/workspaces/:id/metrics` | Consulta métricas            |

Para crear:

```json
{
    "name": "Mi workspace",
    "container_image_id": "<uuid>"
}
```

`name` debe tener entre 3 y 100 caracteres. La respuesta de creación es `201`;
las operaciones de ciclo de vida devuelven el workspace actualizado. Las métricas
se envuelven en `{ "data": ... }`. Los estados posibles son `creating`,
`running`, `stopped`, `error` y `deleting`.

Los errores específicos de workspace incluyen:

- `WORKSPACE_NOT_FOUND` (`404`): el workspace no existe o no pertenece al usuario.
- `WORKSPACE_CONTAINER_UNAVAILABLE` (`409`): no hay contenedor asociado o fue
  eliminado externamente.
- `WORKSPACE_CREATION` (`503`): no fue posible crear el workspace.
- `WORKSPACE_OPERATION` (`503`): Docker no pudo iniciar, detener, reiniciar,
  eliminar o consultar métricas.
- `IMAGE_NOT_FOUND` (`422`): la imagen registrada no está disponible localmente
  en Docker.
- `DOCKER_UNAVAILABLE` (`503`): la API no pudo consultar o comunicarse con Docker.

## Imágenes de contenedor

Todas las rutas requieren autenticación. Cualquier usuario puede listar y
consultar imágenes activas; crear, actualizar y eliminar requiere `admin`.
Los administradores también pueden ver imágenes inactivas.

| Método   | Endpoint                | Descripción              |
| -------- | ----------------------- | ------------------------ |
| `GET`    | `/container-images`     | Lista catálogo visible   |
| `POST`   | `/container-images`     | Crea imagen (admin)      |
| `GET`    | `/container-images/:id` | Consulta imagen          |
| `PATCH`  | `/container-images/:id` | Actualiza imagen (admin) |
| `DELETE` | `/container-images/:id` | Elimina imagen (admin)   |

El cuerpo de creación acepta `name`, `image`, `description`, `icon`,
`sort_order` e `is_active`. `sort_order` por defecto es `0` e `is_active` por
defecto es `true`. `image` debe ser una referencia Docker válida, por ejemplo
`ubuntu:24.04` o `registry.example.com/team/app:1.0.0`. La actualización es
parcial, pero requiere al menos un campo. Una referencia duplicada responde `409`.

## Códigos HTTP

| Código | Significado                                               |
| -----: | --------------------------------------------------------- |
|  `200` | Operación exitosa                                         |
|  `201` | Recurso creado                                            |
|  `400` | Entrada inválida                                          |
|  `401` | Falta autenticación o token inválido                      |
|  `403` | Sin permisos, cuenta inactiva o token reutilizado         |
|  `404` | Recurso no encontrado                                     |
|  `405` | Método no permitido                                       |
|  `409` | Conflicto, como email o imagen duplicados                 |
|  `422` | Recurso válido pero no disponible para la operación       |
|  `500` | Error interno                                             |
|  `502` | Fallo al comunicarse con Docker o persistir una operación |
|  `503` | Servicio Docker temporalmente no disponible               |

## Cliente TypeScript

```ts
const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
});

const data = await response.json();
if (!response.ok) {
    throw new Error(data.error);
}

const accessToken = data.accessToken;
```

Hay ejemplos adicionales en [`../restclient/api-test.http`](../restclient/api-test.http).
