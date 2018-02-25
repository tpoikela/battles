
const expect = require('chai').expect;

const RG = require('../../../client/src/battles');
const Effects = require('../../../client/data/effects');

const getEffectByName = (obj, name) => {
    const index = obj.effects.findIndex(item => item.name === name);
    return obj.effects[index];
};

describe('RG.Effects', () => {

    beforeEach(() => {

    });

    afterEach(() => {

    });

    it('has heal effect', () => {
        const healEffect = getEffectByName(Effects, 'heal');
        const useEffect = getEffectByName(Effects, 'use');

        const potion = new RG.Item.Potion('Healing potion');
        potion.useArgs = { };
        potion.useArgs.hp = '12d1';

        potion.use = useEffect.func.bind(potion);
        const healFunc = healEffect.func.bind(potion);
        potion.useFuncs = [];
        potion.useFuncs.push(healFunc);

        const actor = new RG.Actor.Rogue('Healed one');
        actor.getInvEq().addItem(potion);
        actor.get('Health').setHP(10);
        const hpBefore = actor.get('Health').getHP();

        const cell = new RG.Map.Cell(0, 0, RG.ELEM.FLOOR);
        cell.setProp('actors', actor);

        potion.use({target: cell});
        const hpAfter = actor.get('Health').getHP();
        expect(hpAfter).to.be.above(hpBefore);
    });

    it('has stun effect', () => {
        const stunEffect = getEffectByName(Effects, 'stun');
        const useEffect = getEffectByName(Effects, 'use');

        const potion = new RG.Item.Potion('Stunning potion');
        potion.useArgs = { };
        potion.useArgs.duration = '12d1';

        potion.use = useEffect.func.bind(potion);
        const stunFunc = stunEffect.func.bind(potion);
        potion.useFuncs = [];
        potion.useFuncs.push(stunFunc);

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
        const useEffect = getEffectByName(Effects, 'use');

        const sword = new RG.Item.Weapon('Add comp');
        sword.useArgs = { };
        sword.useArgs.duration = '12d1';
        sword.useArgs.name = 'Ethereal';

        sword.use = useEffect.func.bind(sword);
        const stunFunc = addCompEffect.func.bind(sword);
        sword.useFuncs = [];
        sword.useFuncs.push(stunFunc);

        const actor = new RG.Actor.Rogue('Ethereal one');
        actor.getInvEq().addItem(sword);

        const cell = new RG.Map.Cell(0, 0, RG.ELEM.FLOOR);
        cell.setProp('actors', actor);

        expect(actor.has('Ethereal')).to.equal(false);
        expect(actor.has('Expiration')).to.equal(false);
        sword.use({target: cell});
        expect(actor.has('Ethereal')).to.equal(true);
        expect(actor.has('Expiration')).to.equal(true);
    });
});
