import assert from "node:assert/strict";
import test from "node:test";
import { CreateUserSchema, EditUserSchema } from "../src/schemas/UserSchema.js";

test("CreateUserSchema trims names and normalizes email addresses", () => {
    const result = CreateUserSchema.safeParse({
        name: "  Test User  ",
        email: "  TEST@EXAMPLE.COM ",
        password: "secure-password"
    });

    assert.equal(result.success, true);
    if (result.success) {
        assert.equal(result.data.name, "Test User");
        assert.equal(result.data.email, "test@example.com");
        assert.equal(result.data.role, "user");
    }
});

test("EditUserSchema rejects empty updates and normalizes provided fields", () => {
    assert.equal(EditUserSchema.safeParse({}).success, false);

    const result = EditUserSchema.safeParse({ email: " NEW@EXAMPLE.COM " });
    assert.equal(result.success, true);
    if (result.success) {
        assert.deepEqual(result.data, { email: "new@example.com" });
    }
});
