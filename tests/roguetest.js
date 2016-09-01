
/** Note: This file doesn't contain any unit tests. It has some architecture for
 * performing common test function.*/

var RG = require("../battles.js");
var chai = require("chai");
var expect = chai.expect;

var RGTest = {

};

RGTest.createMockLevel = function(cols, rows) {
    var level = {cols: cols, rows: rows,
        map: {
            getCell: function(x, y) {return {};},
            hasXY: function(x, y) {return true;},
            isPassable: function(x, y) {return true;},
        },
        getMap: function() {return this.map;},

        addActor: function(actor, x, y) {
            actor.setXY(x, y);
            actor.setLevel(this);
        },
    };
    return level;
};

RGTest.equipItem = function(actor, item) {
    var invEq = actor.getInvEq();
    invEq.addItem(item);
    expect(invEq.equipItem(item)).to.equal(true);
};

/** Wraps an object into a cell for later use. Some functions require a map cell instead of taking the object directly. */
RGTest.wrapObjWithCell = function(obj) {
    var cell = RG.FACT.createFloorCell();
    cell.setExplored(true); // Otherwise returns darkness
    var propType = obj.getPropType();
    cell.setProp(propType, obj);
    return cell;
};

RGTest.checkActorXY = function(actor, x, y) {
    expect(actor.getX()).to.equal(x);
    expect(actor.getY()).to.equal(y);
};

RGTest.checkChar = function(obj, expChar) {
    var cell = RGTest.wrapObjWithCell(obj);
    expect(RG.getCellChar(cell)).to.equal(expChar);
};

RGTest.checkCSSClassName = function(obj, expClass) {
    var cell = RGTest.wrapObjWithCell(obj);
    expect(RG.getStyleClassForCell(cell)).to.equal(expClass);

};

if (typeof exports !== 'undefined' ) {
    if( typeof RGTest !== 'undefined' && module.exports ) {
        exports = module.exports = RGTest;
    }
    exports.RGTest = RGTest;
}
else {
    window.RGTest = RGTest;
}
