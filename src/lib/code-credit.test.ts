import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { CODE_CREDIT, withCodeCredit } from "./code-credit";
import { generate, makeNode } from "./blocks";
import { schemCode } from "./schem";

describe("BloxdStudio credits", () => {
  test("every editor script includes the tool credit and join address", () => {
    assert.ok(generate([makeNode("onJoin")]).startsWith(CODE_CREDIT));
    assert.ok(generate([]).includes("https://bloxd-studio.lovable.app"));
  });
  test("schematic and road code includes credit even for an empty build", () => {
    assert.ok(schemCode({ "0,0,0": "Stone" }).startsWith(CODE_CREDIT));
    assert.ok(schemCode({}).startsWith(CODE_CREDIT));
  });
  test("shared and AI code gets one credit without changing the script", () => {
    const source = 'onPlayerJoin = (playerId) => { api.sendMessage(playerId, "Hi"); };';
    assert.equal(withCodeCredit(withCodeCredit(source)), `${CODE_CREDIT}\n${source}`);
    assert.ok(CODE_CREDIT.startsWith("/*"));
    assert.ok(CODE_CREDIT.endsWith("*/"));
  });
});