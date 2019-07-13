
import { expect } from 'chai';

import {FactoryGame} from '../../../client/src/factory.game';
import {OWMap} from '../../../client/src/overworld.map';
import { OverWorld, CoordMap } from '../../../client/src/overworld';
import {IFactoryGameConf, OWMapConf} from '../../../client/src/interfaces';

describe('Factory.Game', function() {
    this.timeout(8000);

    it('can generate worldConf based on territory map', () => {
        const gameFact = new FactoryGame();

        const pRace = 'goblin';
        const [playerX, playerY] = [0, 0];
        const owConf = FactoryGame.getOwConf(1.0);
        const overworld = OWMap.createOverWorld(owConf);
        const owTerrMap = gameFact.createTerritoryMap(overworld, pRace,
            playerX, playerY);
        overworld.setTerrMap(owTerrMap);

        const worldAndConf = OverWorld.createOverWorldLevel(
          overworld, owConf);
        const [worldLevel, worldConf] = worldAndConf;

        gameFact.mapZonesToTerritoryMap(overworld.getTerrMap(), worldConf);

        const citiesConf = worldConf.area[0].city;

        const coordMap = new CoordMap();
        coordMap.setXYMap(10, 10);

        const terrMap = overworld.getTerrMap();
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

    });


    it('can generate a fully populated overworld area', () => {
        const gameFact = new FactoryGame();
        const owConf: OWMapConf = {
            nDungeonsSouth: 1,
            nDungeonsNorth: 1,
            nDungeonsCenter: 1,
            nMountainsNorth: 1,
            nMountainsMiddle: 1,
            nMountainsSouth: 1,
            nCitySouth: 1,
            nCityCenter: 1,
            nCityNorth: 1,
            verify: false
        };
        const gameConf: IFactoryGameConf = {
            playMode: 'OverWorld', sqrPerItem: 100, sqrPerActor: 100,
            seed: 0, playerLevel: 'Medium', playerName: 'Hero',
            playerRace: 'dwarf', owMultiplier: 0.5, owConf
        };
        const game = gameFact.createNewGame(gameConf);

    });

});
