
const NULL_OBJECT = null;

interface ObjRefData {
    type: string;
    id: number;
}

interface ObjRef {
    $objRef: ObjRefData;
    value?: GameObject;
}

class GameObject {

    public static ID: number;

    public static deserialize(input, namespace, seenObjs = {}) {
        const obj = new namespace[input.$proto]();
        for (const key in input) {
            if (input.hasOwnProperty(key)) {
                const value = input[key];
                if (GameObject.isPrimitive(value)) {
                    obj[key] = value;
                }
                else if (Array.isArray(value)) {
                    const arr = [];
                    obj.forEach(val => {
                        arr.push(GameObject.deserialize(val, namespace, seenObjs));
                    });
                    obj[key] = arr;
                }
                else if (value.$objID) {
                    if (!seenObjs.hasOwnProperty(value.$objID)) {
                        obj[key] = GameObject.deserialize(value, namespace, seenObjs);
                    }
                    else {
                        obj[key] = seenObjs[value.$objID];
                    }
                }
                else {
                    obj[key] = value; // Just assign simple object
                }
            }
        }
        delete obj.$proto;
        /* eslint: enable */
        return obj;
    }

    public $objID: number;

    constructor() {
        this.$objID = GameObject.ID++;
    }

    getID() {return this.$objID;}
    setID(id) {this.$objID = id;}

    getObjRef(): ObjRef {
        return {
            $objRef: {
                type: 'object',
                id: this.$objID
            }
        };
    }

    getRefAndVal(): ObjRef {
        const refObj: ObjRef = this.getObjRef();
        refObj.value = this;
        return refObj;
    }

    /* serialize() {
        const json = {
            $proto: GameObject.getProtoName(this)
        };
        for (const key in this) {
            if (this.hasOwnProperty(key)) {
                json[key] = GameObject.serialize(this[key]);
            }
        }
        return json;
    }
    */

    static deref(objRef: ObjRef) {
        if (objRef) {
            return objRef.value;
        }
        return NULL_OBJECT;
    }

    static createObjectID() {
        return GameObject.ID++;
    }

    static getProtoName(obj) {
        return Object.getPrototypeOf(obj).constructor.name;
    }

    static isPrimitive(obj) {
        return typeof obj !== 'object';
    }

    static serialize(obj) {
        if (GameObject.isPrimitive(obj)) {
            return obj;
        }
        else if (Array.isArray(obj)) {
            const arr = [];
            obj.forEach(val => {
                arr.push(GameObject.serialize(val));
            });
            return arr;
        }
        else if (obj.$objID) {
            return obj.serialize();
        }
        else if (obj.toJSON) {
            return obj.toJSON(); // Legacy support
        }
        else if (obj.$objRef) {
            return {$objRef: obj.value.getID()};
        }
        else {
            return obj;
        }
    }
}

GameObject.ID = 1;


export default GameObject;
