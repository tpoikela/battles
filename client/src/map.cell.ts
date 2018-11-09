
import RG from './rg';
import * as Element from './element';
import {BaseActor} from './actor';
import * as Item from './item';

const {TYPE_ACTOR, TYPE_ITEM, TYPE_ELEM} = RG;

type PropsType = Element.ElementBase | Item.Base | BaseActor;

interface CellProps {
    [key: string]: PropsType[];
}

/* Object representing one game cell. It can hold actors, items, traps or
 * elements. Cell has x,y for convenient access to coordinates.
 * */
// const Cell = function(x: number, y: number, elem: Element) { // {{{2
class Cell {

    private _baseElem: Element.ElementBase;
    private _x: number;
    private _y: number;
    private _explored: boolean;
    private _p: CellProps;
    private _lightPasses: boolean;
    private _isPassable: boolean;

    constructor(x: number, y: number, elem?: Element.ElementBase) { // {{{2

        this._baseElem = elem;
        this._x = x;
        this._y = y;
        this._explored = false;

        this._p = {}; // Cell properties are assigned here

        this._lightPasses = elem ? elem.lightPasses() : true;
        this._isPassable = elem ? elem.isPassable() : true;
    }

    getX() {return this._x;}
    getY() {return this._y;}
    getXY() {return [this._x, this._y];}
    setX(x) {this._x = x;}
    setY(y) {this._y = y;}

    isAtXY(x, y) {
        return x === this._x && y === this._y;
    }

    getKeyXY() {
        return this._x + ',' + this._y;
    }

    /* Sets/gets the base element for this cell. There can be only one element.*/
    setBaseElem(elem) {
        this._baseElem = elem;
        this._lightPasses = elem.lightPasses();
        this._isPassable = elem.isPassable();
    }

    getBaseElem() { return this._baseElem; }

    /* Returns true if the cell has props of given type.*/
    hasProp(prop) {
        return this._p.hasOwnProperty(prop);
    }

    /* Returns the given type of props, or null if does not have any props of that
     * type. */
    getProp(prop: string): PropsType[] {
        if (this._p.hasOwnProperty(prop)) {
            return this._p[prop];
        }
        return null;
    }

    /* Queries cell about possible elements. */
    hasElements() {
        return this.hasProp(TYPE_ELEM);
    }

    getElements() {
        return this.getProp(TYPE_ELEM);
    }

    /* Returns true if cell has any actors.*/
    hasActors() {
        return this.hasProp(TYPE_ACTOR);
    }

    getActors(): BaseActor[] {
        return (this.getProp(TYPE_ACTOR) as BaseActor[]);
    }

    getFirstActor() {
        const actors = this.getProp(TYPE_ACTOR);
        if (actors && actors.length > 0) {
            return actors[0];
        }
        return null;
    }

    getSentientActors() {
        const actors = this.getActors();
        return actors.filter(actor => !actor.has('NonSentient'));
    }

    hasItems() {return this.hasProp(TYPE_ITEM);}
    getItems() {return this.getProp(TYPE_ITEM);}

    /* Checks if this cell has a marker with given tag. */
    hasMarker(tag) {
        if (this.hasElements()) {
            const elems = this.getElements() as Element.ElementBase[];
            for (let i = 0; i < elems.length; i++) {
                if (elems[i].getType() === 'marker') {
                    if (elems[i].getTag() === tag) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    /* Returns true if cell has any props. */
    hasProps() {
        return Object.keys(this._p).length > 0;
    }

    /* Returns true if cell has stairs.*/
    hasStairs() {
        const propType = this.getConnection();
        if (propType) {
            const name = propType.getName();
            return (/stairs(Up|Down)/).test(name);
        }
        return false;
    }

    /* Returns true if cell has passage to another tile. */
    hasPassage() {
        const propType = this.getConnection();
        if (propType) {return propType.getName() === 'passage';}
        return false;
    }

    hasShop() {
        return this.hasPropType('shop');
    }

    getShop() {
        return this.getPropType('shop')[0];
    }

    hasDoor() {
        return this.hasPropType('door');
    }

    hasConnection() {
        return this.hasPropType('connection');
    }

    hasHouse() {
        return this._baseElem.getType() === 'floorhouse';
    }

    hasConnectionType(type) {
        if (this.hasConnection()) {
            const connection = this.getConnection();
            return connection.getName() === type;
        }
        return false;
    }

    hasTown() {
        return this.hasConnectionType('town');
    }

    hasBattle() {
        return this.hasConnectionType('battle');
    }

    hasMountain() {
        return this.hasConnectionType('mountain');
    }

    /* Return stairs in this cell, or null if there are none.*/
    getStairs() {
        if (this.hasStairs()) {
            return this.getConnection();
        }
        return null;
    }

    getConnection() {
        if (this.hasPropType('connection')) {
            return this.getPropType('connection')[0];
        }
        return null;
    }

    /* Returns passage in this cell, or null if not found. */
    getPassage() {
        if (this.hasPassage()) {
            return this.getConnection();
        }
        return null;
    }

    /* Returns true if light passes through this map cell.*/
    lightPasses() {
        // if (!this._baseElem.lightPasses()) {return false;}
        if (!this._lightPasses) {return false;}
        // if (this.hasProp(TYPE_ELEM)) {
        const elems = this._p[TYPE_ELEM];
        if (elems) {
            if (elems.length === 1) {
                if (elems[0].has('Opaque')) {return false;}
            }
            else {
                for (let i = 0; i < elems.length; i++) {
                    if (elems[i].has('Opaque')) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    isPassable() {return this.isFree();}

    isPassableByAir() {
        return this._baseElem.isPassableByAir();
    }

    isDangerous() {
        if (this._p[TYPE_ACTOR]) {
            const actors = this.getProp(TYPE_ACTOR);
            if (actors) {
                return actors[0].has('Damaging');
            }
        }
        return false;
    }

    hasObstacle() {
        this._baseElem.isObstacle();
    }

    isSpellPassable() {
        return this._baseElem.isSpellPassable();
    }

    setExplored() {this._explored = true;}
    isExplored() {return this._explored;}

    /* Returns true if it's possible to move to this cell.*/
    isFree(isFlying = false) {
        // if (!isFlying && !this._baseElem.isPassable()) {return false;}
        if (!isFlying && !this._isPassable) {return false;}

        if (this.hasProp(TYPE_ACTOR)) {
            for (let i = 0; i < this._p.actors.length; i++) {
                if (!this._p.actors[i].has('Ethereal')) {return false;}
            }
            return true;
        }
        else if (this.hasProp(TYPE_ELEM)) {
            if (this.hasPropType('door')) {
                return this.getPropType('door')[0].isOpen();
            }
            else if (this.hasPropType('leverdoor')) {
                return this.getPropType('leverdoor')[0].isOpen();
            }
        }
        // Handle flying/non-flying here
        /* if (!isFlying) {
            return this._baseElem.isPassable();
        }
        else {
            return this._baseElem.isPassableByAir();
        }*/
        if (isFlying) {
            return this._baseElem.isPassableByAir();
        }
        else {
            return true;
        }
    }

    /* Add given obj with specified property type.*/
    setProp(prop, obj) {
        if (obj.getType() === 'connection' && this.hasConnection()) {
            let msg = `${this._x},${this._y}`;
            msg += `\nExisting: ${JSON.stringify(this.getConnection())}`;
            msg += `\nTried to add: ${JSON.stringify(obj)}`;
            RG.err('Cell', 'setProp',
                `Tried to add 2nd connection: ${msg}`);
        }
        if (!this._p.hasOwnProperty(prop)) {
            this._p[prop] = [];
            this._p[prop].push(obj);
        }
        // Reorders actors to show them in specific order with GUI
        else if (prop === TYPE_ACTOR) {
            if (!obj.has('NonSentient') && !obj.has('Ethereal')) {
                this._p[prop].unshift(obj);
            }
            else {
                this._p[prop].push(obj);
            }
        }
        else {
            this._p[prop].push(obj);
        }

        if (obj.isOwnable) {
            obj.setOwner(this);
        }
    }

    removeProps(propType) {
        delete this._p[propType];
    }

    /* Removes the given object from cell properties.*/
    removeProp(prop, obj) {
        if (this.hasProp(prop)) {
            const props = this._p[prop];
            const index = props.indexOf(obj);
            if (index === -1) {return false;}
            this._p[prop].splice(index, 1);
            if (this._p[prop].length === 0) {
                delete this._p[prop];
            }
            return true;
        }
        return false;
    }

    /* Returns string representation of the cell.*/
    toString() {
        let str = 'Map.Cell ' + this._x + ', ' + this._y;
        str += ' explored: ' + this._explored;
        str += ' passes light: ' + this.lightPasses();
        Object.keys(this._p).forEach(prop => {
            const arrProps = this._p[prop];
            for (let i = 0; i < arrProps.length; i++) {
                if (arrProps[i].hasOwnProperty('toString')) {
                    str += arrProps[i].toString();
                }
                else if (arrProps[i].hasOwnProperty('toJSON')) {
                    str += JSON.stringify(arrProps[i].toJSON());
                }
            }
        });
        return str;
    }

    /* Returns true if the cell has an usable element. */
    hasUsable() {
        const elems = this.getProp(RG.TYPE_ELEM) as Element.ElementBase[];
        if (elems) {
            for (let i = 0; i < elems.length; i++) {
                if (elems[i].onUse) {
                    return true;
                }
            }
        }
        return false;
    }

    toJSON() {
        const json: any = {
            t: RG.elemTypeToIndex[this._baseElem.getType()]
        };

        if (this._explored) {
            json.ex = 1;
        }

        if (this._p.hasOwnProperty(RG.TYPE_ELEM)) {
            const elements = [];
            this._p[RG.TYPE_ELEM].forEach(elem => {
                if (/(snow|tree|grass|stone|water)/.test(elem.getType())) {
                    elements.push(elem.toJSON());
                }
            });
            if (elements.length > 0) {
                json.elements = elements;
            }
        }
        return json;
    }

    /* Returns name (or type if unnamed) for each prop in this cell, including the
     * base element type. */
    getPropNames() {
        const result = [this._baseElem.getType()];
        const keys = Object.keys(this._p);
        keys.forEach(propType => {
            const props = this.getProp(propType);
            props.forEach(prop => {
                result.push(prop.getName());
            });
        });
        return result;
    }

    /* Returns true if any cell property has the given type. Ie.
     * myCell.hasPropType("wall"). Doesn't check for basic props like "actors",
     * RG.TYPE_ITEM etc.
     */
    hasPropType(propType) {
        if (this._baseElem.getType() === propType) {return true;}

        const keys = Object.keys(this._p);
        for (let i = 0; i < keys.length; i++) {
            const prop = keys[i];
            const arrProps = this._p[prop];
            for (let j = 0; j < arrProps.length; j++) {
                if (arrProps[j].getType() === propType) {
                    return true;
                }
            }
        }
        return false;
    }

    /* Returns all props with given type in the cell.*/
    getPropType(propType) {
        const props = [];
        if (this._baseElem.getType() === propType) {return [this._baseElem];}
        Object.keys(this._p).forEach(prop => {
            const arrProps = this._p[prop];
            for (let i = 0; i < arrProps.length; i++) {
                if (arrProps[i].getType() === propType) {
                    props.push(arrProps[i]);
                }
            }
        });
        return props;
    }

    /* For debugging to find a given object. */
    findObj(filterFunc) {
        const result = [];
        Object.keys(this._p).forEach(propType => {
            const props = this._p[propType];
            props.forEach(propObj => {
                if (filterFunc(propObj)) {
                    result.push(propObj);
                }
            });
        });
        return result;
    }
} // }}} Map.Cell

module.exports = Cell;
