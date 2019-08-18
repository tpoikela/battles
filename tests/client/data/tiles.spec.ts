
/* Unit tests for checking tile-based levels. */
import { expect } from 'chai';
import RG from '../../../client/src/rg';
import {TemplateLevel} from '../../../client/src/template.level';
// import {HousesDiag} from '../../../client/data/tiles.diag';
import {Tiles3x3} from '../../../client/data/tiles3x3';
import {Basic5x5} from '../../../client/data/tiles.basic';
import {Basic7x7} from '../../../client/data/tiles.7x7';
import {Nests} from '../../../client/data/tiles.nests';

describe('TemplateLevel level generation', () => {
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
            // console.log('\n=== Created level: ====\n');
            // RG.printMap(level.getMap());
        }
    });

    it('generates dungeons with 5x5 tiles', () => {
        const level = new TemplateLevel(23, 11);
        level.tryToMatchAllExits = true;
        level.setFiller(Basic5x5.tiles.filler);
        level.setGenParams({x: [1, 1, 1], y: [1, 1, 1]});
        // level.setGenParams({x: [3], y: [3]});
        level.setTemplates(Basic5x5.templates);
        // level.setTemplates(Tiles3x3.templates.vault);
        level.roomCount = -1;
        // level.customMatchFilter = customMatchFilter;
        level.setExitMap(Basic5x5.remap.exits, Basic5x5.remap.nsew2Dir);
        level.weights = {room_end: 10, room_term1: 10};
        level.create();
        // console.log('\n=== Created level: ====\n');
        // RG.printMap(level.getMap());
    });

    it('generates dungeons with 7x7 tiles', () => {
        const level = new TemplateLevel(23, 11);
        level.tryToMatchAllExits = true;
        level.setFiller(Basic7x7.tiles.filler);
        level.setGenParams({x: [1, 2, 1], y: [1, 2, 1]});
        level.setTemplates(Basic7x7.templates);
        // level.setTemplates(Tiles3x3.templates.vault);
        // level.weights = {room_hall: 15, room: 7, room_small: 7};
        level.weights = {};
        Basic7x7.names.diag.forEach(name => {
            level.weights[name] = 10;
        });
        level.roomCount = -1;
        level.customMatchFilter = filterCells;
        // level.setExitMap(Basic5x5.remap.exits, Basic5x5.remap.nsew2Dir);
        level.create();
        console.log('\n=== Created level: ====\n');
        // RG.printMap(level.getMap());
    });

    it('generates nest-like structures', () => {
        for (let i = 0; i < 10; i++) {
            const level = new TemplateLevel(3 + i % 3, 2 + i % 3);
            level.tryToMatchAllExits = true;
            level.setFiller(Nests.tiles.filler);
            level.setGenParams({x: [1, 1, 1], y: [1, 1, 1]});

            level.setTemplates(Nests.templates);
            level.customMatchFilter = Nests.matchFilter;
            level.roomCount = -1;
            level.create();
            console.log('\n=== Created level: ====\n');
            RG.printMap(level.getMap());
        }

    });

});

function customMatchFilter(tl: TemplateLevel, x: number, y: number, list, prev) {
    if (x === Math.ceil(tl.tilesX / 2) || y === Math.round(tl.tilesY/2)) {
        console.log('Matching custom filter x,y', x, y);
        const res = list.filter(t => /hall/.test(t.getProp('name')));
        console.log('Matching custom filter, len was:', res.length);
        if (res.length > 0) {
            return res;
        }
        console.log('\t==> REJECTED custom match with 0 len');
    }
    else if (tl.isEdge(x, y)) {
        console.log('Matching custom filter x,y', x, y);
        const res = list.filter(t => /^(corridor|corner)$/.test(t.getProp('name')));
        if (res.length > 0) {
            return res;
        }
        console.log('\t==> REJECTED custom match with 0 len');
    }
    return list;
}

function filterCells(tl: TemplateLevel, x: number, y: number, list, prev) {
    if (tl.isEdge(x, y)) {
        const res = list.filter(t => /small_room/.test(t.getProp('name')));
        if (res.length > 0) {return res;}
    }
    return list;
}
