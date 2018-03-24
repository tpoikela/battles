
import {expect} from 'chai';

const RG = require('../../client/src/battles');
const BSP = require('../../lib/bsp');
const DungeonBSP = require('../../lib/dungeon-bsp');

describe('BSP', () => {

    it('can generate a BSP tree', () => {
        const cols = 80;
        const rows = 50;
        const iter = 5;
        const mainContainer = new BSP.Container(0, 0, cols, rows);
        const containerTree = BSP.splitContainer(mainContainer, iter);

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
        const map = new RG.Map.CellList(cols, rows, RG.ELEM.WALL);

        dungeon.create((x, y, val) => {
            if (val === 0) {
                if (map.hasXY(x, y)) {
                    map.setBaseElemXY(x, y, RG.ELEM.FLOOR);
                }
                else {
                    console.log(`${x},${y} out of bounds`);
                }
            }
        });

        const level = new RG.Map.Level();
        level.setMap(map);
        level.debugPrintInASCII();
    });
});
