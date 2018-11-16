
/** Note: This file doesn't contain any unit tests. It has utility functions and
 * logic for performing common things required in unit tests. An example is
 * creating a level and adding a list of actors automatically there.
 */

import RG from '../client/src/rg';
import {expect} from 'chai';
import {Screen} from '../client/gui/screen';

import {FactoryWorld} from '../client/src/factory.world';
import {FactoryItem} from '../client/src/factory.items';
import {GameMain} from '../client/src/game';
import {Random} from '../client/src/random';
import {FactoryLevel} from '../client/src/factory.level';
import {SentientActor} from '../client/src/actor';
import { EventPool } from '../client/src/eventpool';

export const RGTest: any = {};

const POOL = EventPool.getPool();

RGTest.rng = new Random();

/* Creates a mock-level for unit tests. */
RGTest.createMockLevel = function(cols, rows) {
    const level = {cols: cols, rows: rows,
        map: {
            getCell: function(x, y) {
                return { x: x, y: y };
            },
            hasXY: function() {
                return true;
            },
            isPassable: function(x, y) {
                return x > -1 && y > -1;
            }
        },
        getMap: function() {return this.map;},

        addActor: function(actor, x, y) {
            actor.setXY(x, y);
            actor.setLevel(this);
        }
    };
    return level;
};

RGTest.createLevel = function(type, cols, rows) {
    const factLevel = new FactoryLevel();
    return factLevel.createLevel('arena', cols, rows);
};

RGTest.equipItem = function(actor, item) {
    const invEq = actor.getInvEq();
    invEq.addItem(item);
    expect(invEq.equipItem(item)).to.equal(true);
};


RGTest.getMeAWizard = function(conf: any = {}) {
    const wizard = new SentientActor('wizard');
    wizard.setType(conf.type || 'human');
    const brain = new RG.Brain.SpellCaster(wizard);
    wizard.setBrain(brain);

    wizard._spellbook = new RG.Spell.SpellBook(wizard);
    const spell = RG.FACT.createSpell('FrostBolt');
    spell.setPower(conf.power || 11);
    spell.setRange(conf.range || 7);
    spell.setDice('damage', RG.FACT.createDie([1, 2, 3]));
    wizard._spellbook.addSpell(spell);

    // Adjust evaluators and casting probability
    RGTest.ensureSpellCast(wizard);

    const spellPower = new RG.Component.SpellPower();
    spellPower.setPP(30);
    spellPower.setMaxPP(40);
    wizard.add(spellPower);
    return wizard;

};

RGTest.ensureSpellCast = function(actor) {
    const goal = actor.getBrain().getGoal();
    goal.setBias({CastSpell: 2.0, AttackActor: 0.3});
    goal.getEvaluator('CastSpell').setCastingProbability(1.0);
};

RGTest.checkActorXY = function(actor, x, y) {
    expect(actor.getX(), `X must be ${x}`).to.equal(x);
    expect(actor.getY(), `Y must be ${y}`).to.equal(y);
};

RGTest.expectEqualHealth = function(o1, o2) {
    expect(o1.get('Health').getHP()).to.equal(o2.get('Health').getHP());
};

RGTest.verifyStairsConnectivity = function(stairs, numExp = -1) {
    let connVerified = 0;
    stairs.forEach(s => {
        expect(s.getTargetStairs()).not.to.be.empty;
        expect(s.getTargetLevel()).not.to.be.empty;
        expect(s.getSrcLevel()).not.to.be.empty;
        ++connVerified;
    });
    if (numExp >= 0) {
        expect(connVerified, `Exp ${numExp} conns`).to.equal(numExp);
    }
    else {
        expect(connVerified, 'At least one conn verified').to.be.above(0);
    }
};

/* Verifies that all given stairs in the array are connected. On failure, prints
 * the optional error msg. */
RGTest.verifyConnectivity = function(stairs, msg = '') {
    let connVerified = 0;
    stairs.forEach(s => {
        let str = `${msg} x, y: ${s.getX()}, ${s.getY()} `;
        str += JSON.stringify(s);
        expect(s.getTargetStairs(), str + ' targetStairs').to.exist;
        expect(s.getTargetLevel(), str + ' targetLevel').to.exist;
        expect(s.getSrcLevel(), str + ' srcLevel').to.exist;
        ++connVerified;
    });
    expect(connVerified, 'At least one connection exists').to.be.above(0);
};

// Expect that subzones b1 and b2 are connected by number of connections
// given by nConns.
RGTest.expectConnected = function(b1, b2, nConns) {
    let connFound = 0;
    const b1Stairs = b1.getStairsOther();
    const b2Stairs = b2.getStairsOther();
    expect(b1Stairs, 'B1 must have stairs').to.have.length.above(0);
    expect(b2Stairs, 'B2 must have stairs').to.have.length.above(0);

    b1Stairs.forEach(stair1 => {
        const s1TargetID = stair1.getTargetLevel().getID();
        expect(stair1.getTargetStairs()).not.to.be.empty;
        b2Stairs.forEach(stair2 => {
            const s2SourceID = stair2.getSrcLevel().getID();
            if (s1TargetID === s2SourceID) {
                // stair1 should be the target of stair2
                if (stair2.getTargetStairs() === stair1) {
                    ++connFound;
                }
                expect(stair2.getTargetStairs()).not.to.be.empty;
            }
        });
    });
    expect(connFound, `Connections between branches must be ${nConns}`)
        .to.equal(nConns);
};

/* Equips all given items for the given actor, and checks that everything
 * succeeds. */
RGTest.equipItems = function(ent, items) {
    const inv = ent.getInvEq();
    items.forEach(item => {
        inv.addItem(item);
        if (!inv.equipItem(item)) {
            throw new Error(`Cannot equip item ${item}`);
        }
    });
};

/* Can be used to catch the emitted game messages. */
RGTest.MsgCatcher = function() {
    this.filters = [];
    this.caught = {};
    this.numCaught = 0;

    this.printMsg = true;
    this.hasNotify = true;
    this.enabled = true;
    this.notify = (evtName, msgObj) => {
        if (!this.enabled) {return;}

        const {msg, cell} = msgObj;
        let hasMatch = false;

        if (this.filters.length > 0) {
            this.filters.forEach(filter => {
                if (filter.test(msg)) {
                    hasMatch = true;
                }
            });
        }
        else {
            hasMatch = true;
        }

        if (hasMatch) {
            if (this.printMsg) {console.log('\tMsg: |' + msg + '|');}
            if (cell) {
                if (this.printMsg) {
                    console.log('\tFrom cell: |' + JSON.stringify(cell) + '|');
                }
                const key = cell.getKeyXY();
                if (!this.caught[key]) {this.caught[key] = [];}
                this.caught[key].push(msg);
                ++this.numCaught;
            }
        }
    };
    POOL.listenEvent(RG.EVT_MSG, this);

    /* Adds a message filter to select which messages to print. */
    this.addFilter = filter => {
        if (typeof filter === 'string') {
            this.filters.push(new RegExp(filter));
        }
        else {
            this.filters.push(filter);
        }

    };

    this.disable = () => {this.enabled = false;};
};

RGTest.createSpirit = function(name) {
    const spirit = new SentientActor(name);
    spirit.setType('spirit');
    spirit.add(new RG.Component.Ethereal());
    return spirit;
};

RGTest.createBoundGem = function() {
    const gem = new RG.Item.SpiritGem('Great gem');
    const spirit = RGTest.createSpirit('Legendary spirit');
    spirit.get('Stats').setStrength(100);
    spirit.get('Stats').setAgility(100);
    gem.setSpirit(spirit);
    return gem;
};

RGTest.printScreen = function(actor) {
    const screen = new Screen(30, 14);
    const visible = actor.getBrain().getSeenCells();
    const map = actor.getLevel().getMap();
    actor.getLevel().exploreCells(actor);
    const [pX, pY] = actor.getXY();
    screen.render(pX, pY, map, visible);
    screen.printRenderedChars();
};

/* A function to run game simulation using a list of actors and a list of
 * systems. */
RGTest.updateGame = (actors, systems, nTurns = 1, cb) => {
    let simActors = actors;
    if (!Array.isArray(actors)) {
        simActors = [actors];
    }
    for (let i = 0; i < nTurns; i++) {
        simActors.forEach(actor => {
            const action = actor.nextAction();
            action.doAction();
            systems.forEach(sys => {sys.update();});
        });
        if (typeof cb === 'function') {
            cb();
        }
    }
};

/* Prints the given level as ASCII. */
RGTest.printLevel = level => {
    const [cols, rows] = [level.getMap().cols, level.getMap().rows];
    const screen = new Screen(cols / 2, rows / 2);
    level.getMap()._optimizeForRowAccess();
    screen.renderFullMap(level.getMap());
    screen.printRenderedChars();
};

RGTest.updateSystems = systems => {
    for (let i = 0; i < systems.length; i++) {
        systems[i].update();
    }
};

RGTest.enablePrint = true;

RGTest.printMemUsage = msg => {
    if (process) {
        const used = process.memoryUsage().heapUsed / 1024 / 1024;
        const usedMb = Math.round(used * 100) / 100;
        if (RGTest.enablePrint) {
            console.log(`${msg} The script uses approximately ${usedMb} MB`);
        }
    }
};


/* Can be used to destroy items during testing. */
RGTest.ItemDestroyer = function(pool) {

    this.numCalls = 0;
    this.numDestroyed = 0;

    this.hasNotify = true;
    this.notify = (evtName, obj) => {
        if (evtName === RG.EVT_DESTROY_ITEM) {
            const item = obj.item;
            const owner = item.getOwner().getOwner();
            ++this.numCalls;
            if (owner.getInvEq().removeItem(item)) {
                ++this.numDestroyed;
            }
        }
    };
    pool.listenEvent(RG.EVT_DESTROY_ITEM, this);
};

RGTest.ObjToString = function() {
    const stack = [];
    let msg = '';

    this.toString = (obj, maxStack = 10) => {
        for (const prop in obj) {
            if (obj.hasOwnProperty(prop)) {
                stack.push(prop);
                if (stack.length < maxStack) {
                    if (typeof obj[prop] === 'object') {
                        this.toString(obj[prop], maxStack - 1);
                    }
                    else if (typeof obj[prop] === 'function') {
                        // msg += `Func in ${JSON.stringify(stack)}`;
                        msg += `\n\tFunction: ${prop}`;
                        // msg += `\n\tValue: ${obj[prop].toString()}`;
                    }
                    else if (obj[prop].toString) {
                        msg += obj[prop].toString();
                    }
                    else {
                        msg += obj[prop];
                    }
                }
                stack.pop();
            }
        }
    };

    this.getMsg = () => msg;
};

RGTest.elemString = function(elem, depth = 5) {
    const objToStr = new RGTest.ObjToString();
    objToStr.toString(elem, depth);
    return objToStr.getMsg();
};

/* Adds object toAdd on top (to same cell) as locObj. */
RGTest.addOnTop = function(toAdd, locObj) {
    const [x, y] = [locObj.getX(), locObj.getY()];
    if (toAdd.getLevel().getID() === locObj.getLevel().getID()) {
        RGTest.moveEntityTo(toAdd, x, y);
    }
    else {
        RG.err('RGTest', 'addOnTop',
            'Does not work on objects on different levels yet');
    }
};

RGTest.createTestArea = function(conf = {}) {
    const usedConf = Object.assign(conf, RGTest.AreaConf);
    const factWorld = new FactoryWorld();
    return factWorld.createArea(usedConf);
};

RGTest.createTestWorld = function(conf = {}) {
    const usedConf = Object.assign(conf, RGTest.WorldConf);
    const factWorld = new FactoryWorld();
    return factWorld.createWorld(usedConf);
};

RGTest.createPlayer = function(items = [], equip = []) {
    const player = new SentientActor('player');
    player.setIsPlayer(true);
	FactoryItem.addItemsToActor(player, items);
	FactoryItem.equipItemsToActor(player, equip);
    return player;
};

/* Can be used to create new game with some args. */
RGTest.createGame = function(args) {
    const game = new GameMain();
    if (args.place) {
        game.addPlace(args.place);
    }
    if (args.player) {
        game.addPlayer(args.player);
    }
    return game;
};


RGTest.AreaConf = {
    name: 'TestArea', maxX: 2, maxY: 2,
    nCities: 1, nDungeons: 1,
    city: [
        {x: 0, y: 0, name: 'testCity', nQuarters: 1,
            constraint: {
                shop: [{op: 'gt', prop: 'value', value: 50}]
            },
            quarter: [{
                name: 'TestQuarter', nLevels: 1, entranceLevel: 0,
                nShops: 1
            }]
        }
    ],
    dungeon: [
        {x: 0, y: 0, name: 'testDungeon', nBranches: 1,
            dungeonType: 'dungeon', dungeonX: 100, dungeonY: 50,
            branch: [{name: 'B1', nLevels: 1, entranceLevel: 0}]
        }
    ]
};

RGTest.WorldConf = {
    name: 'TestWorld',
    nAreas: 1,
    area: [RGTest.AreaConf]
};
