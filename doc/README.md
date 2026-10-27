# Documentacion de la API para frontend

## Convenciones generales

- Base URL local: `http://<APP_HOST>:<APP_PORT>/api`.
- Las respuestas JSON de error usan `{ "error": "..." }`.
- Los errores de validacion `400` agregan `issues`.
- Para endpoints protegidos enviar:

```http
Authorization: Bearer <accessToken>
```

- El refresh token se administra automaticamente en la cookie `refreshToken`.
  El frontend debe enviar credenciales (`credentials: 'include'` en `fetch`).
- El access token no se envia en la cookie; debe conservarse en memoria y renovarse
  con `/auth/refresh`.
- Las fechas de usuario se devuelven como valores de fecha serializados por JSON.

## Autenticacion

### `POST /auth/login`

Inicia sesion. No requiere access token.

**Body**

```json
{
    "email": "usuario@example.com",
    "password": "contraseña"
}
```

**Respuesta `200`**

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

Tambien establece la cookie HTTP-only `refreshToken`.

**Errores:** `400` body invalido, `401` credenciales invalidas, `403` usuario inactivo.

### `POST /auth/refresh`

Renueva la sesion usando la cookie `refreshToken`. No requiere header Bearer.

**Respuesta `200`**

```json
{
    "message": "Token refrescado exitosamente",
    "accessToken": "<nuevo-jwt>"
}
```

La cookie anterior se revoca y se establece una nueva. **Errores:** `401` cookie
ausente, invalida, expirada o revocada de forma concurrente; `403` reutilizacion
de un token ya revocado; `403` usuario inactivo.

### `POST /auth/logout`

Revoca el refresh token, si existe, y limpia la cookie. No requiere header Bearer.

**Respuesta `200`**

```json
{ "message": "Sesión cerrada correctamente" }
```

### `GET /auth/me`

Requiere Bearer token. Devuelve el perfil activo sin `password` ni `is_active`.

**Respuesta `200`**

```json
{
    "user": {
        "id": "<uuid>",
        "name": "Usuario",
        "email": "usuario@example.com",
        "role": "user",
        "createdAt": "2026-01-01T00:00:00.000Z",
        "updatedAt": "2026-01-01T00:00:00.000Z"
    }
}
```

**Errores:** `401` token ausente/invalido o usuario inactivo; `404` usuario inexistente.

### `POST /auth/change-password`

Requiere Bearer token y cambia la contraseña del usuario autenticado.

**Body**

```json
{
    "current": "contraseña-actual",
    "password": "contraseña-nueva"
}
```

**Respuesta `200`**

```json
{
    "message": "Contraseña cambiada exitosamente",
    "accessToken": "<nuevo-jwt>"
}
```

Tambien revoca las sesiones anteriores y establece una nueva cookie de refresh.
**Errores:** `400` validacion o contraseña actual incorrecta; `401` autenticacion invalida.

## Administracion de usuarios

Todos los endpoints de esta seccion requieren Bearer token con rol `admin`.

### `GET /admin/users`

Lista usuarios sin contraseñas. Query opcional:

| Parametro | Tipo | Default | Descripcion |
|---|---|---:|---|
| `page` | number | `1` | Pagina positiva |
| `limit` | number | `10` | Elementos por pagina, maximo `100` |
| `q` | string | - | Busca por nombre o email |

**Respuesta `200`**

```json
{
    "data": [],
    "pagination": {
        "page": 1,
        "limit": 10,
        "total": 0,
        "totalPages": 0
    }
}
```

### `POST /admin/users`

Crea un usuario. `role` es opcional y acepta `user` o `admin`.

```json
{
    "name": "Nuevo usuario",
    "email": "nuevo@example.com",
    "password": "contraseña-segura",
    "role": "user"
}
```

Responde `200` con `{ "user": { ... } }`, sin `password`. **Errores:** `400`
validacion, `409` email duplicado, `500` error de persistencia.

### `GET /admin/users/:id`

Obtiene un usuario por UUID. Responde `200` con `{ "user": { ... } }`, sin `password`.
**Errores:** `400` UUID invalido, `404` usuario inexistente.

### `PATCH /admin/users/:id`

Actualiza uno o mas campos: `name`, `email`, `role`, `is_active`. Se requiere al
menos un campo.

```json
{
    "name": "Nombre actualizado",
    "is_active": true
}
```

No se puede modificar el propio usuario ni cambiar el rol de un administrador.
**Errores:** `400` validacion, `403` operacion prohibida, `404` usuario inexistente,
`409` email duplicado.

### `DELETE /admin/users/:id`

Elimina un usuario no administrador. No permite autoeliminacion ni eliminar otro
administrador. Responde:

```json
{ "message": "Usuario eliminado exitosamente" }
```

**Errores:** `400` UUID invalido, `403` operacion prohibida, `404` usuario inexistente,
`500` si la eliminacion no afecta ninguna fila.

### `POST /admin/users/:id/reset-password`

Genera una contraseña temporal para un usuario no administrador. La contraseña
temporal se muestra una sola vez:

```json
{
    "message": "Contraseña restablecida exitosamente",
    "user": {
        "id": "<uuid>",
        "email": "usuario@example.com",
        "newPassword": "<temporal>"
    }
}
```

**Errores:** `400` UUID invalido, `403` auto-restablecimiento o usuario administrador,
`404` usuario inexistente.

## Workspaces

Rutas disponibles:

| Metodo | Endpoint | Proposito |
|---|---|---|
| `GET` | `/workspaces` | Listar workspaces |
| `POST` | `/workspaces` | Crear workspace |
| `GET` | `/workspaces/:id` | Consultar workspace |
| `DELETE` | `/workspaces/:id` | Eliminar workspace |
| `POST` | `/workspaces/:id/start` | Iniciar workspace |
| `POST` | `/workspaces/:id/stop` | Detener workspace |
| `POST` | `/workspaces/:id/restart` | Reiniciar workspace |
| `GET` | `/workspaces/:id/metrics` | Consultar metricas |

Estos handlers estan declarados pero actualmente son stubs sin logica de negocio ni
respuestas implementadas. El frontend no debe asumir un contrato de respuesta hasta
que se implementen sus repositorios, esquemas y controladores.

## Imagenes de contenedor

Todos los endpoints requieren Bearer token:

| Metodo | Endpoint | Proposito |
|---|---|---|
| `GET` | `/container-images` | Listar imagenes |
| `POST` | `/container-images` | Crear imagen |
| `GET` | `/container-images/:id` | Consultar imagen |
| `PATCH` | `/container-images/:id` | Actualizar imagen |
| `DELETE` | `/container-images/:id` | Eliminar imagen |

Estos handlers tambien son stubs actualmente y no tienen respuestas implementadas.

## Codigos HTTP frecuentes

| Codigo | Significado |
|---:|---|
| `200` | Operacion exitosa |
| `400` | Body, query o parametro invalido |
| `401` | Falta autenticacion o el token no es valido |
| `403` | Usuario autenticado sin permisos o cuenta inactiva |
| `404` | Recurso no encontrado |
| `409` | Conflicto, por ejemplo email duplicado |
| `500` | Error interno o eliminacion sin filas afectadas |

## Ejemplo de cliente

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
