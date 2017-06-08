
/** Note: This file doesn't contain any unit tests. It has some architecture for
 * performing common test function.*/

const RG = require('../client/src/battles');
const expect = require('chai').expect;

const RGTest = {

};

/* Creates a mock-level for unit tests. */
RGTest.createMockLevel = function(cols, rows) {
    const level = {cols: cols, rows: rows,
        map: {
            getCell: function(x, y) {
                return {};
            },
            hasXY: function(x, y) {
                return true;
            },
            isPassable: function(x, y) {
                return x > -1 && y > -1;
            }
        },
        getMap: function() {return this.map;},

        addActor: function(actor, x, y) {
            actor.setXY(x, y);
            actor.setLevel(this);
        }
    };
    return level;
};

RGTest.equipItem = function(actor, item) {
    const invEq = actor.getInvEq();
    invEq.addItem(item);
    expect(invEq.equipItem(item)).to.equal(true);
};

/* Wraps an object into a cell for later use. Some functions require a map cell
* instead of taking the object directly, so this is useful. */
RGTest.wrapObjWithCell = function(obj) {
    const cell = RG.FACT.createFloorCell();
    cell.setExplored(true); // Otherwise returns darkness
    const propType = obj.getPropType();
    cell.setProp(propType, obj);
    return cell;
};

RGTest.checkActorXY = function(actor, x, y) {
    expect(actor.getX()).to.equal(x);
    expect(actor.getY()).to.equal(y);
};

RGTest.checkChar = function(obj, expChar) {
    const cell = RGTest.wrapObjWithCell(obj);
    expect(RG.getCellChar(cell)).to.equal(expChar);
};

RGTest.checkCSSClassName = function(obj, expClass) {
    const cell = RGTest.wrapObjWithCell(obj);
    expect(RG.getStyleClassForCell(cell)).to.equal(expClass);

};

RGTest.expectEqualHealth = function(o1, o2) {
    expect(o1.get('Health').getHP()).to.equal(o2.get('Health').getHP());
};

module.exports = RGTest;
