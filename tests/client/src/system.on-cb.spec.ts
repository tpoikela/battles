
import chai from 'chai';
import {chaiBattles} from '../../helpers/chai-battles';

import {SentientActor } from '../../../client/src/actor';
import {System} from '../../../client/src/system';
import {FactoryLevel} from '../../../client/src/factory.level';
import {ELEM} from '../../../client/data/elem-constants';
import * as Component from '../../../client/src/component';

const expect = chai.expect;
chai.use(chaiBattles);

const factLevel = new FactoryLevel();

describe('System.OnCbs', () => {

    it('handles cbs on component add/remove', () => {
        const cbsSystem = new System.OnCbs(['OnAddCb', 'OnRemoveCb']);
        const flyer = new SentientActor('flyer name');
        flyer.add(new Component.Flying());
        cbsSystem.update();
        const level = factLevel.createLevel('arena', 20, 20);
        level.getCell(1, 1).setBaseElem(ELEM.CHASM);
        level.getCell(2, 2).setBaseElem(ELEM.WATER);

        level.addActor(flyer, 1, 1);
        flyer.remove('Flying');
        expect(flyer).to.have.component('OnRemoveCb');

        expect(flyer).to.not.have.component('Paralysis');
        cbsSystem.update();
        expect(flyer).to.not.have.component('OnRemoveCb');
        expect(flyer).to.have.component('Paralysis');
        expect(flyer).to.have.component('OnAddCb');
        cbsSystem.update();

        cbsSystem.update();
        expect(flyer).to.not.have.component('OnAddCb');

        flyer.add(new Component.Flying());
        expect(flyer).to.have.component('OnAddCb');
        cbsSystem.update();
        expect(flyer).to.not.have.component('Paralysis');
        expect(flyer).to.not.have.component('OnAddCb');

        level.moveActorTo(flyer, 2, 2);
        flyer.add(new Component.Paralysis());
        cbsSystem.update();
        expect(flyer).to.have.component('Drowning');
        flyer.remove('Paralysis');
        cbsSystem.update();
        expect(flyer).to.not.have.component('Drowning');
    });
});
