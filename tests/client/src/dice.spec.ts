
import {expect} from 'chai';
import {Dice} from '../../../client/src/dice';

describe('Dice', () => {

    it('has function to parse die spec from string', () => {
        let arr = Dice.parseDieSpec('3d5 - 2');
        expect(arr).to.deep.equal(['3', '5', '-2']);

        arr = Dice.parseDieSpec('2d7');
        expect(arr).to.deep.equal(['2', '7', '0']);

        arr = Dice.parseDieSpec('2d7 + 4');
        expect(arr).to.deep.equal(['2', '7', '4']);

        arr = Dice.parseDieSpec('11');
        expect(arr).to.deep.equal([0, 0, 11]);

        arr = Dice.parseDieSpec('-12');
        expect(arr).to.deep.equal([0, 0, -12]);
    });

    it('Produces random values based on constructor arguments', () => {
        const die = new Dice(1, 10, 1);
        for (let i = 0; i < 100; i++) {
            const val = die.roll();
            expect(val >= 2).to.equal(true);
            expect(val <= 11).to.equal(true);
        }

        const factDie = Dice.create('2d4 + 2');
        for (let i = 0; i < 100; i++) {
            const val = factDie.roll();
            expect(val >= 4).to.equal(true);
            expect(val <= 10).to.equal(true);
        }
    });

    it('Works also with string args', () => {
        const die = new Dice('1', '10', '1');
        for (let i = 0; i < 100; i++) {
            const val = die.roll();
            expect(val >= 2).to.equal(true);
            expect(val <= 11).to.equal(true);
        }

        const dieStr = die.toString();
        expect(dieStr).to.equal('1d10 + 1');

        const die2 = new Dice(1, 10, 1);
        expect(die2.equals(die)).to.equal(true);
        expect(die.equals(die2)).to.equal(true);


        const die3 = new Dice(0, 0, 0);
        for (let j = 0; j < 20; j++) {expect(die3.roll()).to.equal(0);}

        die3.copy(die);
        expect(die3.equals(die)).to.equal(true);
    });
});
