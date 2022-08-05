
import { expect } from 'chai';
import {NestGenerator} from '../../../client/src/generator';
import {Level} from '../../../client/src/level';
import {Placer} from '../../../client/src/placer';


describe('NestGenerator', function() {

    it('can create nest-like levels with specific actors', () => {
        const nestGen = new NestGenerator();
        const nestConf = {
            mapConf: {
                wallType: 'wallcave', floorType: 'floorcave',
                genParams: {x: [1, 1, 1], y: [1, 1, 1]},
                tilesX: 4, tilesY: 4,
            }
        };
        const level = nestGen.create(36, 36, nestConf);
        // level.debugPrintInASCII();
        const elems = level.getElements();

        // Check that floor under ? elements matches the mapConf.floorType
        elems.forEach(elem => {
            const cell = elem.getCell();
            const baseElem = cell.getBaseElem();
            expect(baseElem.getType()).to.equal(nestConf.mapConf.floorType);
        });

    });

});
