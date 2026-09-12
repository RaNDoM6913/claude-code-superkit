import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lookup } from '../src/lookup.js';

test('missing row returns null', () => assert.equal(lookup(null), null));
test('existing row returns its id', () => assert.equal(lookup({ id: 42 }), 42));
