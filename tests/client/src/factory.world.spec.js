
const expect = require('chai').expect;
const RG = require('../../../client/src/battles');
const RGTest = require('../../roguetest');

const expectConnected = RGTest.expectConnected;

describe('Factory.World', function() {
    let fact = null;

    beforeEach(() => {
        fact = new RG.Factory.World();
    });

    afterEach(() => {
        fact = null;
    });

    it('has scope and hier name management', () => {
        const fact = new RG.Factory.World();
        const conf1 = {name: 'Top'};
        const conf2 = {name: 'Sub', constraint: 'abc'};
        const conf3 = {name: 'SubSub'};
        const conf4 = {name: 'Bottom', constraint: 'xyz'};
        fact.pushScope(conf1);
        fact.pushScope(conf2);
        expect(fact.getHierName()).to.equal('Top.Sub');
        expect(fact.getConstraint()).to.equal('abc');
        fact.pushScope(conf3);
        expect(fact.getHierName()).to.equal('Top.Sub.SubSub');
        expect(fact.getConstraint()).to.equal('abc');
        fact.pushScope(conf4);
        expect(fact.getConstraint()).to.equal('xyz');
        fact.popScope(conf4.name);
        expect(fact.getConstraint()).to.equal('abc');
        fact.popScope(conf3.name);
        expect(fact.getConstraint()).to.equal('abc');
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
            entranceLevel: 0
        };
        const br = fact.createBranch(brConf);
        expect(br.getName()).to.equal(brConf.name);
        expect(br.getEntrance()).to.not.be.empty;

        const l0 = br.getLevels()[0];

        // Should have entrance + stairs down == 2 stairs
        expect(l0.getStairs()).to.have.length(2);
    });

    it('Can create dungeon using config object', () => {
        const dungeonConf = {
            name: 'Cave',
            nBranches: 3,
            entrance: 'br2',
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

    it('can create cities within areas', () => {
        const worldConf = {
            name: 'ww',
            nAreas: 1,
            area: [
                { name: 'a1', maxX: 1, maxY: 1, nCities: 1,
                    city: [
                        { x: 0, y: 0, name: 'Ravendark', nQuarters: 1,
                            quarter: [
                                {name: 'Q1', nLevels: 1, entranceLevel: 0}
                            ]
                        }
                    ]
                }
            ]
        };
        const world = fact.createWorld(worldConf);
        expect(world.getCities()).to.have.length(1);
    });

});
