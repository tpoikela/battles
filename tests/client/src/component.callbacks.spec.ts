
import {expect} from 'chai';
import {Entity} from '../../../client/src/entity';
import * as Component from '../../../client/src/component';
import {TagComponent, DataComponent, NO_SERIALISATION
} from '../../../client/src/component/component.base';
import {SentientActor} from '../../../client/src/actor';
import {FactoryActor} from '../../../client/src/factory.actors';

const ComponentBase = Component.ComponentBase;
const CompDefs = Component.Component;

describe('Component.Callbacks', () => {

    it('is used to define component/entity callbacks', () => {
        const cbs = new Component.Callbacks();
        cbs.addCb('onHit', {addComp: 'Flying'});
        const cb = cbs.cb('onHit');
        expect(cb.addComp).to.equal('Flying');

    });
});
