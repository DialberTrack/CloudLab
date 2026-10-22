import assert from "node:assert/strict";
import test from "node:test";
import {
    CreateContainerImageSchema,
    EditContainerImageSchema,
} from "../src/schemas/ContainerImageSchema.js";

test("CreateContainerImageSchema trims image fields and only accepts create data", () => {
    const result = CreateContainerImageSchema.safeParse({
        name: "  Node  ",
        description: "  Node runtime image  ",
        imageReference: "  node:22  ",
        iconUrl: "  https://example.com/node.png  ",
        id: "ignored",
        createdAt: "ignored"
    });

    assert.equal(result.success, true);
    if (result.success) {
        assert.deepEqual(result.data, {
            name: "Node",
            description: "Node runtime image",
            imageReference: "node:22",
            iconUrl: "https://example.com/node.png"
        });
    }
});

test("CreateContainerImageSchema rejects malformed image data", () => {
    const result = CreateContainerImageSchema.safeParse({
        name: "x",
        imageReference: "  "
    });

    assert.equal(result.success, false);
});

test("EditContainerImageSchema requires at least one field", () => {
    assert.equal(EditContainerImageSchema.safeParse({}).success, false);

    const result = EditContainerImageSchema.safeParse({ name: "Updated image" });
    assert.equal(result.success, true);
});
