
import Entity from '../../../client/src/entity';

const expect = require('chai').expect;
const RG = require('../../../client/src/battles');
const RGTest = require('../../roguetest');

const worldConf = require('../../../client/data/conf.world');

describe('Function: Creating game world from a file', function() {
    this.timeout(60000);
    it('can create world from external config object', () => {
        const fact = new RG.Factory.World();
        const world = fact.createWorld(worldConf);
        expect(world.getAreas()).to.have.length(worldConf.nAreas);
        expect(world.getName()).to.equal(worldConf.name);
        expect(world.getLevels()).to.have.length.above(0);
    });

    it('Can create World using config object', function() {
        const worldConf = {
            name: 'w1',
            nAreas: 2,
            area: [
                { name: 'a1', maxX: 2, maxY: 3, nDungeons: 1,
                    cols: 80, rows: 28,
                    dungeon: [
                        {x: 0, y: 0, name: 'd1.1', nBranches: 1,
                            branch: [ { name: 'b1', nLevels: 2,
                                entranceLevel: 0}]
                        }
                    ]
                },
                { name: 'a2', maxX: 1, maxY: 3, nMountains: 1,
                    cols: 80, rows: 28,
                    mountain: [{x: 0, y: 1, name: 'm2.1', nFaces: 1,
                        face: [{name: 'Steep', nLevels: 1, x: 50, y: 100,
                        entranceLevel: 0}]
                    }]
                }
            ]
        };
        const fact = new RG.Factory.World();
        const world = fact.createWorld(worldConf);
        expect(world.getName()).to.equal('w1');
        expect(world.getAreas()).to.have.length(2);
        expect(world.getAreas()[0].getDungeons()).to.have.length(1);
        expect(world.getDungeons(), 'Found 1 dungeon').to.have.length(1);
        expect(world.getMountains(), 'Found 1 mountain').to.have.length(1);

        expect(world.getDungeons()[0].getName(),
            'Dungeon name OK.').to.equal('d1.1');
    });

    it('converts a game containing world into JSON and back', () => {
        const fromJSON = new RG.Game.FromJSON();
        const fact = new RG.Factory.World();
        const conf = {name: 'Ice Kingdom', nAreas: 1,
            area: [{ name: 'Area51', maxX: 2, maxY: 2,
                nDungeons: 1,
                dungeon: [
                    { x: 0, y: 0, name: 'Dungeon1', nBranches: 1,
                        branch: [
                            {name: 'Branch1', nLevels: 2, entranceLevel: 0}
                        ]
                    }
                ],
                nMountains: 1,
                mountain: [
                    {x: 0, y: 0, name: 'Cliff', nFaces: 1,
                        face: [{name: 'north', nLevels: 1, x: 20, y: 20,
                        entranceLevel: 0}]
                    }
                ],
                nCities: 1,
                city: [
                    {x: 0, y: 0, name: 'City1', nQuarters: 1,
                        quarter: [{name: 'Q1', nLevels: 1, entranceLevel: 0}]
                    }
                ]
            }]
        };
        const numLevels = 2 * 2 + 2 + 1 + 1;

        // Create game, world and player first
        const game = new RG.Game.Main();
        const world = fact.createWorld(conf);
        const player = new RG.Actor.Rogue('MyPlayer');
        player.setType('player');
        player.setIsPlayer(true);
        game.addPlace(world);
        game.addPlayer(player, {place: 'Ice Kingdom'});
        let gameLevels = game.getLevels();

        // Verify correct number of levels before serialisation
        expect(gameLevels).to.have.length(numLevels);

        // Serialise and check ID counters
        const json = game.toJSON();
        expect(json.lastLevelID).to.equal(RG.Map.Level.prototype.idCount);
        expect(json.lastEntityID).to.equal(Entity.getIDCount());

        console.log('Creating new game now');

        // Create new game from JSON, verify place + levels have been restored
        const newGame = fromJSON.createGame(json);
        expect(Object.keys(newGame.getPlaces())).to.have.length(1);
        gameLevels = newGame.getLevels();
        expect(gameLevels).to.have.length(numLevels);

        console.log('Level IDs: ' +
            JSON.stringify(gameLevels.map(l => l.getID())));

        // Verify that world zones have been restored
        const newWorld = newGame.getPlaces()['Ice Kingdom'];
        const dungeons = newWorld.getDungeons();
        expect(dungeons, 'World has 1 dungeon').to.have.length(1);

        expect(newWorld.getZones()).to.have.length(3);

        // Verify stairs connectivity
        const allStairsInWorld = newWorld.getStairs();
        RGTest.verifyStairsConnectivity(allStairsInWorld);

        // Detailed checks that dungeon and branches restored OK
        const d1 = dungeons[0];
        expect(d1.getName(), 'Dungeon name OK').to.equal('Dungeon1');
        expect(d1.getEntrances()).to.have.length(1);

        const b1 = d1.getBranches()[0];
        expect(b1.getName()).to.equal('Branch1');
        expect(b1.getEntrance()).not.to.be.empty;
        expect(b1.getDungeon()).not.to.be.empty;

        // Verify mountain restoration
        const mountains = newWorld.getMountains();
        expect(mountains).to.have.length(1);
        const m1 = mountains[0];
        expect(m1.getName()).to.equal('Cliff');

        const f1 = m1.getFaces()[0];
        expect(f1.getEntrance()).not.to.be.empty;

        // Verify that city is restored correctly
        const cities = newWorld.getCities();
        expect(cities, 'World has one city').to.have.length(1);
        const c1 = cities[0];
        expect(c1.getEntrances()[0]).to.not.be.empty;

    });
});
