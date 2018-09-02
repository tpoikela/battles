
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
                expect(actor).to.not.be.empty;

                const name = terrMap.getName(char);
                if (Array.isArray(actor)) {
                    const cc0 = actor[0];
                    expect(cc0.value).to.contains(name);
                    // expect(actor).to.have.deep.property('[0].value', name);
                }
                else if (Array.isArray(actor.value)) {
                    if (name !== 'winterbeing') {
                        expect(actor.value).to.contains(name);
                    }
                    else {
                        expect(actor.value).to.contains('WinterBeingBase');
                    }
                }
                else {
                    expect(actor.value).to.equal(name);
                }
            }
        });

        // console.log(overworld.mapToString());
        // console.log(terrMap.mapToString());

    });
});
