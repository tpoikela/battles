
import Entity from '../../client/src/entity';

module.exports = function(chai, utils) {
    const Assertion = chai.Assertion;

    Assertion.addProperty('dead', function() {
      this.assert(
          this._obj.get('Health').isDead()
        , 'expected #{this} to be dead'
        , 'expected #{this} to not be dead'
      );
    });

    //----------------
    // ENTITY
    //----------------
    Assertion.addProperty('entity', function() {
        this.assert(
            new Assertion(this._obj).to.be.instanceof(Entity)
            , 'expected #{this} to be an entity'
            , 'expected #{this} to not be an entity'
        );

    });

    const assertIsEntity = function(type = '') {
        const gotType = this._obj.getPropType();
        if (type !== '') {
            new Assertion(gotType).to.equal(type);
        }

        this.assert(
            this._obj instanceof Entity
            , 'expected #{this} to be an entity'
            , 'expected #{this} to not be an entity'
        );
    };

    Assertion.addMethod('entity', assertIsEntity);

    //----------------
    // COMPONENT
    //----------------

    /* Checks that an entity has given component. */
    function assertHasComp(type) {
        // make sure we are working with a model
        new Assertion(this._obj).to.be.instanceof(Entity);

        // make sure we have an age and its a number
        const hasComp = this._obj.has(type);

        let name = 'entity ID: ' + this._obj.getID();
        if (this._obj.getName) {
            name += ` (${this._obj.getName()})`;
        }
        // do our comparison
        this.assert(
            hasComp
            , `expected ${name} to have comp #{exp}`
            , `expected ${name} to not have comp #{exp}`
            , type
        );
    }

    function chainHasComp() {
        utils.flag(this, 'entity.component', true);
    }

    Assertion.addChainableMethod('component', assertHasComp, chainHasComp);
    Assertion.addChainableMethod('comp', assertHasComp, chainHasComp);

    //----------------------
    // VERIFYING STATS
    //----------------------

    function assertStatIs(statName, value) {
        new Assertion(this._obj).to.be.instanceof(Entity);
        const stats = this._obj.get('Stats');
        const getter = 'get' + statName.capitalize();
        const gotValue = stats[getter]();
        const name = this._obj.getName();
        this.assert(
            gotValue === value
            , `expected ${name} to have ${statName} of ${value}`
            , `expected ${name} not to have ${statName} of ${value}`
        );

    }

    function chainStatIs() {
        utils.flag(this, 'entity.stats', true);
    }

    function assertAccuracyIs(value) {
        assertStatIs.call(this, 'accuracy', value);
    }

    Assertion.addChainableMethod('stats', assertStatIs, chainStatIs);
    Assertion.addChainableMethod('accuracy', assertAccuracyIs, chainStatIs);

};
