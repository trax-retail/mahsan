'use strict';

const validityManagers = {
    InMemory: require('./validity_manager/in_memory'),
    Redis: require('./validity_manager/redis')
};

class Cache {
    constructor(optons = {}) {
        this._ttl = (isFinite(+optons.ttl) && +optons.ttl > 0) ? +optons.ttl : Infinity;
        this._checkPeriod = 5 * 60 * 1000;

        if (isFinite(+optons.checkPeriod) && +optons.checkPeriod > 0) {
            this._checkPeriod = optons.checkPeriod;
        }

        this._storage = new Map();

        let Manager;

        if (typeof optons.manager === 'function') {
            Manager = optons.manager;
        } else if (validityManagers[optons.manager]) {
            Manager = validityManagers[optons.manager];
        } else {
            Manager = validityManagers.InMemory;
        }

        let managerOptions = {};

        if (optons.managerOptions && (typeof optons.managerOptions === 'object')) {
            managerOptions = optons.managerOptions;
        }

        this._validityManager = new Manager(managerOptions);

        this._gcTick();
    }

    _gcTick() {
        const now = Date.now();

        this._storage.forEach((storageEntity, storageKey) => {
            if (storageEntity.expire && storageEntity.expire < now) {
                this._storage.delete(storageKey);
            }
        });

        setTimeout(() => this._gcTick(), this._checkPeriod).unref();
    }

    static _unifyKeyParts(keyParts) {
        if (!Array.isArray(keyParts)) {
            keyParts = [keyParts];
        }
        return keyParts.sort();
    }

    static _getStorageKey(keyParts) {
        return keyParts.concat(keyParts.length).join('_');
    }

    async has(keyParts) {
        const storageKey = this.constructor._getStorageKey(this.constructor._unifyKeyParts(keyParts));

        if (!this._storage.has(storageKey)) {
            return false;
        }

        const storageEntity = this._storage.get(storageKey);

        if (storageEntity.expire && storageEntity.expire < Date.now()) {
            this._storage.delete(storageKey);
            return false;
        }

        const signature = await this._validityManager.sign(storageEntity.keyParts);

        if (storageEntity.signature !== signature) {
            this._storage.delete(storageKey);
            return false;
        }

        return true;
    }

    async get(keyParts) {
        keyParts = this.constructor._unifyKeyParts(keyParts);

        if (!(await this.has(keyParts))) {
            return undefined;
        }

        const {value} = this._storage.get(this.constructor._getStorageKey(keyParts)) || {};

        return value;
    }

    async set(keyParts, value, ttl) {
        if (isNaN(+ttl) || +ttl < 0) {
            ttl = this._ttl;
        }

        keyParts = this.constructor._unifyKeyParts(keyParts);

        const signature = await this._validityManager.sign(keyParts);

        this._storage.set(this.constructor._getStorageKey(keyParts), {
            keyParts,
            signature,
            value,
            expire: +ttl + Date.now()
        });
    }

    async delete(keyParts) {
        const storageKey = this.constructor._getStorageKey(this.constructor._unifyKeyParts(keyParts));
        return this._storage.delete(storageKey);
    }

    async invalidate(keyParts) {
        return await this._validityManager.update(this.constructor._unifyKeyParts(keyParts));
    }
}

module.exports = Cache;
