# mahsan

[![Build Status](https://travis-ci.org/Trax-retail/mahsan.svg?branch=master)](https://travis-ci.org/Trax-retail/mahsan) [![NPM version](https://badge.fury.io/js/mahsan.svg)](http://badge.fury.io/js/mahsan) [![Coverage Status](https://coveralls.io/repos/github/Trax-retail/mahsan/badge.svg?branch=master)](https://coveralls.io/github/Trax-retail/mahsan?branch=master) [![Greenkeeper badge](https://badges.greenkeeper.io/Trax-retail/mahsan.svg)](https://greenkeeper.io/)

[![NPM](https://nodei.co/npm/mahsan.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/mahsan/)

## Fast and simple NodeJS caching library with distributed invalidation policy

A simple caching module that provides an ability to cache and invalidate your data. Unlike other modules, Mahsan supports the following features:

- Data is stored only in memory (without serialization/deserialization) - this why it's so fast.
- It has a strict invalidation policy which allows clients to invalidate cached entities easily.
- We optimize data transfer to the distributed storage in order to remain performant even on slow connections.

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
    const data = await cache.get(['courses', 'lecturers']);

    if (data) return data;

    const dbResult = await sql(`SELECT c.name AS name, l.name AS lecturer
                                FROM course AS c
                                LEFT JOIN lecturer AS l ON l.id = c.lecturer_id;`);

    // Save all courses names and related lecturers names in cache (in current NodeJs instance).
    await cache.set(['courses', 'lecturers'], dbResult);
    return dbResult;
}

async getLecturers() {
    // Try get data from cache.
    const data = await cache.get(['lecturers']);

    if (data) return data;

    const dbResult = await sql(`SELECT * FROM lecturers;`);

    // Save all lecturers in cache (in current NodeJs instance).
    await cache.set(['lecturers'], dbResult);
    return dbResult;
}

async deleteCourse(id) {
    await sql(`DELETE FROM courses WHERE id = ?;`, [id]);
    // Invalidate cache for "getCourses()" function.
    await cache.invalidate('product');
}

async deleteLecturer(id) {
    await sql(`DELETE FROM lecturers WHERE id = ?;`, [id]);
    // Invalidate cache for both "getCourses()" and "getLecturers()" function.
    await cache.invalidate('lecturers');
}

```

## API

### `const cache = new Cache(options)`

- `options` (Object)
    - `ttl` (Number) is a default time to live for all `.set()` calls in milliseconds. `Infinity` by default.
    - `checkPeriod` (Number) is a period in milliseconds, used for deleting expired data. 5 min (`5 * 60 * 1000`) by default.
    - `manager` (String|ValidityManager) is a [ValidityManager](#validitymanager) instance or one predefined "InMemory" or "Redis". `InMemory` by default.
    - `managerOptions` (Object) is currently necessary only for "Redis" manager.
        - `redisClient` ([redis client](https://www.npmjs.com/package/redis)).
        - `prefix` (String) is a prefix for all keys in Redis.
        - `ttl` (Number) is a default time to live for all Redis keys in milliseconds. 7 days (`7 * 24 * 60 * 60 * 1000`) by default. This option is necessary in order not to clog up Redis.

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

### `cache.clear()`

Clear cache on this NodeJS instance.

### `await cache.invalidate(keyParts)`

Invalidate keys locally (in case of Node.JS instance) or globally (in case of Redis).

- `keyParts` (String|Array) is a list of keys used to retrieve a value.

### ValidityManager

ValidityManager is an interface which has two methods `async sign(keyParts)` and `async update(keyParts)`. ValidityManager may be override (for example, with an own implementation of a custom shared storage).

## Notes

- _`value`_ argument always stored by reference. Don't modify it after setting/getting from cache.
- _mahsan_ (מחסן) is a storage in Hebrew.
