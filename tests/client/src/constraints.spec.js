
import { expect } from 'chai';
import Constraints from '../../../client/src/constraints';

// const RG = require('../../../client/src/battles');
// const RGTest = require('../../roguetest.js');

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
});
