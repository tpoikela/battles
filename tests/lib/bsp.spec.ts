
import {expect} from 'chai';

import RG from '../../client/src/rg';
import {BSP} from '../../lib/bsp';
import {DungeonBSP} from '../../lib/dungeon-bsp';
import {CellMap} from '../../client/src/map';
import {Level} from '../../client/src/level';
import * as Element from '../../client/src/element';

describe('BSP', () => {

    it('can generate a BSP tree', () => {
        const cols = 80;
        const rows = 50;
        const iter = 5;
        const bspGen = new BSP.BSPGen();
        const mainContainer = new BSP.Container(0, 0, cols, rows);
        const containerTree = bspGen.splitContainer(mainContainer, iter);

        const leafs = containerTree.getLeafs();
        leafs.forEach(leaf => {
            console.log(JSON.stringify(leaf));
        });

    });
});

describe('DungeonBSP', () => {
    it('can generate a connected dungeon using BSP', () => {
        const cols = 80;
        const rows = 50;

        const opts = {iter: 6};
        const dungeon = new DungeonBSP(cols, rows, opts);
        const map = new CellMap(cols, rows, new Element.ElementWall('wall'));

        dungeon.create((x, y, val) => {
            if (val === 0) {
                if (map.hasXY(x, y)) {
                    map.setBaseElemXY(x, y, new Element.ElementBase('floor'));
                }
                else {
                    console.log(`${x},${y} out of bounds`);
                }
            }
            else if (val === 2) {
                map.setBaseElemXY(x, y, new Element.ElementWall('stone'));
            }
        });

        const level = new Level();
        level.setMap(map);
        level.debugPrintInASCII();
    });
});
