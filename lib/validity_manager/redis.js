'use strict';

class RedisValidityManager {
    constructor(options = {}) {
        if (!options.redisClient) {
            throw new Error('RedisValidityManager: You should specify redis client');
        }

        this._client = options.redisClient;
        this._prefix = String(options.prefix || '');
        this._ttl = isFinite(+options.ttl) && +options.ttl > 0 ? +options.ttl : 7 * 24 * 60 * 60 * 1000;
    }

    async sign(keyParts) {
        const values = await new Promise((resolve, reject) => {
            this._client.mget(keyParts.map((k) => `${this._prefix}_${k}`), (err, res) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(res);
                }
            });
        });

        return values.map((v) => v || '').join('_');
    }

    async update(keyParts) {
        const multi = this._client.multi();

        keyParts.forEach((key) => {
            multi.set(`${this._prefix}_${key}`, Math.random().toString(), 'PX', this._ttl);
        });

        return await new Promise((resolve, reject) => {
            multi.exec((err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }
}

module.exports = RedisValidityManager;
