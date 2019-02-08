
const NULL_OBJECT = null;

interface ObjRefData {
    type: string;
    id: number;
}

interface ObjRef {
    $objRef: ObjRefData;
    value?: GameObject;
}

export class GameObject {

    public static ID: number;

    public static deserialize(input, namespace, seenObjs = {}): any {
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

    public static deref(objRef: ObjRef): any {
        if (objRef) {
            return objRef.value;
        }
        return NULL_OBJECT;
    }

    public static createObjectID(): number {
        return GameObject.ID++;
    }

    public static getProtoName(obj: any): string {
        return Object.getPrototypeOf(obj).constructor.name;
    }

    public static isPrimitive(obj): boolean {
        return typeof obj !== 'object';
    }

    public static serialize(obj: any): any {
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

    public $objID: number;

    constructor() {
        this.$objID = GameObject.ID++;
    }

    public getID(): number {return this.$objID;}
    public setID(id: number): void {this.$objID = id;}

    public getObjRef(): ObjRef {
        return {
            $objRef: {
                type: 'object',
                id: this.$objID
            }
        };
    }

    public getRefAndVal(): ObjRef {
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

}

GameObject.ID = 1;
