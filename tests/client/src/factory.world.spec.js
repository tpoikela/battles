
const expect = require('chai').expect;
const RG = require('../../../client/src/battles');
const RGTest = require('../../roguetest');

const expectConnected = RGTest.expectConnected;

describe('Factory.World', function() {
    this.timeout(3000);
    let fact = null;

    beforeEach(() => {
        fact = new RG.Factory.World();
    });

    afterEach(() => {
        fact = null;
    });

    it('has scope, conf and hier name management', () => {
        const fact = new RG.Factory.World();
        const conf1 = {name: 'Top', myConf: 'Top_abc'};
        const conf2 = {name: 'Sub', constraint: 'abc'};
        const conf3 = {name: 'SubSub', myConf: 'SubSub_xxx'};
        const conf4 = {name: 'Bottom', constraint: 'xyz'};
        fact.pushScope(conf1);
        fact.pushScope(conf2);
        expect(fact.getHierName()).to.equal('Top.Sub');
        expect(fact.getConf('constraint')).to.equal('abc');
        expect(fact.getConf('myConf')).to.equal('Top_abc');

        fact.pushScope(conf3);
        expect(fact.getHierName()).to.equal('Top.Sub.SubSub');
        expect(fact.getConf('constraint')).to.equal('abc');
        expect(fact.getConf('myConf')).to.equal('SubSub_xxx');

        fact.pushScope(conf4);
        expect(fact.getConf('constraint')).to.equal('xyz');
        fact.popScope(conf4);
        expect(fact.getConf('constraint')).to.equal('abc');
        fact.popScope(conf3);
        expect(fact.getConf('constraint')).to.equal('abc');
    });

    it('can create cities', () => {
        const cityConf = {
            name: 'Arkham', nQuarters: 2,
            connectLevels: [
                ['Q1', 'Q2', 0, 0]
            ],
            quarter: [
                {name: 'Q1', nLevels: 1, entranceLevel: 0},
                {name: 'Q2', nLevels: 2}
            ]
        };
        const city = fact.createCity(cityConf);
        expect(city.getName()).to.equal(cityConf.name);

        const qs = city.getQuarters();
        expect(qs).to.have.length(2);
        expectConnected(qs[0], qs[1], 1);

        expect(qs[0].getParent().getName()).to.equal('Arkham');
    });

    it('can create Branch using config object', () => {
        const brConf = {
            name: 'DangerousBranch',
            nLevels: 2,
            entranceLevel: 0,
            sqrPerItem: 20,
            sqrPerActor: 20
        };
        const br = fact.createBranch(brConf);
        expect(br.getName()).to.equal(brConf.name);
        expect(br.getEntrance()).to.not.be.empty;

        const l0 = br.getLevels()[0];

        // Should have entrance + stairs down == 2 stairs
        expect(l0.getStairs()).to.have.length(2);
    });

    it('can create elements to fixed positions', () => {
        const brConf = {
            name: 'DangerousBranch',
            nLevels: 2,
            entranceLevel: 0,
            sqrPerItem: 20,
            sqrPerActor: 20,
            create: {
                stairs: [{nLevel: 1, isDown: false, x: 10, y: 10}]
            }
        };
        const br = fact.createBranch(brConf);
        const l1 = br.getLevels()[1];
        const stairsL1 = l1.getStairs();
        expect(stairsL1).to.have.length(2);
    });

    it('Can create dungeon using config object', () => {
        const dungeonConf = {
            name: 'Cave',
            nBranches: 3,
            entrance: 'br2',
            sqrPerActor: 50,
            sqrPerItem: 50,
            connectLevels: [
                // Each connection is branch1, branch2, level1, level2
                ['br1', 'br2', 0, 1],
                ['br3', 'br2', 2, 0]
            ],
            branch: [
                { name: 'br1', nLevels: 1},
                { name: 'br2', nLevels: 2, entranceLevel: 0},
                { name: 'br3', nLevels: 3 }
            ]
        };
        const dungeon = fact.createDungeon(dungeonConf);
        const branches = dungeon.getBranches();
        expect(dungeon.getName()).to.equal('Cave');
        expect(dungeon.getLevels()).to.have.length(6);
        expect(dungeon.getEntrances()).to.have.length(1);
        expect(dungeon.getEntrances()[0]).not.to.be.empty;
        expectConnected(branches[0], branches[1], 1);
        expectConnected(branches[1], branches[2], 1);
        expect(branches[0].getParent().getName()).to.equal('Cave');
    });

    it('creates properly connected dungeons with branches', () => {
        const dConf = {
            x: 0, y: 0,
            name: 'BranchTest',
            sqrPerItem: 100,
            sqrPerActor: 100,
            nBranches: 3,
            connectLevels: [
                ['main', 'side', 0, 0],
                ['main', 'side2', 0, 0]
            ],
            branch: [
                {name: 'main', nLevels: 1},
                {name: 'side', nLevels: 1, entranceLevel: 0},
                {name: 'side2', nLevels: 1, entranceLevel: 0}
            ]
        };
        const dungeon = fact.createDungeon(dConf);
        const branches = dungeon.getBranches();
        expectConnected(branches[0], branches[1], 1);
        expectConnected(branches[0], branches[2], 1);

        const entrB1 = branches[1].getEntrance();
        const entrB2 = branches[2].getEntrance();
        expect(entrB1).to.exist;
        expect(entrB1.getTargetStairs()).to.be.null;
        expect(entrB2).to.exist;
        expect(entrB2.getTargetStairs()).to.be.null;
    });

    it('can create cities within areas with given locations', () => {
        const worldConf = {
            name: 'ww',
            nAreas: 1,
            area: [
                { name: 'a1', maxX: 1, maxY: 1, nCities: 1,
                    city: [
                        { x: 0, y: 0, levelX: 4, levelY: 7,
                            name: 'Ravendark', nQuarters: 1,
                            connectToAreaXY: [
                                {name: 'Q1', nLevel: 1, levelX: 8, levelY: 9}
                            ],
                            quarter: [
                                {name: 'Q1', nLevels: 2, entranceLevel: 0}
                            ]
                        }
                    ]
                }
            ]
        };

        fact.setGlobalConf({});
        const world = fact.createWorld(worldConf);

        const cities = world.getZones('City');
        expect(cities).to.have.length(1);

        expect(cities[0].getParent().getName()).to.equal('a1');

        const area = world.getAreas()[0];
        expect(area.getParent().getName()).to.equal('ww');
        const areaLevel = area.getTileXY(0, 0).getLevel();

        const townConnect0 = areaLevel.getConnections()[0];
        expect(townConnect0.getX()).to.equal(4);
        expect(townConnect0.getY()).to.equal(7);
        expect(townConnect0.getName()).to.equal('town');

        const townConnect1 = areaLevel.getConnections()[1];
        expect(townConnect1.getX()).to.equal(8);
        expect(townConnect1.getY()).to.equal(9);
        expect(townConnect1.getName()).to.equal('town');


    });

    it('can create a city with preset levels/created stairs', () => {
        const level = RG.FACT.createLevel('arena', 20, 20, {});
        const stairs1 = new RG.Element.Stairs('stairsDown', level);
        const stairs2 = new RG.Element.Stairs('stairsUp', level);
        level.addStairs(stairs1, 1, 1);
        level.addStairs(stairs2, 15, 15);

        const levelStub = {stub: true, new: 'arena', args: [40, 40]};

        const cityConf = {
            name: 'CapitalCity',
            x: 0, y: 0,
            nQuarters: 2,
            presetLevels: {
                'CapitalCity.MainQuarter': [{nLevel: 0, level}],
                'CapitalCity.SideQuarter': [{nLevel: 0, levelStub}]
            },
            quarter: [
                {name: 'MainQuarter', nLevels: 1},
                {name: 'SideQuarter', nLevels: 2}
            ],
            connectLevels: [
                ['MainQuarter', 'SideQuarter', 0, 1]
            ],
            connectToAreaXY: [
                {levelX: 0, levelY: 1, name: 'MainQuarter', nLevel: 0,
                    stairs: stairs1},
                {levelX: 3, levelY: 4, name: 'MainQuarter', nLevel: 0,
                    stairs: {getStairs: 1}},
                {levelX: 4, levelY: 4, name: 'SideQuarter', nLevel: 0,
                    stairs: {getStairs: 0}}
            ]
        };
        const areaLevel = RG.FACT.createLevel('empty', 100, 100, {});
        const areaLevels = [[areaLevel]];
        const areaConf = {
            name: 'Area1x1', maxX: 1, maxY: 1, nCities: 1,
            presetLevels: {
                Area1x1: areaLevels
            },
            city: [cityConf]
        };
        const fact = new RG.Factory.World();
        const area = fact.createArea(areaConf);
        expect(area.getZones('City')).to.have.length(1);
        const city = area.getZones('City')[0];
        expect(city.getLevels()).to.have.length(3);

        const stairs = level.getStairs();
        stairs.forEach(s => {expect(s.isConnected()).to.be.true;});

        const cityLevel = city.getLevels()[0];
        expect(cityLevel.getID()).to.equal(level.getID());

        const qSide = city.findSubZone('SideQuarter');
        const l0 = qSide.getLevels()[0];
        const l1 = qSide.getLevels()[1];

        expect(l0.getStairs()).to.have.length(1);
        expect(l1.getStairs()).to.have.length(1);

        // expect(l0.getConnections().length).to.be.above(10);
        expect(l1.getConnections().length).to.be.above(10);

        const qStairs = l1.getStairs();
        console.log(JSON.stringify(qStairs[0]));
        console.log(JSON.stringify(qStairs[1]));

    });


});
