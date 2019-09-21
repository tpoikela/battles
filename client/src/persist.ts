
/* Contains all logic to interface with the IndexDB. */

const IDB_VERSION = 1;
const localforage = require('localforage');

const LZString = require('lz-string');

export class InMemoryStore {
    public data: {[key: string]: string};
    public name: string;
    protected compress: boolean;

    constructor(name: string, compress: boolean = true) {
        this.name = name;
        this.data = {};
        this.compress = compress;
    }

    public getItem(key: string): string {
        if (!this.data.hasOwnProperty(key)) {
            console.warn(`No key |${key}| in InMemoryStore`);
        }
        const dataCompr = this.data[key];
        if (this.compress) {
            const data = LZString.decompress(dataCompr);
            return data;
        }
        return dataCompr;
    }

    public setItem(key: string, data: any): void {
        let str;
        if (typeof data !== 'string') {
            str = JSON.stringify(data);
        }
        else {
            str = data;
        }
        if (this.compress) {
            const dataCompr = LZString.compress(str);
            // const ratio = dataCompr.length / str.length;
            this.data[key] = dataCompr;
        }
        else {
            this.data[key] = str;
        }
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
