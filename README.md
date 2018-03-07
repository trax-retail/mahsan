# mahsan

[![Greenkeeper badge](https://badges.greenkeeper.io/Trax-retail/mahsan.svg)](https://greenkeeper.io/)

[![Build Status](https://travis-ci.org/Trax-retail/mahsan.svg?branch=master)](https://travis-ci.org/Trax-retail/mahsan) [![NPM version](https://badge.fury.io/js/mahsan.svg)](http://badge.fury.io/js/mahsan) [![Coverage Status](https://coveralls.io/repos/github/Trax-retail/mahsan/badge.svg?branch=master)](https://coveralls.io/github/Trax-retail/mahsan?branch=master)

[![NPM](https://nodei.co/npm/mahsan.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/mahsan/)

## Fast and simple NodeJS caching library with distributed invalidation policy

A simple caching module that provides you an ability to cache and invalidate your data. This module has some differences from others caching modules:

- It keeps data in memory only (without serialization/deserialization) - this why it's so fast.
- It has strict invalidation policy witch allows user to invalidate cached data easily using something like groups.
- Distributed storage will work fast even on slow connection, because we don't transfer unnecessary data.

## Install

```bash
  npm install mahsan --save
```

## Example

```js
const Cache = require('mahsan');
const cache = new Cache();

async getProducts() {
    // Try get data from cache.
    const data = await cache.get(['product', 'manufacturer']);

    if (data) return data;

    const dbResult = await sql(`SELECT p.name AS name, m.name AS manufacturer
                                FROM product AS p
                                LEFT JOIN manufacturer AS m ON m.id = p.manufacturer_id;`);

    // Save all products names and related manufacturers names in cache (in current NodeJs instance).
    await cache.set(['product', 'manufacturer'], dbResult);
    return dbResult;
}

async getManufacturers() {
    // Try get data from cache.
    const data = await cache.get(['manufacturer']);

    if (data) return data;

    const dbResult = await sql(`SELECT * FROM manufacturer;`);

    // Save all manufacturers in cache (in current NodeJs instance).
    await cache.set(['manufacturer'], dbResult);
    return dbResult;
}

async deleteProduct(id) {
    await sql(`DELETE FROM product WHERE id = ?;`, [id]);
    // Invalidate cache for "getProducts()" function.
    await cache.invalidate('product');
}

async deleteManufacturer(id) {
    await sql(`DELETE FROM manufacturer WHERE id = ?;`, [id]);
    // Invalidate cache for both "getProducts()" and "getManufacturers()" function.
    await cache.invalidate('manufacturer');
}

```

## API

### `const cache = new Cache(options)`

- `options` (Object)
    - `ttl` (Number) is a default time to live for all `.set()` calls in milliseconds. `Infinity` by default.
    - `manager` (String|ValidityManager) is a [ValidityManager](#validitymanager) instance or one predefined "InMemory" or "Redis". `InMemory` by default.
    - `managerOptions` (Object) is currently necessary only for "Redis" manager.
        - `redisClient` ([redis client](https://www.npmjs.com/package/redis)).
        - `prefix` (String) is a prefix for all keys in redis.
        - `ttl` (Number) is a default time to live for all redis keys in milliseconds. 7 days (`7 * 24 * 60 * 60 * 1000`) by default. This option is necessary to not clog up redis.

### `await cache.set(keyParts, value, ttl)`

Put the value to the cache.

- `keyParts` (String|Array) is a list of keys used to save the value.
- `value` (Any) is a user data.
- `ttl` (Number) is a time to live in milliseconds. This argument affects only local instance cache.

### `await cache.get(keyParts)`

Get the value from the cache.

- `keyParts` (String|Array) is a list of keys used to retrieve a value previously saved with `cache.set()` on this NodeJS instance.

### `await cache.has(keyParts)`

Check a value availability.

- `keyParts` (String|Array) is a list of keys used to retrieve a value previously saved with `cache.set()` on this NodeJS instance.

### `await cache.delete(keyParts)`

Delete a value from the cache (on this NodeJS instance).

- `keyParts` (String|Array) is a list of keys used to retrieve a value previously saved with `cache.set()` on this NodeJS instance.

### `await cache.invalidate(keyParts)`

Make keys invalid globally (for all NodeJS instances in case of redis).

- `keyParts` (String|Array) is a list of keys used to retrieve a value.

### ValidityManager

ValidityManager is an interface witch have two methods `async sign(keyParts)` and `async update(keyParts)`. You need your own implementation of ValidityManager only if you need custom shared storage (like MongoDB).

## Notes

- _`value`_ argument always stored by reference. Don't modify it after setting/getting from cache.
- _mahsan_ (מחסן) is a storage in Hebrew.
