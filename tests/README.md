# Pruebas del backend con Vitest

## Ejecutar las pruebas

Desde `backend/`:

```bash
pnpm test
```

Para ejecutar Vitest en modo observación:

```bash
pnpm run test:watch
```

Para ejecutar un archivo concreto:

```bash
pnpm exec vitest run tests/auth-refresh.test.ts
```

Para ejecutar una prueba por nombre:

```bash
pnpm exec vitest run tests/auth-refresh.test.ts -t "rotates a valid refresh token"
```

## Estructura recomendada

Cada archivo debe probar una unidad concreta:

- `token-manager.test.ts`: firma, validación y forma del JWT.
- `auth-refresh.test.ts`: rotación, cookies, revocación y validación contra la base de datos.
- `feature-name.test.ts`: una funcionalidad adicional.

Usa `describe` para agrupar la funcionalidad e `it` para expresar un comportamiento observable:

```ts
import { describe, expect, it } from 'vitest';

describe('Mi funcionalidad', () => {
    it('rechaza una entrada inválida', () => {
        expect(() => validarEntrada('')).toThrow();
    });
});
```

## Mocking de repositorios

Las pruebas unitarias no deben requerir MariaDB. Usa `vi.mock` para reemplazar repositorios
antes de importar el módulo que los consume:

```ts
const mocks = vi.hoisted(() => ({
    findById: vi.fn(),
}));

vi.mock('../src/repositories/user.repository.js', () => ({
    UserRepository: {
        findById: mocks.findById,
    },
}));
```

Después configura el resultado en cada prueba:

```ts
mocks.findById.mockResolvedValue(usuario);
```

Restablece llamadas entre pruebas con `vi.clearAllMocks()` en `beforeEach`.

## Probar handlers de Express

No es necesario abrir un puerto. Crea objetos mínimos para `Request` y `Response` y usa
spies para verificar cookies y respuestas:

```ts
const res = {
    cookie: vi.fn(),
    clearCookie: vi.fn(),
    json: vi.fn(),
};

await AuthController.refresh(req, res as never, vi.fn());
expect(res.cookie).toHaveBeenCalledOnce();
```

Para errores async:

```ts
await expect(AuthController.refresh(req, res as never, vi.fn()))
    .rejects.toMatchObject({ statusCode: 401 });
```

## Qué probar en autenticación

Como mínimo, agrega casos para:

1. Login correcto: crea cookie HTTP-only y persiste el hash, nunca el token plano.
2. Credenciales incorrectas: responde error sin crear sesión.
3. Refresh sin cookie: `401`.
4. Refresh firmado con secreto incorrecto o manipulado: `401`.
5. `jti` inexistente, hash distinto o usuario distinto: `401`.
6. Token revocado reutilizado: revoca todos los tokens del usuario y devuelve `403`.
7. Usuario inactivo: no recibe nuevos tokens.
8. Refresh válido: revoca el anterior, crea uno nuevo y reemplaza la cookie.
9. Logout: revoca el `jti` y limpia la cookie.
10. Cookie en producción: `secure`, `httpOnly`, `sameSite=strict` y `path` correctos.

## Reglas para no generar falsos positivos

- No compares solamente que exista `Set-Cookie`; verifica sus atributos.
- No uses el token plano como valor persistido en la base de datos.
- Usa fechas futuras y pasadas explícitas para probar expiración.
- Aísla cada prueba de la base de datos y de la hora del sistema cuando sea necesario.
- Ejecuta `pnpm run typecheck` además de `pnpm test`.
