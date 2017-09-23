
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
            connect: [
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
            connect: [
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
    });

    it('creates properly connected dungeons with branches', () => {
        const dConf = {
            x: 0, y: 0,
            name: 'BranchTest',
            sqrPerItem: 100,
            sqrPerActor: 100,
            nBranches: 3,
            connect: [
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
                            connectToXY: [
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
        expect(world.getCities()).to.have.length(1);

        const areaLevel = world.getAreas()[0].getTileXY(0, 0).getLevel();
        const stairs0 = areaLevel.getStairs()[0];
        expect(stairs0.getX()).to.equal(4);
        expect(stairs0.getY()).to.equal(7);

        const stairs1 = areaLevel.getStairs()[1];
        expect(stairs1.getX()).to.equal(8);
        expect(stairs1.getY()).to.equal(9);


    });

    it('can create a city with preset levels/created stairs', () => {
        const level = RG.FACT.createLevel('arena', 20, 20, {});
        const stairs1 = new RG.Element.Stairs(true, level);
        const stairs2 = new RG.Element.Stairs(false, level);
        level.addStairs(stairs1, 1, 1);
        level.addStairs(stairs2, 15, 15);

        const cityConf = {
            name: 'CapitalCity',
            x: 0, y: 0,
            nQuarters: 1,
            presetLevels: {
                'CapitalCity.MainQuarter': {nLevel: 0, level}
            },
            quarter: [
                {name: 'MainQuarter', nLevels: 1}
            ],
            connectToXY: [
                {levelX: 0, levelY: 1, name: 'MainQuarter', nLevel: 0,
                    stairs: stairs1},
                {levelX: 3, levelY: 4, name: 'MainQuarter', nLevel: 0,
                    stairs: stairs2}
            ]
        };
        const areaConf = {
            name: 'Area1x1', maxX: 1, maxY: 1, nCities: 1,
            city: [cityConf]
        };
        const fact = new RG.Factory.World();
        const area = fact.createArea(areaConf);
        expect(area.getCities()).to.have.length(1);
        const city = area.getCities()[0];
        expect(city.getLevels()).to.have.length(1);

        const stairs = level.getStairs();
        stairs.forEach(s => {expect(s.isConnected()).to.be.true;});

    });


});
