
import {OWBiomes} from '../../../client/src/overworld.biomes';
import {RGTest} from '../../roguetest';


describe('OWBiomes', () => {

    // TODO checks missing
    it('generates biomes based on noise', () => {
        const level = RGTest.createLevel('arena', 200, 90);
        OWBiomes.addBiomes({} as any, level);
        const levelMap = level.getMap();
        /*
        levelMap.forEachCell((x, y, c) => {
        });
        */
    });

});

