import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { loadHomeStats } from "./home-stats";

describe("private community counts", () => {
  test("signed-out visitors never request or receive a community-post count", async () => {
    const requested: string[] = [];
    const stats = await loadHomeStats(undefined, async (table) => {
      requested.push(table);
      return 0;
    });
    assert.deepEqual(requested, ["forge_posts"]);
    assert.equal(stats.posts, undefined);
    assert.equal(stats.forge, 0);
  });

  test("signed-in visitors can receive the authorized count", async () => {
    const stats = await loadHomeStats("signed-in-user", async (table) => table === "hub_posts" ? 7 : 2);
    assert.equal(stats.posts, 7);
    assert.equal(stats.forge, 2);
  });
});