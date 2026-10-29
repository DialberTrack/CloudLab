# Pruebas del backend

Las pruebas usan Vitest y deben poder ejecutarse sin MariaDB, Docker ni red.
Cada archivo prueba una unidad o una funcionalidad relacionada.

## Ejecutar

Desde `backend/`:

```bash
pnpm test
pnpm exec vitest run tests/auth-refresh.test.ts
pnpm exec vitest run tests/auth-refresh.test.ts -t "rota un token de actualización válido"
pnpm run test:watch
pnpm typecheck
```

## Convenciones

- Usa `describe` para agrupar y `it` para expresar comportamiento observable.
- Mockea repositorios con `vi.hoisted` y `vi.mock` antes de importar el módulo bajo
  prueba.
- Limpia las llamadas con `vi.clearAllMocks()` en `beforeEach`.
- No abras puertos ni dependas de la hora, la red o una base de datos real.
- Los nombres y mensajes de prueba se escriben en español.
- Comprueba respuestas completas, incluidos códigos HTTP, cookies y atributos de
  seguridad; no verifiques solamente que exista `Set-Cookie`.

## Cobertura actual

- `token-manager.test.ts`: firma, validación y forma de JWT.
- `auth-refresh.test.ts`: rotación, cookies, revocación y persistencia.
- `user-controller.test.ts`: permisos y respuestas de administración.
- `user-repository.test.ts`: persistencia y filas afectadas.
- `container-image-controller.test.ts`: catálogo, validación y permisos.
- `container-image-repository.test.ts`: consultas, valores predeterminados y borrado.
- `workspace-service.test.ts`: creación y operaciones del ciclo de vida.
- `error-middleware.test.ts`: formato seguro y códigos de errores HTTP.
- `logger.test.ts`: niveles y formatos de logging.

## Ejemplo de mock

```ts
const mocks = vi.hoisted(() => ({
    findById: vi.fn(),
}));

vi.mock('../src/repositories/user.repository.js', () => ({
    UserRepository: {
        findById: mocks.findById,
    },
}));

mocks.findById.mockResolvedValue(usuario);
```

## Autenticación

Como mínimo, cubre login correcto e incorrecto, refresh sin cookie, token
manipulado o revocado, usuario inactivo, rotación válida, logout y atributos de
cookie en producción (`secure`, `httpOnly`, `sameSite` y `path`). Nunca persistas
ni compares el token plano cuando el comportamiento requiere un hash.
