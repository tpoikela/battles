
import { expect } from 'chai';

const RG = require('../../../client/src/battles');
const Territory = require('../../../client/src/territory');
const OW = require('../../../client/src/overworld.map');

describe('Territory', () => {
    it('creates 2d map of different regions', () => {
        const cols = 50;
        const rows = 50;
        const terrMap = new Territory(cols, rows);
        terrMap.addRival({name: 'wolfclan', char: 'w'});
        terrMap.addRival({name: 'catfolk', char: 'c'});
        terrMap.generate();

        const map = terrMap.getMap();
        expect(map[0][0]).to.match(/(c|w)/);
        expect(map[25][25]).to.match(/(c|w)/);

        // console.log(terrMap.mapToString());
    });

    it('has option to specify start area size and number of turns', () => {
        const terrMap = new Territory(10, 10);
        terrMap.addRival({name: 'wolfclan', char: 'w', startSize: 3});
        terrMap.addRival({name: 'catfolk', char: 'c'});
        terrMap.generate(2);

        const catData = terrMap.getData('catfolk');
        expect(catData.numOccupied).to.equal(1);

        const wolfData = terrMap.getData('wolfclan');
        expect(wolfData.numOccupied).to.be.above(2);

        // console.log(terrMap.mapToString());
    });


    it('has option to specify ratio of filled cells to all cells', () => {
        const terrMap = new Territory(10, 10, {maxFillRatio: 0.5});
        terrMap.addRival({name: 'wolfclan', char: 'w'});
        terrMap.addRival({name: 'catfolk', char: 'c'});
        terrMap.generate();

        const catData = terrMap.getData('catfolk');
        expect(catData.numOccupied).to.be.below(50);

        const wolfData = terrMap.getData('wolfclan');
        expect(wolfData.numOccupied).to.be.below(50);

        console.log(terrMap.mapToString());
    });

    it('it accepts a pre-occupied map', () => {
        const ow = OW.createOverWorld();
        const owMap = ow.getOWMap();
        const terrMap = new Territory(ow.getSizeX(), ow.getSizeY());

        // console.log(ow.mapToString());
        terrMap.useMap(owMap, {
            [OW.TERM]: true,
            [OW.MOUNTAIN]: true,
            [OW.BVILLAGE]: true,
            [OW.WVILLAGE]: true
        });

        terrMap.addRival({name: 'wolfclan', char: 'w'});
        terrMap.addRival({name: 'catfolk', char: 'c'});
        terrMap.addRival({name: 'goblin', char: 'g'});

        terrMap.generate();
        // console.log(terrMap.mapToString());
        // const map = terrMap.getMap();
    });

    it('supports starting position for contestants', () => {
        const terrMap = new Territory(20, 20);
        const goblins = {name: 'goblin', char: 'g', startX: 0, startY: 0};
        const elves = {name: 'elves', char: '@', startX: 19, startY: 19};
        terrMap.addRival(goblins);
        terrMap.addRival(elves);
        terrMap.generate();

        const map = terrMap.getMap();
        expect(map[0][0]).to.equal('g');
        expect(map[19][19]).to.equal('@');

        // console.log(terrMap.mapToString());
    });

    it('works for large maps as well', () => {
        const rng = new RG.Random();
        rng.setSeed(new Date().getTime());
        const owTilesX = 160;
        const owTilesY = 80;
        const ow = OW.createOverWorld({owTilesX, owTilesY});

        const capXY = ow.getFeaturesByType(OW.WCAPITAL)[0];
        const dwarves = ow.getFeaturesByType(OW.WTOWER)[0];
        const btower = ow.getFeaturesByType(OW.BTOWER)[0];
        // const bcapital = ow.getFeaturesByType(OW.BCAPITAL)[0];
        RG.diag('', '', 'Test');

        const owMap = ow.getOWMap();
        const terrConf = {startSize: 2, maxNumPos: 2, maxFillRatio: 0.6};
        const terrMap = new Territory(ow.getSizeX(), ow.getSizeY(), terrConf);
        terrMap.setRNG(rng);

        // console.log(ow.mapToString());
        terrMap.useMap(owMap, {
            [OW.TERM]: true,
            [OW.MOUNTAIN]: true,
            [OW.BVILLAGE]: true,
            [OW.WVILLAGE]: true,
            [OW.WCAPITAL]: true,
            [OW.BCAPITAL]: true,
            [OW.WTOWER]: true,
            [OW.BTOWER]: true
        });

        const bears = {name: 'bearfolk',
            char: 'B', numPos: 2};
        const undeads = {name: 'undead', char: 'u', numPos: 3,
            startX: [80], startY: [75]};

        terrMap.addRival({name: 'avian', char: 'A'});
        terrMap.addRival(undeads);
        terrMap.addRival({name: 'wildling', char: 'I'});
        terrMap.addRival(bears);
        terrMap.addRival({name: 'wolfclan', char: 'w'});
        terrMap.addRival({name: 'catfolk', char: 'c'});
        terrMap.addRival({name: 'dogfolk', char: 'd'});
        terrMap.addRival({name: 'human', char: '@'});
        terrMap.addRival({name: 'goblin', char: 'g', numPos: 8});
        terrMap.addRival({name: 'dwarves', char: 'D',
            startX: dwarves[0], startY: dwarves[1]});
        terrMap.addRival({name: 'hyrkhians', char: 'y',
            startX: capXY[0], startY: capXY[1]});
        terrMap.addRival({name: 'winterbeings', char: 'W',
            startX: btower[0], startY: btower[1], numPos: 1});

        const coordMap = new RG.Overworld.CoordMap();
        coordMap.xMap = 10;
        coordMap.yMap = 10;

        const playerX = 8;
        const playerY = 7;

        const bbox = coordMap.getOWTileBboxFromAreaTileXY(playerX, playerY);

        const pData = terrMap.getData('human');
        pData.maxNumPos += 1;
        pData.startX.push(rng.getUniformInt(bbox.ulx, bbox.lrx));
        pData.startY.push(rng.getUniformInt(bbox.uly, bbox.lry));
        terrMap.generate();

        console.log(ow.mapToString());
        console.log(terrMap.mapToString());

        const undeadData = terrMap.getData('undead');
        expect(undeadData.startX).to.have.length(3);
        expect(undeadData.startY).to.have.length(3);
    });

    it('has functions for serialisation/de-serialisation', () => {
        const terrMap = new Territory(10, 10);
        terrMap.addRival({name: 'wolfclan', char: 'w', startSize: 3});
        terrMap.addRival({name: 'catfolk', char: 'c'});

        terrMap.generate();

        const oldData = terrMap.getData();

        const json = terrMap.toJSON();
        const clonedTerrMap = Territory.fromJSON(json);
        const newData = clonedTerrMap.getData();

        expect(newData).to.deep.equal(oldData);
        expect(clonedTerrMap.getMap()).to.deep.equal(terrMap.getMap());
    });
});
