'use strict';

const assert = require('assert');
const redis = require('redis');
const RedisValidityManager = require('../../lib/validity_manager/redis');
const Cache = require('../../');

const REDIS_HOST = process.env['REDIS_HOST'] || '127.0.0.1';
const REDIS_PORT = process.env['REDIS_PORT'] || 6379;
const REDIS_DB = process.env['REDIS_DB'] || 1;

async function wait(delay) {
    return new Promise((resolve) => setTimeout(resolve, delay));
}

describe('RedisValidityManager', () => {
    let redisClient;

    before((callback) => {
        redisClient = redis.createClient({
            host: REDIS_HOST,
            port: REDIS_PORT
        });

        redisClient.select(REDIS_DB, callback);
    });

    beforeEach((callback) => {
        redisClient.flushdb(callback);
    });

    after(() => {
        redisClient.quit();
    });

    it('.sign() should return blank signature without stored keys', async () => {
        const manager = new RedisValidityManager({redisClient});

        assert.deepStrictEqual(await manager.sign(['a', 'b', 'c']), '__');
    });

    it('.update() should return store random values', async () => {
        const manager = new RedisValidityManager({redisClient, prefix: 'test_'});

        await manager.update(['foo']);

        assert.ok(/^_[0-9.]+$/.test(await manager.sign(['bar', 'foo'])));
    });

    it('.update() should use ttl', async () => {
        const manager = new RedisValidityManager({redisClient, prefix: 'test_', ttl: 500});

        await manager.update(['foo']);

        assert.ok(/^_[0-9.]+$/.test(await manager.sign(['bar', 'foo'])));

        await wait(501);

        assert.deepStrictEqual(await manager.sign(['bar', 'foo']), '_');
    });

    it('constructor should throw without redis', () => {
        assert.throws(() => new RedisValidityManager(), /redis client/);
    });

    it('Cache with redis manager should work', async () => {
        const cache = new Cache({manager: 'Redis', managerOptions: {redisClient}});

        await cache.set(['a', 'b', 'c'], {foo: 'bar'});
        await cache.set(['b', 'c', 'd'], {foo: 'baz'});
        await cache.set(['c', 'd', 'e'], {foo: 'qux'});
        await cache.invalidate(['a', 'b']);

        assert.deepStrictEqual(await cache.get(['a', 'b', 'c']), undefined);
        assert.deepStrictEqual(await cache.get(['b', 'c', 'd']), undefined);
        assert.deepStrictEqual(await cache.get(['c', 'd', 'e']), {foo: 'qux'});
    });

    it('.sign() should re throw error from redis', async () => {
        const redisMockClient = {
            mget(_, callback) {
                callback(new Error('redis internal error'));
            }
        };
        const manager = new RedisValidityManager({redisClient: redisMockClient});

        try {
            await manager.sign(['a', 'b']);
        } catch (err) {
            assert.ok(/redis internal error/.test(err));
        }
    });

    it('.update() should re throw error from redis', async () => {
        const redisMockClient = {
            multi() {
                return {
                    set() {
                    },
                    exec(callback) {
                        callback(new Error('redis internal error'));
                    }
                };
            }
        };
        const manager = new RedisValidityManager({redisClient: redisMockClient});

        try {
            await manager.update(['a', 'b']);
        } catch (err) {
            assert.ok(/redis internal error/.test(err));
        }
    });
});
