import assert from "node:assert/strict";
import test from "node:test";
import jwt from "jsonwebtoken";

process.env.NODE_ENV = "test";
process.env.PORT = "8123";
process.env.JWT_SECRET = "test-access-secret";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
process.env.JWT_EXPIRES_IN = "15m";
process.env.JWT_REFRESH_EXPIRES_IN = "2h";

const { env } = await import("../src/config/env.js");
const { TokenManager } = await import("../src/utils/TokenManager.js");

test("environment parsing converts port and keeps refresh-cookie lifetime aligned", () => {
    assert.equal(env.PORT, 8123);
    assert.equal(env.JWT_REFRESH_COOKIE_MAX_AGE_MS, 2 * 60 * 60 * 1000);
});

test("token verification validates the payload shape", () => {
    const user = {
        id: "user-id",
        name: "Test User",
        email: "test@example.com",
        password: "hashed-password",
        role: "admin" as const,
        createdAt: new Date().toISOString(),
        active: true
    };
    const accessToken = TokenManager.generateAccessToken(user);
    const malformedToken = jwt.sign("not-an-object", env.JWT_SECRET);

    assert.equal(TokenManager.verifyAccessToken(accessToken)?.id, user.id);
    assert.equal(TokenManager.verifyAccessToken(malformedToken), null);
});
