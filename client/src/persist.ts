
/* Contains all logic to interface with the IndexDB. */

const IDB_VERSION = 1;
const localforage = require('localforage');

export function Persist(playerName: string) {
    this.fromStorage = (cb) => {
        return localforage.getItem(playerName, cb);
    };

    this.toStorage = (data, cb) => {
        localforage.setItem(playerName, data, cb);
    };

    this.deleteStorage = cb => {
        localforage.removeItem(playerName).then(cb);
    };
}
