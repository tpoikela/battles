
import {expect} from 'chai';
import {Geometry} from '../../../client/src/geometry';
import {FactoryLevel} from '../../../client/src/factory.level';
import * as Element from '../../../client/src/element';
import * as Item from '../../../client/src/item';
import {SentientActor} from '../../../client/src/actor';
import {ObjectShell} from '../../../client/src/objectshellparser';
import {LevelUtils} from '../../../client/src/level-utils';
import {BBox} from '../../../client/src/bbox';

describe('Geometry', () => {

    let levels = null;
    let superLevel = null;
    let factLevel = null;

    beforeEach(() => {
        factLevel = new FactoryLevel();
        levels = [];
        for (let i = 0; i < 3; i++) {
            const level = factLevel.createLevel('arena', 10 + i, 10 + i);
            levels.push(level);
        }
        superLevel = factLevel.createLevel('empty', 40, 40);
    });

    it('can tile several levels into a super level', () => {
        const conf = {x: 2, y: 1, alignLeft: true};
        Geometry.tileLevels(superLevel, levels, conf);

        const cellType = superLevel.getMap().getBaseElemXY(2, 1).getType();
        expect(cellType).to.equal('wall');

        const x2 = 1 + 10;
        const y2 = 1 + 10 + 10;
        const cellType2 = superLevel.getMap().getBaseElemXY(x2, y2).getType();
        // superLevel.getMap().debugPrintInASCII();
        expect(cellType2).to.equal('wall');
    });

    it('can center the tiled levels.', () => {
        const conf = {x: 1, y: 1, centerX: true};
        Geometry.tileLevels(superLevel, levels, conf);
        // superLevel.getMap().debugPrintInASCII();
    });

    it('can generate "straight" paths for missiles', () => {
        const [x0, y0] = [0, 0];
        const [x1, y1] = [4, 4];
        let path = Geometry.getMissilePath(x0, y0, x1, y1);
        expect(path).to.have.length(5);

        path = Geometry.getMissilePath(x0, y0, x1, y1, false);
        expect(path).to.have.length(3);

        const [x, y] = [0, 0];
        const [xEnd, yEnd] = [2, 6];
        path = Geometry.getMissilePath(x, y, xEnd, yEnd);

        expect(path).to.have.length(7);

        const [xx, yy] = [1, 7];
        const [xxEnd, yyEnd] = [8, 3];
        path = Geometry.getMissilePath(xx, yy, xxEnd, yyEnd);
        expect(path).to.have.length(8 - 1 + 1);
    });

    it('can do a full merge for two levels', () => {
        const factLevel = new FactoryLevel();
        const l1 = factLevel.createLevel('empty', 40, 50);
        const l2 = factLevel.createLevel('arena', 20, 20);

        const actor2 = new SentientActor('rat');
        l2.addActor(actor2, 1, 2);

        const item2 = new Item.Weapon('sword');
        l2.addItem(item2, 4, 5);

        const stairs2 = new Element.ElementStairs('stairsDown', l2);
        l2.addStairs(stairs2, 7, 8);

        const mX = 2;
        const mY = 3;
        Geometry.mergeLevels(l1, l2, mX, mY);

        const wallElem = l1.getMap().getBaseElemXY(mX, mY);
        expect(wallElem.getType()).to.match(/wall/);

        const actor2Merged = l1.getActors()[0];
        expect(actor2Merged.getX()).to.equal(1 + mX);
        expect(actor2Merged.getY()).to.equal(2 + mY);

        const item2Merged = l1.getItems()[0];
        expect(item2Merged.getX()).to.equal(4 + mX);
        expect(item2Merged.getY()).to.equal(5 + mY);

        const stairsMerged = l1.getStairs()[0];
        expect(stairsMerged.getX()).to.equal(7 + mX);
        expect(stairsMerged.getY()).to.equal(8 + mY);
        expect(stairsMerged.getSrcLevel().getID()).to.equal(l1.getID());

        const map1 = l1.getMap();
        for (let x = 0; x < 40; x++) {
            for (let y = 0; y < 50; y++) {
                const cell = map1.getCell(x, y);
                expect(cell.getX()).to.equal(x);
                expect(cell.getY()).to.equal(y);
            }
        }
    });

    it('can merge a level with shopkeeper properly', () => {
        const subLevels = [];
        const cols = 100;
        const rows = 100;
        const mainRows = 3 * rows;
        const mainCols = 2 * cols;

        let nKeepers = 0;

        const parser = ObjectShell.getParser();
        for (let i = 0; i < 2; i++) {
            const levelConf = {nShops: i + 1, nGates: 2, nHouses: 20, parser};
            const town = factLevel.createLevel('townwithwall', cols, rows,
                levelConf);
            subLevels.push(town);
            nKeepers += i + 1;
        }

        const subLevelPos = [0.03, 0.07];
        const mainLevel = factLevel.createLevel('empty', mainCols, mainRows, {});

        // Calculate position and tile sub-levels into main level
        const y0 = subLevelPos[0] * 3 * cols;
        const tileConf = {x: 0, y: y0, centerX: true};
        Geometry.tileLevels(mainLevel, subLevels, tileConf);

        const mainMap = mainLevel.getMap();
        const keepers = mainMap.findObj(obj =>
            obj.getName && obj.getName().match(/keeper/));

        const actors = mainLevel.getActors();

        expect(actors.length, 'Actors has correct length')
            .to.be.at.least(nKeepers);
        expect(keepers, 'Correct num of keepers with findObj')
            .to.have.length(nKeepers);

    });

    it('can floodfill a level map', () => {
        let level = factLevel.createLevel('empty', 10, 10);
        let map = level.getMap();
        let cell = map.getCell(5, 5);
        const floorCells = Geometry.floodfill(map, cell, 'floor');
        expect(floorCells).to.have.length(10 * 10);

        level = factLevel.createLevel('arena', 10, 10);
        map = level.getMap();
        cell = map.getCell(0, 0);
        let cells = Geometry.floodfill(map, cell, 'wall');
        const numWalls = 10 + 8 + 10 + 8;
        expect(cells).to.have.length(numWalls);

        cell = map.getCell(1, 1);
        cells = Geometry.floodfill(map, cell, 'floor');
        expect(cells).to.have.length(100 - numWalls);

        const dungeon = factLevel.createLevel('digger', 100, 50);
        const dungMap = dungeon.getMap();
        const dungFloorCells = dungMap.getCells(
            c => c.getBaseElem().getType() === 'floor');

        const startCell = dungFloorCells[0];
        const floorFill = Geometry.floodfill(dungMap, startCell, 'floor');
        // dungeon.debugPrintInASCII();

        expect(floorFill.length).to.equal(dungFloorCells.length);

    });

    it('can wrap multiple levels as one', () => {
        const levels = [
            factLevel.createLevel('empty', 10, 20),
            factLevel.createLevel('empty', 20, 30),
            factLevel.createLevel('empty', 30, 20)
        ];

        const conf: any = {centerY: true};
        const superLevel = LevelUtils.wrapAsLevel(levels, conf);
        expect(superLevel).to.not.be.empty;
        expect(superLevel.getMap().cols).to.equal(60);
        expect(superLevel.getMap().rows).to.equal(30);

        conf.centerX = true;
        conf.centerY = false;
        const superLevel2 = LevelUtils.wrapAsLevel(levels, conf);
        expect(superLevel2.getMap().cols).to.equal(30);
        expect(superLevel2.getMap().rows).to.equal(70);
    });

    it('has function to iterate 3D lines', () => {
        let res = [];
        const cb = (x, y, z) => {res.push([x, y, z]);}
        const c0 = [0, 0, 0];
        const c1 = [3, 3, 3];
        res = Geometry.lineFuncUnique3D(c0, c1, cb);
        expect(res).to.have.length(4);

    });

    it('has bresenham3D to create 3D lines', () => {
        const res = [];
        const cb = (x, y, z) => {res.push([x, y, z]);}
        const c0 = [0, 0, 0];
        const c1 = [3, 3, 0];
        const coord0 = Geometry.getBresenham3D(c0, c1);
        const coord1 = Geometry.getBresenham3D(c1, c0);

        expect(coord0).to.have.length(4);
        expect(coord1).to.have.length(4);
        expect(coord0[3]).to.deep.equal([3, 3, 0]);
        expect(coord1[3]).to.deep.equal([0, 0, 0]);

        const c2 = [1, 1, 0];
        const c3 = [1, 4, 0];
        const coord3 = Geometry.getBresenham3D(c2, c3);
        expect(coord3).to.have.length(4);

    });

    it('can combine adjacent bboxes', function() {
        const bbox1 = new BBox(0, 1, 3, 4);
        const bbox2 = new BBox(3, 1, 6, 4);
        const boxes = [bbox1, bbox2];
        const combBoxes = Geometry.combineAdjacent(boxes);
        expect(combBoxes.length).to.equal(1);
        const bbox3 = combBoxes[0];
        expect([bbox3.ulx, bbox3.uly]).to.deep.equal([0, 1]);
        expect([bbox3.lrx, bbox3.lry]).to.deep.equal([6, 4]);

        // Check that box with non-matching side is not merged
        const bbox5 = new BBox(5, 5, 7, 7);
        const boxList = boxes.concat(bbox5);
        const combBoxes2 = Geometry.combineAdjacent(boxList);
        expect(combBoxes2.length).to.equal(2);

        // Check that 3 boxes are correctly merged
        const bbox6 = new BBox(0, 4, 6, 8);
        const bList = [bbox1, bbox6, bbox2];
        const combBoxes3 = Geometry.combineAdjacent(bList);
        expect(combBoxes3.length).to.equal(1);

        const triBox = combBoxes3[0];
        expect([triBox.ulx, triBox.uly]).to.deep.equal([0, 1]);
        expect([triBox.lrx, triBox.lry]).to.deep.equal([6, 8]);

    });

});
