
import chai from 'chai';
import RG from '../../../client/src/rg';
import {World} from '../../../client/src/world';
import {RGTest} from '../../roguetest';
import {FactoryLevel} from '../../../client/src/factory.level';
import {ObjectShell} from '../../../client/src/objectshellparser';
import * as Element from '../../../client/src/element';

const expect = chai.expect;

const expectConnected = RGTest.expectConnected;
const factLevel = new FactoryLevel();

describe('World.Branch', () => {
    it('Contains a number of connected levels', () => {
        const nlevels = 4;
        const levels = [];
        const branch = new World.Branch('br1');
        for (let i = 0; i < nlevels; i++) {
            levels.push(factLevel.createLevel('arena', 20, 20));
            branch.addLevel(levels[i]);
            expect(branch.hasLevel(levels[i])).to.equal(true);
        }
        branch.connectLevels();

        let stairs = levels[0].getStairsToLevel(levels[1]);
        expect(stairs === null).to.equal(false);
        stairs = levels[0].getStairsToLevel(levels[2]);
        expect(stairs === null).to.equal(true);
        const entrance = branch.getEntrance();
        expect(entrance, 'Entrance null unless set').to.equal(null);
    });
});

const addLevelsToBranch = (br, nLevels) => {
    for (let i = 0; i < nLevels; i++) {
        const level = factLevel.createLevel('arena', 20, 20);
        br.addLevel(level);
    }
    br.connectLevels();
};

describe('World.Dungeon', () => {
    it('Contains a number of connected branches', () => {
        const dungeon = new World.Dungeon('DarkDungeon');
        const branches = [];
        const numBranches = 4;
        const branchNames = [];

        for (let i = 0; i < numBranches; i++) {
            const brName = 'branch' + i;
            const branch = new World.Branch(brName);
            addLevelsToBranch(branch, i + 2);
            dungeon.addBranch(branch);
            branches.push(branch);
            branchNames.push(brName);
            const entrStairs = new Element.ElementStairs('stairsUp');
            branch.setEntrance(entrStairs, 0);
        }
        expect(branches[0].getParent()).to.equal(dungeon);

        dungeon.setEntrance(branchNames);
        const entrances = dungeon.getEntrances();
        expect(entrances).to.have.length(numBranches);

        entrances.forEach(entr => {
            const level = entr.getSrcLevel();
            expect(level.getID()).to.be.above(0);
        });

        dungeon.connectSubZones(branches[0], branches[1], 1, 2);

        const placeEnts = dungeon.getPlaceEntities();
        expect(placeEnts).to.have.length(5);
    });
});

describe('World.AreaTile', () => {
    it('Contains a level and connects from sides to other tiles', () => {
        const cols = 20;
        const rows = 20;

        let testArea = new World.Area('TestArea', 2, 2);
        const areaTile = testArea.getTileXY(0, 0);
        const tileLevel = factLevel.createLevel('ruins', cols, rows);
        areaTile.setLevel(tileLevel);
        expect(areaTile.isNorthEdge()).to.equal(true);
        expect(areaTile.isSouthEdge()).to.equal(false);
        expect(areaTile.isEastEdge()).to.equal(false);
        expect(areaTile.isWestEdge()).to.equal(true);
        expect(areaTile.cols).to.equal(cols);

        testArea = new World.Area('TestArea', 3, 3);
        const tile11 = testArea.getTileXY(1, 1);
        const level11 = factLevel.createLevel('ruins', cols, rows);
        tile11.setLevel(level11);
        expect(tile11.isNorthEdge()).to.equal(false);
        expect(tile11.isSouthEdge()).to.equal(false);
        expect(tile11.isWestEdge()).to.equal(false);
        expect(tile11.isEastEdge()).to.equal(false);

        // Create 2 more tiles, and test connect()
        const tile21 = new World.AreaTile(2, 1, testArea);
        const level21 = factLevel.createLevel('ruins', cols, rows);
        tile21.setLevel(level21);
        const tile12 = new World.AreaTile(1, 2, testArea);
        const level12 = factLevel.createLevel('ruins', cols, rows);
        tile12.setLevel(level12);
        tile11.connect(tile21, tile12);

        expect(level21.getStairs() === null).to.equal(false);
        expect(level11.getStairs() === null).to.equal(false);
        expect(level12.getStairs() === null).to.equal(false);
    });

    it('can be serialized to JSON', () => {
        const testArea = new World.Area('TestArea', 2, 2);
        const areaTile = new World.AreaTile(0, 1, testArea);
        const tileLevel = factLevel.createLevel('ruins', 10, 10);
        areaTile.setLevel(tileLevel);
        const json = areaTile.toJSON();
        expect(json.levels[0].id).to.equal(tileLevel.getID());
        expect(json.x).to.equal(0);
        expect(json.y).to.equal(1);
    });
});


describe('World.Area', () => {
    it('Contains a number of connected tiles', () => {
        const area = new World.Area('SwampArea', 4, 5);
        const tiles = area.getTiles();
        const levels = area.getLevels();
        expect(tiles[1][0].isNorthEdge()).to.equal(true);
        expect(tiles[1][1].isNorthEdge()).to.equal(false);
        expect(tiles[3][4].isSouthEdge()).to.equal(true);
        expect(tiles[1][0].isSouthEdge()).to.equal(false);
        expect(tiles[3][4].isEastEdge()).to.equal(true);
        expect(tiles[2][4].isEastEdge()).to.equal(false);
        expect(levels).to.have.length(20);
    });

    it('can be serialized to JSON', () => {
        const area = new World.Area('SwampArea', 2, 2);
        const json = area.toJSON();
        expect(json.tiles[0][0]).to.exist;
        expect(json.tiles[0][1]).to.exist;
        expect(json.name).to.equal('SwampArea');
    });
});

describe('World.Mountain', () => {

    it('has at least one entrance', () => {
        const mountain = new World.Mountain('mount1');
        const face = new World.MountainFace('northFace');
        const level = factLevel.createLevel('arena', 10, 10);
        face.addLevel(level);
        expect(face.getEntrance()).to.be.null;
        face.addEntrance(0);
        expect(face.getEntrance().getName()).to.match(/stairs/);
        expect(face.getEntrance().getType()).to.equal('connection');
        expect(face.getLevels()).to.have.length(1);

        mountain.addFace(face);
        expect(mountain.getEntrances()).to.have.length(1);
        expect(mountain.getLevels()).to.have.length(1);
    });

    it('can have multiple connected mountain faces + summits', () => {
        const mountain = new World.Mountain('Mount Doom');
        const faceNames = ['north', 'south', 'east', 'west'];
        faceNames.forEach(face => {
            const faceObj = new World.MountainFace(face);
            const level = factLevel.createLevel('empty', 10, 10);
            faceObj.addLevel(level);
            mountain.addFace(faceObj);
        });

        const faces = mountain.getFaces();
        expect(faces).to.have.length(4);
        for (let i = 0; i < 5; i++) {
            mountain.connectSubZones('north', 'south', 0, 0);
        }
        expectConnected(faces[0], faces[1], 5);
        mountain.connectSubZones('east', 'west', 0, 0);
        expectConnected(faces[2], faces[3], 1);

        const summit = new World.MountainSummit('North summit');
        const summitLevel = factLevel.createLevel('empty', 10, 10);
        summit.addLevel(summitLevel);
        mountain.addSummit(summit);

        mountain.connectSubZones('North summit', 'south', 0, 0);
        expectConnected(faces[1], mountain.getSummits()[0], 1);

        mountain.connectFaceAndSummit('north', 'North summit', 0, 0);
        expectConnected(faces[0], mountain.getSummits()[0], 1);
    });

});

describe('World.CityQuarter', () => {
    it('contains levels and entrances', () => {
        const q = new World.CityQuarter('North');
        expect(q.getName()).to.equal('North');
        const level = factLevel.createLevel('arena', 10, 10);
        q.addLevel(level);
        expect(q.getLevels()).to.have.length(1);
        q.addEntrance(0);
        expect(q.getEntrance().getName()).to.match(/stairs/);

    });
});

describe('World.City', () => {
    it('contains quarters and entrances', () => {
        const city = new World.City('City1');
        expect(city.getName()).to.equal('City1');

        const q1 = new World.CityQuarter('Q1');
        const level = factLevel.createLevel('arena', 10, 10);
        q1.addLevel(level);
        q1.addEntrance(0);
        city.addSubZone(q1);

        expect(city.getQuarters()[0].getName()).to.equal('Q1');
        expect(city.getEntrances()).to.have.length(1);
    });

    it('can be serialized to JSON', () => {
        const city = new World.City('City1');
        const q1 = new World.CityQuarter('Q1');
        city.addSubZone(q1);

        const json = city.toJSON();
        expect(json).to.have.property('quarter');
    });
});

describe('World.BattleZone', () => {
    it('can contain levels', () => {
        const bz = new World.BattleZone('Terrain 666');
        const arena = factLevel.createLevel('arena', 30, 30);
        bz.addLevel(arena);
        expect(bz.getLevels()).to.have.length(1);

        const levels = bz.toJSON().levels;
        expect(bz.toJSON().levels).to.have.length(1);
        expect(levels[0]).to.equal(arena.getID());
    });
});

describe('World.Shop', () => {
    it('can be set abandoned', () => {
        const parser = ObjectShell.getParser();
        const conf = {nShops: 1, parser};
        const shopLevel = factLevel.createLevel('town', 80, 40, conf);
        const shop = new World.WorldShop();
        const keeper = parser.createActor('shopkeeper');
        const coord = [];
        for (let i = 0; i < 10; i++) {
            const [x, y] = [i + 1, 1];
            const shopElem = new Element.ElementShop();
            shopElem.setShopkeeper(keeper);
            shopLevel.addElement(shopElem, x, y);
            coord.push([x, y]);
        }
        shop.setCoord(coord);
        shop.setLevel(shopLevel);
        shop.setShopkeeper(keeper);
        shop.setShopAbandoned();

        expect(shop.getShopkeeper()).to.be.null;

        const json = shop.toJSON();
        expect(json.level).to.equal(shopLevel.getID());

        const keeper2 = parser.createActor('shopkeeper');
        shop.reclaimShop(keeper2);
        expect(shop.getShopkeeper()).to.not.be.empty;
    });
});


describe('WorldTop', () => {
    it('It has accessor functions for world hierarchy', () => {
        const worldTop = new World.WorldTop('my world');
        let ents = worldTop.getPlaceEntities();
        expect(ents).to.have.length(1);

        const testArea = new World.Area('TestArea', 3, 3);
        worldTop.addArea(testArea);
        ents = worldTop.getPlaceEntities();
        expect(ents).to.have.length(2);

    });
});
