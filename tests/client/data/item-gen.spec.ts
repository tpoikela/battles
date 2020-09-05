
import { expect } from 'chai';
import {ItemGen} from '../../../client/data/item-gen';
import {mixNewShell} from '../../../client/data/shell-utils';

import RG from '../../../client/src/rg';
import {ObjectShell} from '../../../client/src/objectshellparser';
import {SentientActor} from '../../../client/src/actor';

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
        /*
        console.log('WEAPONS:');
        for (let i = 0; i < 50; i++) {
            const shell = ItemGen.genRandShell('weapon');
            expect(shell).to.have.property('name');
            expect(shell).to.have.property('type');
            expect(shell).to.have.property('value');
            const {name, value, damage} = shell;
            console.log(value, 'gold,', 'name:', name, 'dmg:', damage);
        }
        console.log('ARMOUR:');
        for (let i = 0; i < 50; i++) {
            const shell = ItemGen.genRandShell('armour');
            expect(shell).to.have.property('name');
            expect(shell).to.have.property('type');
            expect(shell).to.have.property('value');
            const {name, value, protection} = shell;
            console.log(value, 'gold,', 'name:', name, 'pro:', protection);
        }
        */
        console.log('AMMO:');
        for (let i = 0; i < 50; i++) {
            const shell = ItemGen.genRandShell('ammo');
            expect(shell).to.have.property('name');
            expect(shell).to.have.property('type');
            expect(shell).to.have.property('value');
            const {name, value, damage} = shell;
            console.log(value, 'gold,', 'name:', name, 'dmg:', damage);
            expect(shell.damage).to.be.a('string');
        }
        console.log('MISSILEWEAPON:');
        for (let i = 0; i < 50; i++) {
            const shell = ItemGen.genRandShell('missileweapon');
            expect(shell).to.have.property('name');
            expect(shell).to.have.property('type');
            expect(shell).to.have.property('value');
            const {name, value, damage} = shell;
            console.log(value, 'gold,', 'name:', name, 'dmg:', damage);
            expect(shell.damage, `${name} has defined damage`).to.be.a('string');
        }
        console.log('MISSILE:');
        for (let i = 0; i < 50; i++) {
            const shell = ItemGen.genRandShell('missile');
            expect(shell).to.have.property('name');
            expect(shell).to.have.property('type');
            expect(shell).to.have.property('value');
            const {name, value, damage} = shell;
            console.log(value, 'gold,', 'name:', name, 'dmg: ', damage);
            expect(shell.damage, `${name} has defined damage`).to.be.a('string');
        }
    });

    it('can create items with stats modified', () => {
        const nameMap = {
            type: 'weapon', name: 'sword', prefix: 'light',
            suffix: 'ofMight', material: 'void'
        };
        const newShell = ItemGen.buildShell(nameMap);
        const parser = ObjectShell.getParser();

        const parsedShell = parser.parseObjShell(RG.TYPE_ITEM, newShell);
        const item = parser.createFromShell(RG.TYPE_ITEM, parsedShell);
        const actor = new SentientActor('wielder');
        const strBefore = actor.getStrength();
        actor.getInvEq().addItem(item);
        actor.getInvEq().equipItem(item);
        const strAfter = actor.getStrength();
        expect(strAfter).to.be.above(strBefore);

    });
});
