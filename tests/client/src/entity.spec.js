
import { expect } from 'chai';
import Entity from '../../../client/src/entity';

const RG = require('../../../client/src/rg');
RG.Component = require('../../../client/src/component');

describe('Entity', () => {

    let entity = null;
    let testComp = null;
    let testComp1 = null;

    beforeEach(() => {
        entity = new Entity();
        testComp = new RG.Component.CombatMods();
        testComp1 = new RG.Component.CombatMods();
        entity.add(testComp);
        entity.add(testComp1);
    });

    it('contains componets', () => {

        const compMap = entity.getComponents();
        const compList = Object.values(compMap);
        expect(compList.length).to.equal(2);

        const modList = entity.getList('CombatMods');
        expect(modList.length).to.equal(2);

        const combatComp = entity.get('CombatMods');
        expect(combatComp).not.to.be.empty;

        const statComp = new RG.Component.StatsMods();
        expect(entity.remove.bind(entity, 'StatsMods')).
            not.to.throw();
        entity.remove(statComp);

    });

    it('can have components removed by name', () => {
        entity.remove('CombatMods');
        let list = entity.getList('CombatMods');
        expect(list.length).to.equal(1);

        entity.remove('CombatMods');
        list = entity.getList('CombatMods');
        expect(list.length).to.equal(0);
    });

    it('can have components removed by object', () => {
        entity.remove(testComp1);
        let list = entity.getList('CombatMods');
        expect(list.length).to.equal(1);

        entity.remove(testComp1);
        list = entity.getList('CombatMods');
        expect(list.length).to.equal(1);
    });
});
