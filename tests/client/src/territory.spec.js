
import { expect } from 'chai';

const RG = require('../../../client/src/battles');
const Territory = require('../../../client/src/territory');
const OW = require('../../../client/src/overworld.map');

describe('Territory', () => {
    it('creates 2d map of different regions', () => {
        const cols = 50;
        const rows = 50;
        const terrMap = new Territory(cols, rows);
        terrMap.addContestant({name: 'wolfclan', char: 'w'});
        terrMap.addContestant({name: 'catfolk', char: 'c'});
        terrMap.generate();

        const map = terrMap.getMap();
        expect(map[0][0]).to.match(/(c|w)/);
        expect(map[25][25]).to.match(/(c|w)/);

        // console.log(terrMap.mapToString());
    });

    it('it accepts a pre-occupied map', () => {
        const ow = OW.createOverWorld();
        const owMap = ow.getOWMap();
        const terrMap = new Territory(ow.getSizeX(), ow.getSizeY());

        // console.log(ow.mapToString());
        terrMap.setAsEmpty(owMap, {
            [OW.TERM]: true,
            [OW.MOUNTAIN]: true,
            [OW.BVILLAGE]: true,
            [OW.WVILLAGE]: true
        });

        terrMap.addContestant({name: 'wolfclan', char: 'w'});
        terrMap.addContestant({name: 'catfolk', char: 'c'});
        terrMap.addContestant({name: 'goblin', char: 'g'});

        terrMap.generate();
        // console.log(terrMap.mapToString());
        // const map = terrMap.getMap();
    });

    it('supports starting position for contestants', () => {
        const terrMap = new Territory(20, 20);
        const goblins = {name: 'goblin', char: 'g', startX: 0, startY: 0};
        const elves = {name: 'elves', char: '@', startX: 19, startY: 19};
        terrMap.addContestant(goblins);
        terrMap.addContestant(elves);
        terrMap.generate();

        const map = terrMap.getMap();
        expect(map[0][0]).to.equal('g');
        expect(map[19][19]).to.equal('@');

        // console.log(terrMap.mapToString());
    });


    it('works for large maps as well', () => {
        const ow = OW.createOverWorld({owTilesX: 80, owTilesY: 40});

        const capXY = ow.getFeaturesByType(OW.WCAPITAL)[0];
        console.log(capXY);
        const dwarves = ow.getFeaturesByType(OW.WTOWER)[0];
        console.log(dwarves);
        const btower = ow.getFeaturesByType(OW.BTOWER)[0];
        console.log(btower);
        const bcapital = ow.getFeaturesByType(OW.BCAPITAL)[0];
        console.log(bcapital);
        RG.diag('', '', 'Test');

        const owMap = ow.getOWMap();
        const terrMap = new Territory(ow.getSizeX(), ow.getSizeY());

        // console.log(ow.mapToString());
        terrMap.setAsEmpty(owMap, {
            [OW.TERM]: true,
            [OW.MOUNTAIN]: true,
            [OW.BVILLAGE]: true,
            [OW.WVILLAGE]: true,
            [OW.WCAPITAL]: true,
            [OW.BCAPITAL]: true,
            [OW.WTOWER]: true,
            [OW.BTOWER]: true
        });

        terrMap.addContestant({name: 'undead', char: 'u'});
        terrMap.addContestant({name: 'wildling', char: 'I'});
        terrMap.addContestant({name: 'bearfolk', char: 'B'});
        terrMap.addContestant({name: 'wolfclan', char: 'w'});
        terrMap.addContestant({name: 'catfolk', char: 'c'});
        terrMap.addContestant({name: 'dogfolk', char: 'd'});
        terrMap.addContestant({name: 'humans', char: '@'});
        terrMap.addContestant({name: 'goblin', char: 'g'});
        terrMap.addContestant({name: 'dwarves', char: 'D',
            startX: dwarves[0], startY: dwarves[1]});
        terrMap.addContestant({name: 'hyrkhians', char: 'y',
            startX: capXY[0], startY: capXY[1]});
        terrMap.addContestant({name: 'winterbeings', char: 'W',
            startX: btower[0], startY: btower[1]});

        terrMap.generate();

        console.log(ow.mapToString());
        console.log(terrMap.mapToString());

    });
});
