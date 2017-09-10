
const expect = require('chai').expect;
const Obj = require('../../../client/src/object.js');

const TypedObj = Obj.Typed;

describe('Defense Object', () => {
    it('Holds information related to attack/defense', () => {
        const defObj = new Obj.Defense();
        const defObj2 = new Obj.Defense();
        expect(defObj.equals(defObj2)).to.equal(true);
        defObj.setAttack(3);
        expect(defObj.equals(defObj2)).to.equal(false);
    });
});

describe('Damage Object', () => {
    it('Contains info about damage', () => {
        const dmg1 = new Obj.Damage();
        const dmg2 = new Obj.Damage();
        expect(dmg2.equals(dmg1)).to.equal(true);
        dmg2.setDefense(9);
        expect(dmg2.equals(dmg1)).to.equal(false);

    });
});

describe('TypedObject', () => {
    it('Stores type info about the objects', () => {
        const obj = new TypedObj('actors', 'xxx');
        expect(obj.getPropType()).to.equal('actors');
        expect(obj.getType()).to.equal('xxx');
    });
});

describe('Locatable Object', () => {
    it('Stores location information', () => {
        const loc1 = new Obj.Locatable();
        expect(loc1.getLevel()).to.equal(null);

        const levelObj = {};

        loc1.setLevel(levelObj);
        loc1.setXY(1, 2);
        expect(loc1.isLocated()).to.equal(true);

        const loc2 = new Obj.Locatable();
        loc2.setXY(1, 2);
        loc2.setLevel(levelObj);
        expect(loc1.isSamePos(loc2)).to.equal(true);

    });
});

describe('Ownable Object', () => {
    it('Asks Locatable for location information', () => {
        const owner = new Obj.Locatable();
        owner.setXY(1, 2);
        const owned = new Obj.Ownable(owner);
        expect(owner.getX()).to.equal(1);
        expect(owner.getY()).to.equal(2);

        const level = {id: 'ABCD'};
        owner.setLevel(level);
        expect(owner.getLevel()).to.equal(level);

        expect(owned.getOwner()).to.equal(owner);

        expect(owner.isSamePos(owner)).to.equal(true);

    });
});

