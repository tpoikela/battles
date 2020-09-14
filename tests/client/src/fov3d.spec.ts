
import {expect} from 'chai';

// import RG from '../../../client/src/rg';
// import {Fov3D} from '../../../client/src/fov3d';
import {SentientActor} from '../../../client/src/actor';
import {FactoryLevel} from '../../../client/src/factory.level';
// import {Random} from '../../../client/src/random';
// import {ELEM} from '../../../client/data/elem-constants';

describe('Fov3D', function() {
    // this.timeout(5000);

    it('it computes 3D FOV', () => {
        const factLevel = new FactoryLevel();
        const level = factLevel.createLevel('arena', 10, 10);
        const map = level.getMap();
        const actor = new SentientActor('actor');
        level.addActor(actor, 5, 5);
        actor.setFOVRange(1);

        let cells = map.getCellsInFOV(actor);
        console.log('Seen cells are:', cells.map(c => c.getXY()));
        expect(cells).to.have.length(9);

        // return;

        const cells2 = map.getCellsInFOV(actor);
        // console.log('Seen cells2 are:', cells2.map(c => c.getXY()));
        expect(cells2).to.have.length(cells.length);

        level.moveActorTo(actor, 1, 1);
        cells = map.getCellsInFOV(actor);
        // console.log('Seen cells are:', cells.map(c => c.getXY()));
        expect(cells).to.have.length(9);

        actor.setFOVRange(2);
        level.moveActorTo(actor, 2, 2);
        cells = map.getCellsInFOV(actor);
        // console.log('Seen cells are:', cells.map(c => c.getXY()));
        expect(cells).to.have.length(25);

        actor.setFOVRange(3);
        level.moveActorTo(actor, 3, 3);
        cells = map.getCellsInFOV(actor);
        cells = cells.sort((a, b) => a.getX() < b.getX() ? -1 : 1);
        console.log('Seen cells are:', cells.map(c => c.getXY()));
        expect(cells).to.have.length(45);

        actor.setFOVRange(4);
        level.moveActorTo(actor, 4, 4);
        cells = map.getCellsInFOV(actor);
        expect(cells).to.have.length(69);

    });



});
