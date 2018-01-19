
const RG = require('./rg');

export default class Constraints {

    getConstraints(objOrArray) {
        if (Array.isArray(objOrArray)) {
            const funcs = objOrArray.map(constr => (
                this.getFunc(constr.op, constr.prop, constr.value)
            ));
            return function(obj) {
                let res = true;
                funcs.forEach(f => {res = res && f(obj);});
                return res;
            };
        }
        else {
            const {op, prop, value} = objOrArray;
            return this.getFunc(op, prop, value);
        }
    }

    getFunc(op, prop, value) {
        if (Array.isArray(value)) {
            const funcs = value.map(val => (
                this.getFunc(op, prop, val)
            ));
            return function(obj) {
                let res = true;
                funcs.forEach(f => {res = res && f(obj);});
                return res;
            };
        }
        else {
            switch (op) {
                case 'eq': return obj => obj[prop] === value;
                case 'neq': return obj => obj[prop] !== value;
                case 'gte': return obj => obj[prop] >= value;
                case 'lte': return obj => obj[prop] <= value;
                case 'gt': return obj => obj[prop] > value;
                case 'lt': return obj => obj[prop] < value;
                case 'match': return obj => new RegExp(value).test(obj[prop]);
                default: RG.err('Constraints', 'getFunc',
                    `Unsupported op ${op} given`);
            }
        }
        return null;
    }

}
