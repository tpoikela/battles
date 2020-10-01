
import chai from 'chai';
import RG from '../../../client/src/rg';

import {SystemZoneEvents} from '../../../client/src/system/system.zone-events';
import * as Component from '../../../client/src/component';
import {emitZoneEvent} from '../../../client/src/system/system.utils';
import {ZoneBase, WorldTop} from '../../../client/src/world';
import {Entity} from '../../../client/src/entity';

import {RGTest} from '../../roguetest';
// import {RGUnitTests} from '../../rg.unit-tests';
import {chaiBattles} from '../../helpers/chai-battles';

const updateSystems = RGTest.updateSystems;

const expect = chai.expect;
chai.use(chaiBattles);

describe('SystemZoneEvents', () => {

    let sysZone = null;
    let world: WorldTop = null;

    beforeEach(() => {
        sysZone = new SystemZoneEvents(['ZoneEvent'], Entity.getPool());
        world = RGTest.createTestWorld();
        sysZone.setArgs({worldTop: world});
    });

    it('responds to various zone events', () => {
        const zEvt = new Component.ZoneEvent();
        zEvt.setEventType();

        // const cityZone = world.findZone(zs => (
            //zs.getName() === RGTest.CityConf.name));
        const dungZone: ZoneBase = world.findZone((zs: any) => (
            zs.getName() === RGTest.DungeonConf.name))[0];
        emitZoneEvent(dungZone.getLevels()[0], RG.ZONE_EVT.ZONE_EXPLORED);
        expect(dungZone).to.have.component('ZoneEvent');
        expect(sysZone.numEntities()).to.equal(1);
        updateSystems([sysZone]);
        expect(dungZone).not.to.have.component('ZoneEvent');
        expect(sysZone.numEntities()).to.equal(0);
    });
});
