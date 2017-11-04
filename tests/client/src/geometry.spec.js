
const expect = require('chai').expect;
const RG = require('../../../client/src/battles');
RG.Geometry = require('../../../client/src/geometry');

describe('RG.Geometry', () => {

    let levels = null;
    let superLevel = null;

    beforeEach(() => {
        levels = [];
        for (let i = 0; i < 3; i++) {
            const level = RG.FACT.createLevel('arena', 10 + i, 10 + i);
            levels.push(level);
        }
        superLevel = RG.FACT.createLevel('empty', 40, 40);
    });

    it('can tile several levels into a super level', () => {
        const conf = {x: 2, y: 1, alignLeft: true};
        RG.Geometry.tileLevels(superLevel, levels, conf);

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
        RG.Geometry.tileLevels(superLevel, levels, conf);
        // superLevel.getMap().debugPrintInASCII();
    });

    it('can generate "straight" paths for missiles', () => {
        const [x0, y0] = [0, 0];
        const [x1, y1] = [4, 4];
        let path = RG.Geometry.getMissilePath(x0, y0, x1, y1);
        expect(path).to.have.length(5);

        path = RG.Geometry.getMissilePath(x0, y0, x1, y1, false);
        expect(path).to.have.length(3);

        const [x, y] = [0, 0];
        const [xEnd, yEnd] = [2, 6];
        path = RG.Geometry.getMissilePath(x, y, xEnd, yEnd);

        expect(path).to.have.length(7);

        const [xx, yy] = [1, 7];
        const [xxEnd, yyEnd] = [8, 3];
        path = RG.Geometry.getMissilePath(xx, yy, xxEnd, yyEnd);
        expect(path).to.have.length(8 - 1 + 1);
    });

    it('can do a full merge for two levels', () => {
        const l1 = RG.FACT.createLevel('empty', 40, 50);
        const l2 = RG.FACT.createLevel('arena', 20, 20);

        const actor2 = new RG.Actor.Rogue('rat');
        l2.addActor(actor2, 1, 2);

        const item2 = new RG.Item.Weapon('sword');
        l2.addItem(item2, 4, 5);

        const stairs2 = new RG.Element.Stairs(true, l2);
        l2.addStairs(stairs2, 7, 8);

        const mX = 2;
        const mY = 3;
        RG.Geometry.mergeLevels(l1, l2, mX, mY);

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

        const parser = RG.ObjectShell.getParser();
        for (let i = 0; i < 2; i++) {
            const levelConf = {nShops: i + 1, nGates: 2, nHouses: 20, parser};
            const town = RG.FACT.createLevel('townwithwall', cols, rows,
                levelConf);
            subLevels.push(town);
            nKeepers += i + 1;
        }

        const subLevelPos = [0.03, 0.07];
        const mainLevel = RG.FACT.createLevel('empty', mainCols, mainRows, {});

        // Calculate position and tile sub-levels into main level
        const y0 = subLevelPos[0] * 3 * cols;
        const tileConf = {x: 0, y: y0, centerX: true};
        RG.Geometry.tileLevels(mainLevel, subLevels, tileConf);

        const mainMap = mainLevel.getMap();
        const keepers = mainMap.findObj(obj =>
            obj.getName && obj.getName().match(/keeper/));

        const actors = mainLevel.getActors();

        expect(actors, 'Actors has correct length').to.have.length(nKeepers);
        expect(keepers, 'Correct num of keepers with findObj')
            .to.have.length(nKeepers);

    });


});
