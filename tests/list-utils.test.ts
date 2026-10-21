import assert from "node:assert/strict";
import test from "node:test";
import { ListUtils } from "../src/utils/ListUtils.js";

test("pagination parameters support Lowdb, Mongoose and MySQL", () => {
    const params = ListUtils.getPaginationParams("3", "20");

    assert.equal(params.page, 3);
    assert.equal(params.limit, 20);
    assert.equal(params.offset, 40);
    assert.deepEqual(params.lowdb, { start: 40, end: 60 });
    assert.deepEqual(params.mongoose, { skip: 40, limit: 20 });
    assert.deepEqual(params.mysql, { limit: 20, offset: 40 });
});

test("pagination normalizes invalid values and enforces the maximum limit", () => {
    const params = ListUtils.getPaginationParams("not-a-page", "500");

    assert.equal(params.page, 1);
    assert.equal(params.limit, 100);
    assert.equal(params.offset, 0);
});

test("paginateAndFilter counts all matching items before slicing", () => {
    const params = ListUtils.getPaginationParams(2, 2);
    const result = ListUtils.paginateAndFilter([1, 2, 3, 4, 5], params, value => value > 2);

    assert.deepEqual(result, {
        data: [5],
        total: 3,
        page: 2,
        limit: 2,
        totalPages: 2
    });
});
