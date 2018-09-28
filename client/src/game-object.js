
const NULL_OBJECT = null;

class Test {
    constructor() {

    }

}

Test.prototype.getXXX = function() {

};

const GameObject = function() {
    this.$objID = GameObject.ID++;
};

GameObject.prototype.getID = function() {return this.$objID;};
GameObject.prototype.setID = function(id) {this.$objID = id;};

GameObject.prototype.getObjRef = function() {
    return {$objRef: {type: 'object', id: this.$objID}};
};

GameObject.prototype.getRefAndVal = function() {
    const refObj = this.getObjRef();
    refObj.value = this;
    return refObj;
};

GameObject.prototype.serialize = function() {
    const json = {
        $proto: GameObject.getProtoName(this)
    };
    for (const key in this) {
        if (this.hasOwnProperty(key)) {
            json[key] = GameObject.serialize(this[key]);
        }
    }
    return json;
};
GameObject.ID = 1;

GameObject.deref = function(objRef) {
    if (objRef) {
        return objRef.value;
    }
    return NULL_OBJECT;
};

GameObject.createObjectID = function() {
    return GameObject.ID++;
};

GameObject.getProtoName = function(obj) {
    return Object.getPrototypeOf(obj).constructor.name;
};

GameObject.isPrimitive = function(obj) {
    return typeof obj !== 'object';
};

GameObject.serialize = function(obj) {
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
};

function deserialize(input, namespace, seenObjs = {}) {
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
                    arr.push(deserialize(val, namespace, seenObjs));
                });
                obj[key] = arr;
            }
            else if (value.$objID) {
                if (!seenObjs.hasOwnProperty(value.$objID)) {
                    obj[key] = deserialize(value, namespace, seenObjs);
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
GameObject.deserialize = deserialize;

module.exports = GameObject;
