
import chai from 'chai';
import {mixNewShell} from '../../../client/data/shell-utils';
import {ActorGen} from '../../../client/data/actor-gen';
import {ObjectShell} from '../../../client/src/objectshellparser';

const expect = chai.expect;

describe('ShellUtils', () => {
    it('can mix new actor shells', () => {
        const shell1 = {type: 'orc', role: 'thief'};
        const shell2 = {type: 'elf', addComp: ['Undead']};

        const mixed = mixNewShell([shell1, shell2]);

        expect(mixed.type).to.equal('elf');
        expect(mixed.addComp).to.deep.equal(shell2.addComp);

        const shell3 = {role: 'archer', addComp: ['EagleEye']};

        const mixed2 = mixNewShell([shell2, shell3]);
        expect(mixed2.addComp).to.deep.equal(['Undead', 'EagleEye']);
    });

    it('can add shell props together', () => {
        const shell1 = {type: 'orc', role: 'thief', strength: 7};
        const shell2 = {
            strength: 5,
            type: 'elf', addComp: ['Undead']
        };
        const mixed = mixNewShell([shell1, shell2]);
        expect(mixed.strength).to.equal(7 + 5);
    });
});

describe('ActorGen', () => {
    it('can generate random actor shells', () => {
        const randShell = ActorGen.genRandShell();

        expect(randShell).to.have.property('name');
        expect(randShell).to.have.property('type');
        expect(randShell).to.have.property('char');
        console.log(randShell);

        const actorsGenerated = ActorGen.genActors(200);
        const parser = ObjectShell.getParser();
        parser.parseShellData({actors: actorsGenerated});

        actorsGenerated.forEach(shell => {
            const actor = parser.createActor(shell.name);
            expect(actor.getName()).to.equal(shell.name);
        });

    });
});
