

const expect = require('chai').expect;
const RG = require('../../../client/src/battles');

const Actor = RG.Actor.Rogue;

const updateSystems = systems => {
    for (let i = 0; i < systems.length; i++) {
        systems[i].update();
    }
};


const createSystems = () => {
    const mSystem = new RG.System.Missile(['Missile']);
    const dSystem = new RG.System.Damage(['Damage']);
    return [mSystem, dSystem];
};

const createMissile = obj => {
    const mEnt = new RG.Item.Missile('missile');
    mEnt.add(new RG.Component.Indestructible());
    const mComp = new RG.Component.Missile(obj.src);
    mComp.setDamage(obj.d);
    mEnt.add('Missile', mComp);
    mComp.setTargetXY(obj.x, obj.y);
    mComp.setRange(obj.r);
    return mComp;
};

describe('How missile is fired and hits a wall', () => {
    it('Starts from source and flies to target', () => {
        const systems = createSystems();

        const level = RG.FACT.createLevel('arena', 30, 30);
        // Archer to fire the missiles
        const srcEnt = new Actor('archer');

        level.addActor(srcEnt, 1, 1);

        const mEnt = new RG.Item.Missile('missile');
        const mComp = new RG.Component.Missile(srcEnt);
        mEnt.add('Missile', mComp);

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
        const systems = createSystems();

        const level = RG.FACT.createLevel('arena', 30, 30);
        // Archer to fire the missiles
        const srcEnt = new Actor('archer');
        level.addActor(srcEnt, 1, 1);

        const wall = new RG.Element.Base('wall');
        const map = level.getMap();
        const cell = map.getCell(1, 3);
        cell.setProp('elements', wall);

        const mEnt = new RG.Item.Missile('missile');
        mEnt.add(new RG.Component.Indestructible());
        const mComp = new RG.Component.Missile(srcEnt);
        mEnt.add('Missile', mComp);
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
        const systems = createSystems();

        const level = RG.FACT.createLevel('arena', 30, 30);
        // Archer to fire the missiles
        const srcEnt = new Actor('archer');
        level.addActor(srcEnt, 1, 1);
        const targetEnt = new Actor('prey');
        const targetHP = targetEnt.get('Health').getHP();

        targetEnt.get('Combat').setDefense(0);
        targetEnt.get('Stats').setAgility(0);
        level.addActor(targetEnt, 1, 6);

        // const mEnt = new RG.Item.Missile('missile');
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
        const systems = createSystems();
        const level = RG.FACT.createLevel('arena', 30, 30);
        // Archer to fire the missiles
        const srcEnt = new Actor('archer');
        level.addActor(srcEnt, 1, 1);

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
        const systems = createSystems();
        const level = RG.FACT.createLevel('arena', 30, 30);
        const srcEnt = new Actor('archer');
        level.addActor(srcEnt, 1, 1);
        const etherBeing = new Actor('spirit');
        etherBeing.add(new RG.Component.Ethereal());
        level.addActor(etherBeing, 1, 2);
        const etherCell = etherBeing.getCell();

        for (let i = 0; i < 20; i++) {
            const mComp = createMissile({src: srcEnt, x: 1, y: 4, r: 3, d: 5});
            updateSystems(systems);
            const targetCell = level.getMap().getCell(1, 4);
            expect(targetCell.hasProp('items')).to.equal(true);
            expect(etherCell.hasProp('items')).to.equal(false);
        }

    });
});

describe('How missile weapons affect missiles', () => {
    it('adds to the default range of missile', () => {
        const sword = new RG.Item.Weapon('sword');
        sword.setAttack(10);
        const rifle = new RG.Item.MissileWeapon('rifle');
        rifle.setAttack(1);
        rifle.setAttackRange(4);
        rifle.setDamageDie('1d1+1');
        const ammo = new RG.Item.Ammo('rifle bullet');
        ammo.setAttack(2);
        ammo.setAttackRange(2);
        ammo.setDamageDie('3d1+3');
        const actor = new RG.Actor.Rogue('rogue');
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
