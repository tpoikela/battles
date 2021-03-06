
const chaiBattles = require('../../helpers/chai-battles.js');
const chai = require('chai');
const RG = require('../../../client/src/battles');
const RGTest = require('../../roguetest');
const worldConf = require('../../../client/data/conf.world');
const Entity = require('../../client/src/entity');

const expect = chai.expect;
chai.use(chaiBattles);

describe('Function: Creating game world from a file', function() {
    this.timeout(60000);
    it('can create world from external config object', () => {
        const fact = new RG.Factory.World();

        const fromJSON = new RG.Game.FromJSON();
        Object.values(worldConf.presetLevels).forEach(hierName => {
            hierName.forEach((obj, index) => {
                obj.level = fromJSON.restoreLevel(obj.level);
                obj.level.setID(666666 + index);
            });
        });

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
                { name: 'a2', maxX: 2, maxY: 3, nMountains: 1,
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
        expect(world.getAreas()[0].getZones('Dungeon')).to.have.length(1);
        expect(world.getZones('Dungeon'), 'Found 1 dungeon').to.have.length(1);

        const mountains = world.getZones('Mountain');
        expect(mountains, 'Found 1 mountain').to.have.length(1);
        const m1Level = mountains[0].getLevels()[0];
        expect(m1Level).to.have.cell('xxx');

        expect(world.getZones('Dungeon')[0].getName(),
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
        const numLevels = 2 * 2 + 2 + 1 + 1 + 1;

        // Create game, world and player first
        const game = new RG.Game.Main();
        const world = fact.createWorld(conf);
        const player = new RG.Actor.Rogue('MyPlayer');
        player.setType('player');
        player.setIsPlayer(true);
        game.addPlace(world);
        game.addPlayer(player, {place: 'Ice Kingdom'});
        let gameLevels = game.getLevels();

        const badge = new RG.Component.BattleBadge();
        badge.setData({status: 'Won', killed: 10});
        player.add(badge);

        // Verify correct number of levels before serialisation
        expect(gameLevels).to.have.length(numLevels);

        // Serialise and check ID counters
        const json = game.toJSON();
        expect(json.lastLevelID).to.equal(RG.Map.Level.idCount);
        expect(json.lastEntityID).to.equal(Entity.getIDCount());

        console.log('Creating new game now');

        // Create new game from JSON, verify place + levels have been restored
        const newGame = fromJSON.createGame(json);
        expect(Object.keys(newGame.getPlaces())).to.have.length(1);
        gameLevels = newGame.getLevels();
        expect(gameLevels).to.have.length(numLevels);

        console.log('Level IDs: ' +
            JSON.stringify(gameLevels.map(l => l.getID())));

        const oldWorld = game.getPlaces()['Ice Kingdom'];
        const oldArea = oldWorld.getAreas()[0];
        const oldMountains = oldWorld.getZones('Mountain');
        const oldM1 = oldMountains[0];
        const oldF1 = oldM1.getFaces()[0];

        // Verify that world zones have been restored
        const newWorld = newGame.getPlaces()['Ice Kingdom'];
        expect(newWorld.getID(), 'World ID same').to.equal(oldWorld.getID());

        const newArea = newWorld.getAreas()[0];
        expect(newArea.getID(), 'Area ID same').to.equal(oldArea.getID());
        const dungeons = newWorld.getZones('Dungeon');
        expect(dungeons, 'World has 1 dungeon').to.have.length(1);

        const worldZones = newWorld.getZones();
        expect(worldZones).to.have.length(3);

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
        const mountains = newWorld.getZones('Mountain');
        expect(mountains).to.have.length(1);
        const m1 = mountains[0];
        expect(m1.getName()).to.equal('Cliff');
        expect(m1.getParent().getName()).to.equal('Area51');
        expect(m1.getID()).to.equal(oldM1.getID());

        const f1 = m1.getFaces()[0];
        // expect(f1.getEntrance()).not.to.be.empty;
        expect(f1.getID()).to.equal(oldF1.getID());

        // Verify that city is restored correctly
        const cities = newWorld.getZones('City');
        expect(cities, 'World has one city').to.have.length(1);
        // const c1 = cities[0];
        // expect(c1.getEntrances()[0]).to.not.be.empty;

        // Verify that player is restored properly
        const newPlayer = newGame.getPlayer();
        const playerComps = player.getComponents();
        const newPlayerComps = newPlayer.getComponents();

        const compIDs = Object.keys(playerComps);
        const newCompIDs = Object.keys(newPlayerComps);

        const cNames = Object.values(playerComps).map(c => c.getType());
        const cNamesNew = Object.values(newPlayerComps).map(c => c.getType());

            expect(cNamesNew.length).to.equal(cNames.length);
        for (let i = 1; i < cNames.length - 1; i++) {
            expect(cNamesNew[i - 1]).to.equal(cNames[i]);
            expect(newCompIDs[i - 1]).to.deep.equal(compIDs[i]);
        }


    });
});
