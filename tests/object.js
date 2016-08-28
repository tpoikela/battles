
var chai = require("chai");
var expect = chai.expect;

var Obj = require("../src/object.js");

var TypedObj = Obj.Typed;

describe('Defense Object', function() {
    it('Holds information related to attack/defense', function() {
        var defObj = new Obj.Defense();
        var defObj2 = new Obj.Defense()
        expect(defObj.equals(defObj2)).to.equal(true);
        defObj.setAttack(3);
        expect(defObj.equals(defObj2)).to.equal(false);
    });
});

describe('Damage Object', function() {
    it('Contains info about damage', function() {
        var dmg1 = new Obj.Damage();
        var dmg2 = new Obj.Damage();
        expect(dmg2.equals(dmg1)).to.equal(true);
        dmg2.setDefense(9);
        expect(dmg2.equals(dmg1)).to.equal(false);

    });
});

describe('TypedObject', function() {
    it('Stores type info about the objects', function() {
        var obj = new TypedObj("actors", "xxx");
        expect(obj.getPropType()).to.equal("actors");
        expect(obj.getType()).to.equal("xxx");
    });
});

describe('Locatable Object', function() {
    it('Stores location information', function() {
        var loc1 = new Obj.Locatable();
        expect(loc1.getLevel()).to.equal(null);

        var levelObj = {};

        loc1.setLevel(levelObj);
        loc1.setXY(1, 2);
        expect(loc1.isLocated()).to.equal(true);

        var loc2 = new Obj.Locatable();
        loc2.setXY(1, 2);
        loc2.setLevel(levelObj);
        expect(loc1.isSamePos(loc2)).to.equal(true);

    });
});

describe('Ownable Object', function() {
    it('Asks Locatable for location information', function() {
        var owner = new Obj.Locatable();
        owner.setXY(1, 2);
        var owned = new Obj.Ownable(owner);
        expect(owner.getX()).to.equal(1);
        expect(owner.getY()).to.equal(2);

        var level = {id: "ABCD"};
        owner.setLevel(level);
        expect(owner.getLevel()).to.equal(level);

        expect(owned.getOwner()).to.equal(owner);

        expect(owner.isSamePos(owner)).to.equal(true);

    });
});

