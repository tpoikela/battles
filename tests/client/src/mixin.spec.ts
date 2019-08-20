
import {expect} from 'chai';
import * as Mixin from '../../../client/src/mixin';
import {Entity} from '../../../client/src/entity';

class Base extends Entity {}

describe('Mixin.Typed', () => {

    it('can be used to add type info to class', () => {
        class TestTyped extends Mixin.Typed(Base) {
        }

        const typed = new TestTyped({type: 'TestType'});
        expect(typed).not.to.be.empty;
        expect(typed.getType()).to.equal('TestType');
    });

});

describe('Mixin.Locatable', () => {

    it('can be used to add location info to class', () => {
        class Actor extends Mixin.Locatable(Base) {
        }

        const actor = new Actor();
        actor.setX(1);
        actor.setY(2);
        expect(actor.getXY()).to.deep.equal([1, 2]);
    });

});

describe('Mixin.DamageRoll', () => {

    it('can be used to add location info to class', () => {
        class Damaging extends Mixin.DamageRoll(Base) {

            public getEntity() {
                return {};
            }

        }

        const dd = new Damaging();
        const numDamage: number = dd.rollDamage();
        expect(numDamage).to.be.above(0);
    });

});
