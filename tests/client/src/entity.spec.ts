
import { expect } from 'chai';

import RG from '../../../client/src/rg';
import * as Component from '../../../client/src/component';
import {Entity} from '../../../client/src/entity';

describe('Entity', () => {

    let entity: Entity = null;
    let testComp: any = null;
    let testComp1: any = null;

    beforeEach(() => {
        entity = new Entity();
        testComp = new Component.CombatMods();
        testComp1 = new Component.CombatMods();
        entity.add(testComp);
        entity.add(testComp1);
    });

    it('contains components', () => {
        const compMap = entity.getComponents();
        const compList = Object.values(compMap);
        expect(compList.length).to.equal(2);

        const modList = entity.getList('CombatMods');
        expect(modList.length).to.equal(2);

        const combatComp = entity.get('CombatMods');
        expect(combatComp.getID()).to.be.above(0);

        const combatComp2 = entity.get('CombatMods');
        expect(combatComp2.getID()).to.equal(combatComp.getID());

        const statComp = new Component.StatsMods();
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
