

import {expect} from 'chai';
import RG from '../../../client/src/rg';
import { SentientActor } from '../../../client/src/actor';
import { System } from '../../../client/src/system';
import * as Item from '../../../client/src/item';
import * as Component from '../../../client/src/component';
import * as Element from '../../../client/src/element';
import {FactoryLevel} from '../../../client/src/factory.level';

const Actor = SentientActor;

const updateSystems = systems => {
    for (let i = 0; i < systems.length; i++) {
        systems[i].update();
    }
};


const createSystems = () => {
    const mSystem = new System.Missile(['Missile']);
    const dSystem = new System.Damage(['Damage']);
    return [mSystem, dSystem];
};

const createMissile = obj => {
    const mEnt = new Item.Missile('missile');
    mEnt.add(new Component.Indestructible());
    const mComp = new Component.Missile(obj.src);
    mComp.setDamage(obj.d);
    mEnt.add(mComp);
    mComp.setTargetXY(obj.x, obj.y);
    mComp.setRange(obj.r);
    return mComp;
};

describe('How missile is fired and hits a wall', () => {

    let systems = null;
    let level = null;
    let srcEnt = null;

    beforeEach(() => {
        const factLevel = new FactoryLevel();
        systems = createSystems();
        level = factLevel.createLevel('arena', 30, 30);
        srcEnt = new Actor('archer');
        level.addActor(srcEnt, 1, 1);
    });

    it('Starts from source and flies to target', () => {

        const mEnt = new Item.Missile('missile');
        mEnt.add(new Component.Indestructible());
        const mComp = new Component.Missile(srcEnt);
        mEnt.add(mComp);

        expect(mComp.getX()).to.equal(1);
        expect(mComp.getY()).to.equal(1);
        mComp.setTargetXY(1, 4);
        mComp.setRange(3);

        updateSystems(systems);
        expect(mComp.getX()).to.equal(1);
        expect(mComp.getY()).to.equal(4);
        expect(mComp.inTarget()).to.equal(true);
        expect(mComp.isFlying()).to.equal(false);

        // Now item should be lying around in the slot
        const targetCell = level.getMap().getCell(1, 4);
        expect(targetCell.hasProp('items')).to.equal(true);
    });

    it('Stops and hits a wall', () => {
        const wall = new Element.ElementWall('wall');
        const map = level.getMap();
        const cell = map.getCell(1, 3);
        cell.setBaseElem(wall);

        const mEnt = new Item.Missile('missile');
        mEnt.add(new Component.Indestructible());
        const mComp = new Component.Missile(srcEnt);
        mEnt.add(mComp);
        mComp.setTargetXY(1, 4);
        mComp.setRange(3);

        updateSystems(systems);
        expect(mComp.getX()).to.equal(1);
        expect(mComp.getY()).to.equal(2);
        expect(mComp.inTarget()).to.equal(false);
        expect(mComp.isFlying()).to.equal(false);

        const targetCell = level.getMap().getCell(1, 2);
        expect(targetCell.hasProp('items')).to.equal(true);

    });

    it('Stops and hits an entity (actor)', () => {
        const targetEnt = new Actor('prey');
        const targetHP = targetEnt.get('Health').getHP();

        targetEnt.get('Combat').setDefense(0);
        targetEnt.get('Stats').setAgility(0);
        level.addActor(targetEnt, 1, 6);

        // const mEnt = new Item.Missile('missile');
        const mComp = createMissile({src: srcEnt, x: 1, y: 6, r: 10, d: 5});
        mComp.setAttack(1);

        updateSystems(systems);
        expect(mComp.getX()).to.equal(1);
        expect(mComp.getY()).to.equal(6);
        expect(mComp.inTarget()).to.equal(true);
        expect(mComp.isFlying()).to.equal(false);

        const currHP = targetEnt.get('Health').getHP();
        expect(targetEnt.has('Damage')).to.equal(false);
        expect(currHP).to.equal(targetHP - 5);

        const targetCell = level.getMap().getCell(1, 6);
        expect(targetCell.hasProp('items')).to.equal(true);
        expect(targetCell.hasPropType('missile')).to.equal(true);
    });

    it('Stops after reaching maximum range', () => {
        const mComp = createMissile({src: srcEnt, x: 1, y: 6, r: 4, d: 5});

        updateSystems(systems);
        expect(mComp.getX()).to.equal(1);
        expect(mComp.getY()).to.equal(5);
        expect(mComp.inTarget()).to.equal(false);
        expect(mComp.isFlying()).to.equal(false);

        const targetCell = level.getMap().getCell(1, 5);
        expect(targetCell.hasProp('items')).to.equal(true);
        expect(targetCell.hasPropType('missile')).to.equal(true);
    });

    it('Missile passes through ethereal beings', () => {
        const etherBeing = new Actor('spirit');
        etherBeing.add(new Component.Ethereal());
        level.addActor(etherBeing, 1, 2);
        const etherCell = etherBeing.getCell();

        for (let i = 0; i < 20; i++) {
            const mComp = createMissile({src: srcEnt, x: 1, y: 4, r: 3, d: 5});
            updateSystems(systems);
            const targetCell = level.getMap().getCell(1, 4);
            expect(targetCell.hasProp('items')).to.equal(true);
            expect(etherCell.hasProp('items')).to.equal(false);
            expect(mComp.getY()).to.equal(4);
        }

    });
});

describe('How missile weapons affect missiles', () => {
    it('adds to the default range of missile', () => {
        const sword = new Item.Weapon('sword');
        sword.setAttack(10);
        const rifle = new Item.MissileWeapon('rifle');
        rifle.setAttack(1);
        rifle.setAttackRange(4);
        rifle.setDamageDie('1d1+1');
        const ammo = new Item.Ammo('rifle bullet');
        ammo.setAttack(2);
        ammo.setAttackRange(2);
        ammo.setDamageDie('3d1+3');
        const actor = new SentientActor('rogue');
        actor.get('Stats').setAccuracy(0);
        actor.get('Stats').setAgility(0);
        actor.get('Combat').setAttack(0);
        const invEq = actor.getInvEq();

        invEq.addItem(sword);
        invEq.addItem(rifle);
        invEq.addItem(ammo);
        expect(invEq.equipItem(sword)).to.equal(true);
        expect(invEq.equipItem(rifle)).to.equal(true);
        expect(invEq.equipItem(ammo)).to.equal(true);

        const attack = RG.getMissileAttack(actor, ammo);
        expect(attack).to.equal(3);

        const damage = RG.getMissileDamage(actor, ammo);
        expect(damage).to.equal(8);

        const range = RG.getMissileRange(actor, ammo);
        expect(range).to.equal(6);

    });
});
