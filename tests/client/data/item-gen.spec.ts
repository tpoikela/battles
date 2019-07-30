
import { expect } from 'chai';
import {ItemGen} from '../../../client/data/item-gen';
import {mixNewShell} from '../../../client/data/shell-utils';

const {shellProps} = ItemGen;

describe('ItemGen', () => {

    it('can generate items from shells', () => {
        const baseShell = {
            damage: '1d6'
        };
        const daggerShell = {damage: '1d6', weight: 1.2};
        const sharpShell = {damage: '5'};
        const allShells = [baseShell, daggerShell, sharpShell];
        const sharpDaggerShell = mixNewShell(allShells);
        expect(sharpDaggerShell.damage).to.equal('2d6 + 5');

        const adder = {addDamage: '2d10 + 3'};
        const addedDaggerShell = mixNewShell([daggerShell, adder]);
        expect(addedDaggerShell.damage).to.equal('3d16 + 3');

        const heavy = {weight: 0.5};

        const heavyDagger = mixNewShell([daggerShell, heavy]);
        expect(heavyDagger.weight).to.equal(0.6);
        const heavyDagger2 = mixNewShell([heavy, daggerShell]);
        expect(heavyDagger2.weight).to.equal(0.6);

        const moreDmg = {damage: '1d2 + 1'};
        const fortDagger = mixNewShell([daggerShell, moreDmg]);
        expect(fortDagger.damage).to.equal('2d4 + 1');
    });

    it('can build shells from a name map', () => {
        const nameMap = {
            type: 'weapon', name: 'sword',
            prefix: 'light', suffix: 'ofVoid',
            material: 'void'
        };
        const newShell = ItemGen.buildShell(nameMap);
        expect(newShell.name).to.match(/light void sword of Void/);

        nameMap.material = 'iron';
        const ironSword = ItemGen.buildShell(nameMap);
        expect(ironSword.damage).to.equal('2d5 + 3');
    });

    it('has function generate random item shells', () => {
        for (let i = 0; i < 10; i++) {
            const shell = ItemGen.genRandShell('weapon');
            expect(shell).to.have.property('name');
            expect(shell).to.have.property('type');
            expect(shell).to.have.property('value');
        }
    });
});
