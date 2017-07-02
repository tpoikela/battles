
const expect = require('chai').expect;

const RG = require('../../../client/src/battles');
const Game = require('../../../client/src/game');
const RGTest = require('../../roguetest');

const FromJSON = Game.FromJSON;

describe('RG.Game.FromJSON', () => {
    let fromJSON = null;

    beforeEach(() => {
        fromJSON = new FromJSON();
    });

    afterEach(() => {
        fromJSON = null;
    });

    it('Converts item JSON back to RG.Items', () => {
        const item1 = new RG.Item.Weapon('knife');
        const json = item1.toJSON();
        const newItem = fromJSON.createItem(json);

        expect(newItem.getName()).to.equal(item1.getName());
        expect(newItem.getType()).to.equal(item1.getType());
    });

    it('Converts level JSON back to RG.Map.Level', () => {
        const level = RGTest.createLevel('arena', 20, 20);
        const json = level.toJSON();
        const newLevel = fromJSON.createLevel(json);
        expect(newLevel.getID()).to.equal(level.getID());
    });

    it('Converts level.map JSON back to RG.Map', () => {
        const level = RGTest.createLevel('arena', 20, 20);
        const json = level.toJSON();
        const newLevel = fromJSON.createLevel(json);
        const newMap = newLevel.getMap();
        for (let x = 0; x < 20; x++) {
            expect(newMap.getCell(x, 0).isPassable(),
                `Cell ${x},0 should have wall thus not passable`,
            ).to.equal(false);
        }
    });

    it('converts level and its objects into JSON and back to object', () => {
        const level = RGTest.createLevel('arena', 10, 10);
        const actor = new RG.Actor.Rogue('Urkh!');
        actor.setType('goblin');
        const item = new RG.Item.Weapon('sword');
        level.addActor(actor, 2, 2);
        level.addItem(item, 3, 3);
        const json = level.toJSON();
        const newLevel = fromJSON.createLevel(json);

        const actors = newLevel.getActors();
        const items = newLevel.getItems();
        expect(actors).to.have.length(1);
        expect(actors[0].getName()).to.equal('Urkh!');
        expect(items).to.have.length(1);
        expect(items[0].getName()).to.equal('sword');
    });

    it('connects levels after restoring game from JSON', () => {
        const game = new RG.Game.Main();
        const level1 = RGTest.createLevel('arena', 10, 10);
        const level2 = RGTest.createLevel('arena', 10, 10);
        const s1 = new RG.Element.Stairs(true, level1, level2);
        const s2 = new RG.Element.Stairs(false, level2, level1);
        s1.connect(s2);
        level1.addStairs(s1, 1, 1);
        level2.addStairs(s2, 2, 2);
        game.addLevel(level1);
        game.addLevel(level2);

        const json = game.toJSON();
        const newGame = fromJSON.createGame(json);
        const newLevels = newGame.getLevels();
        expect(newLevels).to.have.length(2);

        const newS1 = newLevels[0].getStairs()[0];
        const newS2 = newLevels[1].getStairs()[0];
        const id1 = newLevels[0].getID();
        const id2 = newLevels[1].getID();

        expect(newS1.getTargetLevel(), 'Target level must be set').to.exist;
        expect(newS2.getTargetLevel(), 'Target level must be set').to.exist;

        expect(newS1.getTargetLevel().getID()).to.equal(id2);
        expect(newS2.getTargetLevel().getID()).to.equal(id1);

    });


    it('converts full game into JSON and back to object', () => {
        const game = new RG.Game.Main();
        const level = RGTest.createLevel('arena', 10, 10);
        const player = new RG.Actor.Rogue('MyPlayer');
        player.setType('player');
        player.setIsPlayer(true);
        game.addLevel(level);
        game.addPlayer(player);
        const json = game.toJSON();
        const newGame = fromJSON.createGame(json);
        const newPlayer = newGame.getPlayer();
        expect(newPlayer.getName()).to.equal('MyPlayer');
    });

    it('converts a game containing world into JSON and back', () => {
        const fact = new RG.Factory.World();
        const conf = {name: 'Ice Kingdom', nAreas: 1,
            area: [{ name: 'Area51', maxX: 1, maxY: 1,
                nDungeons: 1,
                dungeon: [
                    { x: 0, y: 0, name: 'Dungeon1', nBranches: 1,
                        branch: [
                            {name: 'Branch1', nLevels: 2, entranceLevel: 0}
                        ]
                    }
                ]
            }]
        };
        const numLevels = 3;

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
        expect(json.lastEntityID).to.equal(RG.Entity.prototype.idCount);

        console.log('Creating new game now');

        // Create new game from JSON, verify place + levels have been restored
        const newGame = fromJSON.createGame(json);
        expect(Object.keys(newGame.getPlaces())).to.have.length(1);
        gameLevels = newGame.getLevels();
        expect(gameLevels).to.have.length(numLevels);

        console.log('Level IDs: ' +
            JSON.stringify(gameLevels.map(l => l.getID())));

        // Verify that world features have been restored
        const newWorld = newGame.getPlaces()['Ice Kingdom'];
        const dungeons = newWorld.getDungeons();
        expect(dungeons, 'World has 1 dungeon').to.have.length(1);

        // Detailed checks that dungeon and branches restored OK
        const d1 = dungeons[0];
        expect(d1.getName(), 'Dungeon name OK').to.equal('Dungeon1');
        expect(d1.getEntrances()).to.have.length(1);

        const b1 = d1.getBranches()[0];
        expect(b1.getName()).to.equal('Branch1');
        expect(b1.getEntrance()).not.to.be.empty;
        expect(b1.getDungeon()).not.to.be.empty;
    });
});
