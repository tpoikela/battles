
import { expect } from 'chai';
import {Constraints} from '../../../client/src/constraints';
import {SentientActor} from '../../../client/src/actor';

// const RG = require('../../../client/src/battles');
import {RGTest} from '../../roguetest';
import {RGUnitTests} from '../../rg.unit-tests';

function Actor(name) {
    this.name = name;
    this.getName = () => this.name;
}

describe('Constraints', () => {

    let fact = null;

    beforeEach(() => {
        fact = new Constraints();
    });

    it('creates functions from simple constraints', () => {
        const cc = {op: 'eq', prop: 'type', value: 'Human'};
        const funcIsHuman = fact.getConstraints(cc);

        const human = {type: 'Human'};
        const animal = {type: 'Animal'};
        expect(funcIsHuman(human)).to.equal(true);
        expect(funcIsHuman(animal)).to.equal(false);
    });

    it('creates functions from constraints with many values', () => {
        const cc = {op: 'eq', prop: 'type', value: ['Human', 'Animal']};
        const funcIsHumanOrAnimal = fact.getConstraints(cc);

        const human = {type: 'Human'};
        const animal = {type: 'Animal'};
        const orc = {type: 'Orc'};
        expect(funcIsHumanOrAnimal(human)).to.equal(true);
        expect(funcIsHumanOrAnimal(animal)).to.equal(true);
        expect(funcIsHumanOrAnimal(orc)).to.equal(false);
    });

    it('creates function for multiple constraints', () => {
        const cc = [
            {op: 'eq', prop: 'type', value: ['Human', 'Animal']},
            {op: 'gte', prop: 'danger', value: 5}
        ];
        const funcIsDangerousHumanOrAnimal = fact.getConstraints(cc);
        const human = {type: 'Human', danger: 0};
        const animal = {type: 'Animal', danger: 1};
        expect(funcIsDangerousHumanOrAnimal(human)).to.equal(false);
        expect(funcIsDangerousHumanOrAnimal(animal)).to.equal(false);

        const humanDangr = {type: 'Human', danger: 5};
        const animalDangr = {type: 'Animal', danger: 6};
        const orcDangr = {type: 'Orc', danger: 7};
        expect(funcIsDangerousHumanOrAnimal(humanDangr)).to.equal(true);
        expect(funcIsDangerousHumanOrAnimal(animalDangr)).to.equal(true);
        expect(funcIsDangerousHumanOrAnimal(orcDangr)).to.equal(false);
    });

    it('has not equal (neq) operator', () => {
        const cc = [
            {op: 'eq', prop: 'type', value: ['Goblin', 'Animal']},
            {op: 'neq', prop: 'tag', value: 'winterbeing'}
        ];

        const funcIsNotWinterBeing = fact.getConstraints(cc);
        const goblin = {type: 'Goblin'};
        const wildling = {type: 'Wildling'};

        expect(funcIsNotWinterBeing(wildling)).to.equal(false);
        expect(funcIsNotWinterBeing(goblin)).to.equal(true);
    });

    it('supports query object props via getter funcs', () => {
        const cc = [
            {op: 'eq', func: 'getName', value: 'goblin'}
        ];
        const funcNameIsGoblin = fact.getConstraints(cc);
        const actor = new Actor('goblin');
        const actor2 = new Actor('orc');
        expect(funcNameIsGoblin(actor)).to.equal(true);
        expect(funcNameIsGoblin(actor2)).to.equal(false);

        const ccAggr = [
            {op: 'eq', func: 'getName', value: ['goblin', 'orc']}
        ];
        const funcNameAggr = fact.getConstraints(ccAggr);
        expect(funcNameAggr(actor)).to.equal(true);
        expect(funcNameAggr(actor2)).to.equal(true);

        const compCC = [
            {op: '==', value: 10, comp: ['Stats', 'getStrength']}
        ];
        const funcNameComp = fact.getConstraints(compCC);
        expect(funcNameComp.bind(actor)).to.throw(Error);

    });

    it('supports quering component values', () => {
        const compCC = [
            {op: '>=', value: 10, comp: ['Stats', 'getStrength']},
            {op: 'match', value: ['orc', 'goblin'], comp: ['Named', 'getFullName']}
        ];
        const funcCC = fact.getConstraints(compCC);
        const goblin = new SentientActor('goblin');
        const orc = new SentientActor('orc');
        const elf = new SentientActor('elf');
        goblin.get('Stats').setStrength(11);
        elf.get('Stats').setStrength(12);
        expect(funcCC(goblin)).to.equal(true);
        expect(funcCC(elf)).to.equal(false);
        expect(funcCC(orc)).to.equal(false);
    });

    it('supports getting values using dot notation', () => {
        const hierCC = [
            {op: '>=', func: 'get.getStrength', args: ['Stats'], value: 10},
            {op: 'match', func: 'get.getFullName', args: ['Named'], value: 'goblin'}
        ];
        const funcCC = fact.getConstraints(hierCC);
        const goblin = new SentientActor('goblin');
        goblin.get('Stats').setStrength(11);
        const goblin2 = new SentientActor('goblin2');
        expect(funcCC(goblin)).to.equal(true);
        expect(funcCC(goblin2)).to.equal(false);

    });

    it('can be used for placement constraints', () => {
        const level = RGUnitTests.wrapIntoLevel([], 20, 20);
        const constrPlace = [
            {'op':'eq','func':'getX','value':[0,19]},
            {'op':'eq','func':'getY','value':[0,19]}
        ];
        const placeConstrFunc = new Constraints('or').getConstraints(constrPlace);
        const cells = level.getMap().getCells().filter(placeConstrFunc);
        // Map border cells should match
        expect(cells.length).to.equal(20 + 20 + 18 + 18);

    });
});
