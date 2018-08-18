
const chai = require('chai');

const RG = require('../../../client/src/battles');
const Effects = require('../../../client/data/effects');
RG.System = require('../../../client/src/system');
const chaiBattles = require('../../helpers/chai-battles');

const RGTest = require('../../roguetest');

chai.use(chaiBattles);
const expect = chai.expect;

const getEffectByName = (obj, name) => {
    const index = obj.effects.findIndex(item => item.name === name);
    return obj.effects[index];
};

describe('RG.Effects', () => {

    let useEffect = null;
    let useSystem = null;
    let effSystem = null;
    let sword = null;
    let userActor = null;
    let cell = null;

    beforeEach(() => {
        useEffect = getEffectByName(Effects, 'use');
        useSystem = new RG.System.BaseAction(['UseItem']);
        effSystem = new RG.System.Effects(['Effects']);
        sword = new RG.Item.Weapon('Add comp');
        sword.useArgs = { };
        sword.use = useEffect.func.bind(sword);
        userActor = new RG.Actor.Rogue('User One');
        userActor.getInvEq().addItem(sword);

        cell = new RG.Map.Cell(0, 0, RG.ELEM.FLOOR);
        cell.setProp('actors', userActor);
    });

    afterEach(() => {

    });

    it('has digger effect', () => {
        const diggerEffect = getEffectByName(Effects, 'digger');

        sword.useArgs.fromType = 'wall';

        // Setup use function
        const useFunc = diggerEffect.func.bind(sword);
        sword.useFuncs = [useFunc];

        expect(cell.setBaseElem(RG.ELEM.WALL));
        expect(cell.getBaseElem().getType()).to.equal('wall');
        sword.use({target: cell});

        expect(userActor).to.have.component('UseItem');
        useSystem.update();
        expect(userActor).to.have.component('Effects');
        effSystem.update();

        expect(cell.getBaseElem().getType()).to.equal('floor');
    });

    it('has heal effect', () => {
        const healEffect = getEffectByName(Effects, 'heal');

        const potion = new RG.Item.Potion('Healing potion');
        potion.useArgs = { };
        potion.useArgs.hp = '12d1';

        potion.use = useEffect.func.bind(potion);
        const healFunc = healEffect.func.bind(potion);
        potion.useFuncs = [healFunc];

        const actor = new RG.Actor.Rogue('Healed one');
        actor.getInvEq().addItem(potion);
        actor.get('Health').setHP(10);
        const hpBefore = actor.get('Health').getHP();

        const cell = new RG.Map.Cell(0, 0, RG.ELEM.FLOOR);
        cell.setProp('actors', actor);

        potion.use({target: cell});

        expect(actor).to.have.component('UseItem');
        useSystem.update();

        const hpAfter = actor.get('Health').getHP();
        expect(hpAfter).to.be.above(hpBefore);
    });

    it('has stun effect', () => {
        const stunEffect = getEffectByName(Effects, 'stun');

        const potion = new RG.Item.Potion('Stunning potion');
        potion.useArgs = { };
        potion.useArgs.duration = '12d1';

        potion.use = useEffect.func.bind(potion);
        const stunFunc = stunEffect.func.bind(potion);
        potion.useFuncs = [stunFunc];

        const actor = new RG.Actor.Rogue('Healed one');
        actor.getInvEq().addItem(potion);

        const cell = new RG.Map.Cell(0, 0, RG.ELEM.FLOOR);
        cell.setProp('actors', actor);

        expect(actor.has('Stun')).to.equal(false);
        expect(actor.has('Expiration')).to.equal(false);
        potion.use({target: cell});
        expect(actor.has('Stun')).to.equal(true);
        expect(actor.has('Expiration')).to.equal(true);
    });

    it('has effect to add any component for specific duration', () => {
        const addCompEffect = getEffectByName(Effects, 'addComp');

        // Setup useArgs
        sword.useArgs.duration = '12d1';
        sword.useArgs.name = 'Ethereal';

        // Setup use function
        const addCompFunc = addCompEffect.func.bind(sword);
        sword.useFuncs = [addCompFunc];

        expect(userActor.has('Ethereal')).to.equal(false);
        expect(userActor.has('Expiration')).to.equal(false);
        sword.use({target: cell});

        expect(userActor).to.have.component('UseItem');
        useSystem.update();
        expect(userActor).not.to.have.component('UseItem');
        expect(userActor).to.have.component('Effects');

        effSystem.update();
        expect(userActor).not.to.have.component('Effects');
        expect(userActor).to.have.component('Ethereal');
        expect(userActor).to.have.component('Expiration');
    });

    it('has effect to add value to comp', () => {
        const addCompValue = getEffectByName(Effects, 'addToCompValue');

        // Setup useArgs
        sword.useArgs.name = 'Stats';
        sword.useArgs.set = 'setStrength';
        sword.useArgs.get = 'getStrength';
        sword.useArgs.value = 10;

        // Setup use function
        const useFunc = addCompValue.func.bind(sword);
        sword.useFuncs = [];
        sword.useFuncs.push(useFunc);

        const statsComp = userActor.get('Stats');
        const str = statsComp.getStrength();
        sword.use({target: cell});

        expect(userActor).to.have.component('UseItem');
        useSystem.update();
        expect(userActor).to.have.component('Effects');
        effSystem.update();

        const strNew = statsComp.getStrength();
        expect(strNew).to.equal(str + 10);
    });

    it('has an effect to add entities to cells', () => {
        const addEntEffect = getEffectByName(Effects, 'addEntity');

        const level = RGTest.wrapIntoLevel([userActor]);
        cell = level.getCell(1, 1);
        RGTest.moveEntityTo(userActor, 1, 1);

        sword.useArgs.entityName = 'Fire';

        // Setup use function
        const useFunc = addEntEffect.func.bind(sword);
        sword.useFuncs = [];
        sword.useFuncs.push(useFunc);

        let actors = cell.getActors();
        expect(actors).to.have.length(1);

        sword.use({target: cell});

        expect(userActor).to.have.component('UseItem');
        useSystem.update();
        expect(userActor).to.have.component('Effects');
        effSystem.update();

        actors = cell.getActors();
        expect(actors).to.have.length(2);
    });
});
