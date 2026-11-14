import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mediaKind, giftAmount } from './social-rules';
import { decodeBloxdschem, encodeBloxdschem } from './bloxdschem';
test('owners can choose positive whole coin gifts', () => { assert.equal(giftAmount('17'), 17); assert.throws(() => giftAmount('-1')); assert.throws(() => giftAmount('1.2')); });
test('posts support images, GIFs, and videos', () => { assert.equal(mediaKind({type:'image/png',size:42}), 'image'); assert.equal(mediaKind({type:'image/gif',size:42}), 'image'); assert.equal(mediaKind({type:'video/mp4',size:42}), 'video'); assert.throws(() => mediaKind({type:'text/html',size:42})); });
test('schematic uploads reject truncated files instead of looping', () => { assert.throws(() => decodeBloxdschem(new Uint8Array([4,0,0,0,128]))); const result = decodeBloxdschem(encodeBloxdschem('Test', {'0,0,0':'Stone'}, [16,16,16])); assert.equal(result.vox['0,0,0'], 'Stone'); });
