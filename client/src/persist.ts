
/* Contains all logic to interface with the IndexDB. */

const IDB_VERSION = 1;
const localforage = require('localforage');

const LZString = require('lz-string');

export class InMemoryStore {
    public data: {[key: string]: string};
    public name: string;

    constructor(name: string) {
        this.name = name;
        this.data = {};
    }

    public getItem(key: string): string {
        if (!this.data.hasOwnProperty(key)) {
            console.warn(`No key |${key}| in InMemoryStore`);
        }
        const dataCompr = this.data[key];
        const data = LZString.decompress(dataCompr);
        return data;
    }

    public setItem(key: string, data: any): void {
        let str;
        if (typeof data !== 'string') {
            str = JSON.stringify(data);
        }
        else {
            str = data;
        }
        console.log(`setItem |${key}|, dataLen BEFORE: ${str.length}`);
        const dataCompr = LZString.compress(str);
        const ratio = dataCompr.length / str.length;
        console.log(`setItem |${key}|, dataLen AFTER: ${dataCompr.length}, ${ratio}%`);
        this.data[key] = dataCompr;
    }

    public removeItem(key: string) {
        delete this.data[key];
    }
}

export function Persist(keyName: string) {
    // In unit test, replace with node-localstorage
    this.store = localforage;

    this.fromStorage = (cb) => {
        return this.store.getItem(keyName, cb);
    };

    this.fromStorageWithKey = (key: string, cb) => {
        return this.store.getItem(key, cb);
    };

    this.toStorage = (data, cb) => {
        this.store.setItem(keyName, data, cb);
    };

    this.toStorageWithKey = (key, data, cb) => {
        this.store.setItem(key, data, cb);
    };

    this.deleteStorage = cb => {
        this.store.removeItem(keyName).then(cb);
    };

    this.deleteStorageWithKey = (key: string, cb) => {
        this.store.removeItem(key).then(cb);
    };
}

Persist.fromStorage = function(key,  cb) {
    return localforage.getItem(key, cb);
};

Persist.toStorage = function(key, data,  cb) {
    localforage.setItem(key, data, cb);
};

Persist.deleteStorage = function(key, cb) {
    localforage.removeItem(key).then(cb);
};
