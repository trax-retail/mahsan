'use strict';

const LocalValidityManager = require('./validity_manager/local');

class Cache {
  constructor() {
    this._storage = new Map();
    this._validityManager = new LocalValidityManager();
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

    if (storageEntity.expire && storageEntity.expire > Date.now()) {
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
    keyParts = this.constructor._unifyKeyParts(keyParts);

    const signature = await this._validityManager.sign(keyParts);

    this._storage.set(this.constructor._getStorageKey(keyParts), {
      keyParts,
      signature,
      value,
      expire: ttl ? Date.now() + ttl : null
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
