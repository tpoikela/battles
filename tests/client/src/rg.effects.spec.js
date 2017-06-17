
const expect = require('chai').expect;

const RG = require('../../../client/src/battles');
const Effects = require('../../../client/data/effects');

const getEffectByName = function(obj, name) {
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

        const cell = new RG.Map.Cell();
        cell.setProp('actors', actor);

        potion.use({target: cell});
        const hpAfter = actor.get('Health').getHP();
        expect(hpAfter).to.be.above(hpBefore);
    });
});
