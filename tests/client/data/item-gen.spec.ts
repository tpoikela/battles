
import { expect } from 'chai';
import {ItemGen} from '../../../client/data/item-gen';
import {mixNewShell} from '../../../client/data/shell-utils';

describe('ItemGen', () => {

    it('can generate items from shells', () => {
        const baseShell = {
            damage: '1d6'
        };
        const daggerShell = {damage: '1d6'};
        const sharpShell = {damage: '5'};
        const allShells = [baseShell, daggerShell, sharpShell];
        const sharpDaggerShell = mixNewShell(allShells);
        expect(sharpDaggerShell.damage).to.equal('2d6 + 5');
    });

    it('has function generate random item shells', () => {
        for (let i = 0; i < 10; i++) {
            const shell = ItemGen.genRandShell('weapon');
            console.log(shell);
        }
    });
});
