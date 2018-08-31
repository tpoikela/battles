
import { expect } from 'chai';

const RG = require('../../../client/src/battles');
const FactoryGame = require('../../../client/src/factory.game');
const OW = require('../../../client/src/overworld.map');

describe('Factory.Game', () => {
    it('can generate worldConf based on territory map', () => {
        const gameFact = new FactoryGame();

        const pRace = 'goblin';
        const [playerX, playerY] = [0, 0];
        const owConf = FactoryGame.getOwConf(1.0);
        const overworld = OW.createOverWorld(owConf);
        overworld.terrMap = gameFact.createTerritoryMap(overworld, pRace,
            playerX, playerY);

        const worldAndConf = RG.OverWorld.createOverWorldLevel(
          overworld, owConf);
        const [worldLevel, worldConf] = worldAndConf;
        expect(worldLevel).to.not.be.empty;

        gameFact.mapZonesToTerritoryMap(overworld.terrMap, worldConf);

        const citiesConf = worldConf.area[0].city;

        const coordMap = new RG.OverWorld.CoordMap();
        coordMap.setXYMap(10, 10);

        const terrMap = overworld.terrMap;
        const terrMapXY = terrMap.getMap();
        // const owMap = overworld.getMap();

        citiesConf.forEach(cityConf => {
            const {owX, owY} = cityConf;
            expect(owX).to.be.at.least(0);
            expect(owY).to.be.at.least(0);

            const char = terrMapXY[owX][owY];
            if (char !== '.' && char !== '#') {
                const {constraint} = cityConf;
                const {actor} = constraint;
                const name = terrMap.getName(char);
                expect(actor.value).to.contains(name);
            }
            else {
                console.log('MIXED CITY!!');
                console.log(cityConf);
            }
        });

        console.log(overworld.mapToString());
        console.log(terrMap.mapToString());

    });
});
