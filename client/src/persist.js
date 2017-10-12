
/* Contains all logic to interface with the IndexDB. */

const IDB_VERSION = 1;

function connectToIDB(name, version) {
    return new Promise((resolve, reject) => {
        const request = window.indexedDB.open(name, version);
        request.onupgradeneeded = () => {
            request.result.createObjectStore(name,
                { keyPath: 'id', autoIncrement: true });
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        request.onblocked = () => {
            throw new Error('IndexDatabase blocked');
        };
    });
}

function operateOnIDB(name, IDB, operation, data) {
    return new Promise((resolve, reject) => {
        const transaction = IDB.transaction(name, 'readwrite');
        const store = transaction.objectStore(name);
        let request;
        switch (operation) {
            case 'GET':
                request = store.getAll();
                request.onsuccess = () => {
                    console.log('GET request.result length: '
                        + request.result.length);
                    return resolve(request.result);
                };
                request.onerror = () => reject(request.error);
                break;
            case 'PUT':
                console.log('Persist data to store length: '
                    + JSON.stringify(data).length);
                // verifySaveData(data);
                request = store.put(data);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
                break;
            case 'DELETE':
                // request = store.delete(data.id);
                request = store.clear();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
                break;
            default: console.warn('No operation performed on IDB');
        }
    });
}

/* Checks that data to be saved does not contain any functions or circular
 * references. */
function verifySaveData(data) {
    traverseObj(data);
}

const stack = [];
const maxStack = 100;
function traverseObj(obj) {
	for (const prop in obj) {
		if (obj.hasOwnProperty(prop)) {
            stack.push(prop);
            if (stack.length >= maxStack) {
                let msg = 'Error. Max stack reached. Probably circular ref.';
                msg += `Prop stack: ${JSON.stringify(stack)}`;
                throw new Error(msg);
            }
			if (typeof obj[prop] === 'object') {
				traverseObj(obj[prop]);
			}
            else if (typeof obj[prop] === 'function') {
                const msg = `Error. Func in ${JSON.stringify(stack)}`;
                throw new Error(msg);
			}
            stack.pop();
		}
	}
}

async function operateWithIDB(store, operation, data) {
    let IDB;
    try {
        console.log('Trying to operate with IDB');
        IDB = await connectToIDB(store, IDB_VERSION);
        return await operateOnIDB(store, IDB, operation, data);
    }
    catch (exception) {
        console.error(exception);
        throw exception;
    }
    finally {
        if (IDB) {
            console.log('Closing now IDB with close()');
            IDB.close();
        }
    }
}

module.exports = function Persist(storeName) {
    this.fromStorage = () => operateWithIDB(storeName, 'GET', null);
    this.toStorage = data => operateWithIDB(storeName, 'PUT', data);
    this.deleteStorage = () => operateWithIDB(storeName, 'DELETE');
};
