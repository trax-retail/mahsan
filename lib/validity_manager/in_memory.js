'use strict';

class InMemoryValidityManager {
    constructor() {
        this._keySignatures = new Map();
    }

    async sign(keyParts) {
        return keyParts
            .map((key) => {
                if (this._keySignatures.has(key)) {
                    return this._keySignatures.get(key);
                } else {
                    return '';
                }
            })
            .join('_');
    }

    async update(keyParts) {
        keyParts.forEach((key) => {
            this._keySignatures.set(key, Math.random().toString());
        });
    }
}

module.exports = InMemoryValidityManager;
