
/* Unit tests for checking tile-based levels. */
import { expect } from 'chai';
import RG from '../../../client/src/rg';
import {TemplateLevel} from '../../../client/src/template.level';
// import {HousesDiag} from '../../../client/data/tiles.diag';
import {Tiles3x3} from '../../../client/data/tiles3x3';
import {Basic5x5} from '../../../client/data/tiles.basic';

describe('HousesDiag', () => {
    /*
    it('generates diagonal-like structures', () => {
        const level = new TemplateLevel(12, 8);
        level.setFiller(HousesDiag.tiles.filler);
        // level.setGenParams({x: [2, 2], y: [2, 2]});
        level.setGenParams({x: [1, 1], y: [1, 1]});
        level.setTemplates(HousesDiag.templates.all);
        level.roomCount = -1;
        level.create();
        RG.printMap(level.getMap());
    });
    */

    it('generates diagonal-like structures', () => {
        for (let i = 0; i < 10; i++) {
            const level = new TemplateLevel(24, 16);
            level.setFiller(Tiles3x3.tiles.filler);
            if (i % 2 === 0) {
                level.setGenParams({x: [2, 2], y: [2, 2]});
            }
            else {
                level.setGenParams({x: [3, 1], y: [3, 1]});
            }
            // level.setGenParams({x: [3], y: [3]});
            level.setTemplates(Tiles3x3.templates.all);
            // level.setTemplates(Tiles3x3.templates.vault);
            level.roomCount = -1;
            level.create();
            console.log('\n=== Created level: ====\n');
            RG.printMap(level.getMap());
        }
    });

    it('generates dungeons with 5x5 tiles', () => {
            const level = new TemplateLevel(24, 16);
            level.tryToMatchAllExits = true;
            level.setFiller(Basic5x5.tiles.filler);
            level.setGenParams({x: [1, 3, 1], y: [2, 2]});
            // level.setGenParams({x: [3], y: [3]});
            level.setTemplates(Basic5x5.templates);
            // level.setTemplates(Tiles3x3.templates.vault);
            level.roomCount = -1;
            level.setExitMap(Basic5x5.remap.exits, Basic5x5.remap.nsew2Dir);
            level.create();
            console.log('\n=== Created level: ====\n');
            RG.printMap(level.getMap());
    });
});
