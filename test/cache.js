'use strict';

const assert = require('assert');
const Cache = require('../');

describe('Cache', () => {
  it('.get() should return undefined if no value was stored', async() => {
    const cache = new Cache();

    assert.deepStrictEqual(await cache.get('test'), undefined);
  });

  it('.get() should return previously stored value', async() => {
    const cache = new Cache();

    await cache.set(['a', 'b', 'c'], {foo: 'bar'});
    assert.deepStrictEqual(await cache.get(['a', 'c', 'b']), {foo: 'bar'});
  });

  it('.invalidate() should invalidate all cache records related to key part', async() => {
    const cache = new Cache();

    await cache.set(['a', 'b', 'c'], {foo: 'bar'});
    await cache.set(['b', 'c', 'd'], {foo: 'baz'});
    await cache.set(['c', 'd', 'e'], {foo: 'qux'});
    await cache.invalidate(['a', 'b']);

    assert.deepStrictEqual(await cache.get(['a', 'b', 'c']), undefined);
    assert.deepStrictEqual(await cache.get(['b', 'c', 'd']), undefined);
    assert.deepStrictEqual(await cache.get(['c', 'd', 'e']), {foo: 'qux'});
  });

  it('.delete() should delete stored value', async() => {
    const cache = new Cache();

    await cache.set(['a', 'b', 'c'], {foo: 'bar'});
    await cache.delete(['a', 'b', 'c'], {foo: 'bar'});
    assert.deepStrictEqual(await cache.get(['a', 'c', 'b']), undefined);
  });
});
