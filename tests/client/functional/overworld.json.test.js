
const expect = require('chai').expect;
const RG = require('../../../client/src/battles');
const ROT = require('../../../lib/rot.js');

const fs = require('fs');

describe('How Game is created from Overworld', function() {

    this.timeout(5 * 3600 * 1000); // 5 hours

    let game = null;

    beforeEach(() => {
        ROT.RNG.setSeed(1234);
        RG.RAND = new RG.Random();
        RG.RAND.setSeed(5678);
        const conf = {
            playMode: 'OverWorld',
            playerLevel: 'Medium',
            sqrPerItem: 100,
            sqrPerActor: 100,
            xMult: 0.5,
            yMult: 0.5,
            playerClass: 'Blademaster',
            playerRace: 'human'
        };
        const gameFact = new RG.Factory.Game();
        game = gameFact.createNewGame(conf);
    });

    afterEach(() => {
        game = null;
    });

    it('can restore zones properly after moving around', () => {
        const cm = game.getChunkManager();
        cm.debugPrint();

        game.movePlayer(0, 0);
        game.movePlayer(2, 3);

        const json = game.toJSON();
        game = null;
        const fromJSON = new RG.Game.FromJSON();
        const newGame = fromJSON.createGame(json);

        const area = newGame.getArea(0);
        const t43 = area.getTileXY(2, 3);
        expect(t43.getZones('BattleZone').length).to.equal(1);

        newGame.movePlayer(0, 0);
        newGame.movePlayer(2, 3);
    });

    it('is created using factory from game/player objects', () => {
        const zoneTypes = ['City', 'Mountain', 'Dungeon', 'BattleZone'];
        expect(game).to.exist;

        game.movePlayer(0, 0);
        game.movePlayer(0, 1);

        const area = game.getCurrentWorld().getAreas()[0];
        const nZones = {};
        zoneTypes.forEach(type => {
            nZones[type] = area.getZones(type).length;
        });

        const worldConf = game.getCurrentWorld().getConf();

        const battleZones = area.getZones('BattleZone');
        expect(battleZones.length).to.be.above(0);
        console.log('## battleZones: ' + JSON.stringify(battleZones));

        const json = game.toJSON();

        game = null;
        let fromJSON = new RG.Game.FromJSON();
        let newGame = fromJSON.createGame(json);
        const newWorldConf = newGame.getCurrentWorld().getConf();

        const areaConf = worldConf.area[0];
        const newAreaConf = newWorldConf.area[0];

        verifyConf(areaConf, newAreaConf);

        const cityConf = areaConf.city;
        const newCityConf = newAreaConf.city;

        expect(newCityConf.length).to.equal(cityConf.length);

        const capitalConf = cityConf.find(c => c.name === 'Blashyrkh');
        const newCapitalConf = newCityConf.find(c => (
            (/Blashyrkh/).test(c.name)
        ));
        expect(newCapitalConf).to.deep.equal(capitalConf);

        let {x, y} = newCapitalConf;
        console.log(`Moving player ot tile ${x},${y}`);
        newGame.movePlayer(x, y);

        const newWorld = newGame.getCurrentWorld();
        const newArea = newWorld.getAreas()[0];

        const newBzs = newArea.getZones('BattleZone');
        expect(newBzs.length).to.be.above(0);
        console.log('## newBzs: ' + JSON.stringify(newBzs));

        const tileCap = newArea.getTileXY(x, y);
        const cities = tileCap.getZones('City');
        expect(cities.length).to.be.at.least(1);

        const nZonesNew = {};
        zoneTypes.forEach(type => {
            nZonesNew[type] = newArea.getZones(type).length;
        });
        const newAreaConfObj = newArea.getConf();
        verifyConf(areaConf, newAreaConfObj);

        /*
        Object.keys(nZonesNew).forEach(key => {
            expect(nZonesNew[key], `Zone ${key}`).to.equal(nZones[key]);
        });*/

        const newJson = newGame.toJSON();
        fromJSON = new RG.Game.FromJSON();
        newGame = fromJSON.createGame(newJson);

        while (--x >= 0) {
            console.log(`Move player to tile ${x},${y}`);
            newGame.movePlayer(x, y);
        }
        while (++x < 4) {
            console.log(`Move player to tile ${x},${y}`);
            newGame.movePlayer(x, y);
        }
        y = 2;
    });

});

function verifyConf(areaConf, newAreaConf) {
    for (const prop in areaConf) {
        if (Array.isArray(areaConf[prop])) {
            const msg = `${prop} must have same length`;
            expect(newAreaConf[prop]).to.be.an.array;

            const len = areaConf[prop].length;
            const newLen = newAreaConf[prop].length;
            expect(newLen, msg).to.equal(len);
        }
    }
}
