'use strict';

const assert = require('assert');
const Cache = require('../');

async function wait(delay) {
    return new Promise((resolve) => setTimeout(resolve, delay));
}

describe('Cache', () => {
    it('.get() should return undefined if no value was stored', async () => {
        const cache = new Cache();

        assert.deepStrictEqual(await cache.get('test'), undefined);
    });

    it('.get() should return previously stored value', async () => {
        const cache = new Cache();

        await cache.set(['a', 'b', 'c'], {foo: 'bar'});

        assert.deepStrictEqual(await cache.get(['a', 'c', 'b']), {foo: 'bar'});
    });

    it('.invalidate() should invalidate all cache records related to key part', async () => {
        const cache = new Cache();

        await cache.set(['a', 'b', 'c'], {foo: 'bar'});
        await cache.set(['b', 'c', 'd'], {foo: 'baz'});
        await cache.set(['c', 'd', 'e'], {foo: 'qux'});
        await cache.invalidate(['a', 'b']);

        assert.deepStrictEqual(await cache.get(['a', 'b', 'c']), undefined);
        assert.deepStrictEqual(await cache.get(['b', 'c', 'd']), undefined);
        assert.deepStrictEqual(await cache.get(['c', 'd', 'e']), {foo: 'qux'});
    });

    it('.delete() should delete stored value', async () => {
        const cache = new Cache();

        await cache.set(['a', 'b', 'c'], {foo: 'bar'});
        await cache.delete(['a', 'b', 'c']);

        assert.deepStrictEqual(await cache.get(['a', 'c', 'b']), undefined);
    });

    it('.clear() should clear local cache storage', async () => {
        const cache = new Cache();

        await cache.set('a', 1);
        await cache.set('b', 2);
        await cache.set('c', 3);

        assert.deepStrictEqual(cache._storage.size, 3);

        cache.clear();

        assert.deepStrictEqual(cache._storage.size, 0);
    });

    it('.has() should work correctly', async () => {
        const cache = new Cache();

        await cache.set('a', {foo: 'bar'});
        await cache.set('b', {foo: 'baz'});
        await cache.set('c', {foo: 'qux'});
        await cache.delete('b');

        assert.deepStrictEqual(await cache.get('a'), {foo: 'bar'});
        assert.deepStrictEqual(await cache.get('b'), undefined);
        assert.deepStrictEqual(await cache.get('c'), {foo: 'qux'});
    });

    it('.set() with ttl should invalidate old values', async () => {
        const cache = new Cache({ttl: 400});

        await cache.set('a', {foo: 'bar'}, 100);
        await cache.set('b', {foo: 'baz'}, 300);
        await cache.set('c', {foo: 'qux'}, 200);
        await cache.set('d', {foo: 'quux'}, -1); // With wrong ttl = 400 by default.

        assert.deepStrictEqual(await cache.get('a'), {foo: 'bar'});
        assert.deepStrictEqual(await cache.get('b'), {foo: 'baz'});
        assert.deepStrictEqual(await cache.get('c'), {foo: 'qux'});
        assert.deepStrictEqual(await cache.get('d'), {foo: 'quux'});

        await wait(101);

        assert.deepStrictEqual(await cache.get('a'), undefined);
        assert.deepStrictEqual(await cache.get('b'), {foo: 'baz'});
        assert.deepStrictEqual(await cache.get('c'), {foo: 'qux'});
        assert.deepStrictEqual(await cache.get('d'), {foo: 'quux'});

        await wait(100);

        assert.deepStrictEqual(await cache.get('a'), undefined);
        assert.deepStrictEqual(await cache.get('b'), {foo: 'baz'});
        assert.deepStrictEqual(await cache.get('c'), undefined);
        assert.deepStrictEqual(await cache.get('d'), {foo: 'quux'});

        await wait(100);

        assert.deepStrictEqual(await cache.get('a'), undefined);
        assert.deepStrictEqual(await cache.get('b'), undefined);
        assert.deepStrictEqual(await cache.get('c'), undefined);
        assert.deepStrictEqual(await cache.get('d'), {foo: 'quux'});

        await wait(100);

        assert.deepStrictEqual(await cache.get('a'), undefined);
        assert.deepStrictEqual(await cache.get('b'), undefined);
        assert.deepStrictEqual(await cache.get('c'), undefined);
        assert.deepStrictEqual(await cache.get('d'), undefined);
    });

    it('.set() should overwrite old values', async () => {
        const cache = new Cache();

        await cache.set('a', 'c');

        assert.deepStrictEqual(await cache.get('a'), 'c');

        await cache.set('a', 'd');

        assert.deepStrictEqual(await cache.get('a'), 'd');
    });

    it('should work with custom manager', async () => {
        function CustomValidityManager() {
            this.sign = (keyParts) => {
                assert.deepStrictEqual(keyParts, ['a', 'b', 'c']);
                return 'foo';
            };

            this.update = (keyParts) => {
                assert.deepStrictEqual(keyParts, ['a', 'c']);
            };
        }

        const cache = new Cache({manager: CustomValidityManager});

        await cache.set(['b', 'c', 'a'], 'test');
        await cache.invalidate(['a', 'c']);
    });

    it('should cleanup old data', async () => {
        const cache = new Cache({checkPeriod: 10});

        await cache.set('a', {foo: 'bar'}, 100);
        await cache.set('b', {foo: 'baz'}, 200);
        await cache.set('c', {foo: 'qux'});

        assert.deepStrictEqual(cache._storage.size, 3);

        await wait(111);

        assert.deepStrictEqual(cache._storage.size, 2);

        await wait(110);

        assert.deepStrictEqual(cache._storage.size, 1);
    });
});
