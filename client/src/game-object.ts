
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

    /*rm
    public static deref(objRef: ObjRef): any {
        if (objRef) {
            return objRef.value;
        }
        return NULL_OBJECT;
    }
    */

    public static createObjectID(): number {
        return GameObject.ID++;
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

    /*
    public getRefAndVal(): ObjRef {
        const refObj: ObjRef = this.getObjRef();
        refObj.value = this;
        return refObj;
    }
    */

}

GameObject.ID = 1;
