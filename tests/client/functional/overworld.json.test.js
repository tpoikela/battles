
const expect = require('chai').expect;
const RG = require('../../../client/src/battles');
const ROT = require('../../../lib/rot.js');

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

        const battles = area.getZones('BattleZone');
        expect(battles.length).to.be.above(0);

        const json = game.toJSON();

        game = null;
        const fromJSON = new RG.Game.FromJSON();
        const newGame = fromJSON.createGame(json);
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

        const {x, y} = newCapitalConf;
        console.log(`Moving player ot tile ${x},${y}`);
        newGame.movePlayer(x, y);

        const newWorld = newGame.getCurrentWorld();
        const newArea = newWorld.getAreas()[0];

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
