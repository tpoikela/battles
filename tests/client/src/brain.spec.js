
const expect = require('chai').expect;

const RG = require('../../../client/src/battles');
const ROT = require('../../../lib/rot');

const RGTest = require('../../roguetest.js');

const Brain = RG.Brain;

describe('Brain.Player', function() {
    let level = null;
    let player = null;
    let demon = null;
    let human = null;

    beforeEach( () => {
        level = RG.FACT.createLevel('arena', 10, 10);
        player = new RG.Actor.Rogue('Player');
        demon = new RG.Actor.Rogue('Demon');
        human = new RG.Actor.Rogue('Human friend');

        demon.setType('demon');
        demon.setBrain(new RG.Brain.Demon(demon));
        demon.addEnemy(player);

        human.setType('human');
        human.setBrain(new RG.Brain.Human(human));
        player.setIsPlayer(true);
        level.addActor(player, 1, 1);
        level.addActor(demon, 1, 2);
    });

    it('Accepts key commands', function() {
        const brain = new Brain.Player(player);

        brain.decideNextAction({code: ROT.VK_R});
        expect(player.getSpeed()).to.equal(150);
        expect(brain.isRunModeEnabled()).to.equal(true);
        expect(brain.energy).to.equal(0);
        brain.decideNextAction({code: ROT.VK_S});
        expect(brain.isRunModeEnabled()).to.equal(false);
        expect(brain.energy).to.equal(RG.energy.REST);

        brain.decideNextAction({code: ROT.VK_C});
        expect(brain.energy).to.equal(RG.energy.MOVE);

        brain.decideNextAction({code: ROT.VK_X});
        expect(brain.energy).to.equal(RG.energy.ATTACK);

        brain.decideNextAction({code: ROT.VK_R}); // Enable run mode
        brain.decideNextAction({code: ROT.VK_C}); // Move
        expect(brain.energy).to.equal(RG.energy.RUN);

    });

    it('Has cmds for more complex things', function() {
        const brain = new Brain.Player(player);
        brain.decideNextAction({code: ROT.VK_S});
        expect(brain.energy).to.equal(RG.energy.REST);

        // No missile equipped
        brain.decideNextAction({cmd: 'missile'});
        expect(brain.energy).to.equal(0);

        // Equip a missile
        const cell = RG.FACT.createFloorCell();
        RGTest.equipItem(player, new RG.Item.Missile('Arrow'));
        brain.decideNextAction({cmd: 'missile', target: cell});
        expect(brain.energy).to.equal(RG.energy.MISSILE);

        brain.decideNextAction({cmd: 'use', item: {}});
        expect(brain.energy).to.equal(0);
    });

    it('Has different fighting modes', function() {
        const brain = new Brain.Player(player);
        brain.toggleFightMode();

        // var attack = player.getAttack();
        // var speed = player.getSpeed();

        expect(brain.energy).to.equal(1);
        let attackCallback = brain.decideNextAction({code: ROT.VK_X});
        expect(brain.energy).to.equal(RG.energy.ATTACK);
        attackCallback();
        expect(player.get('StatsMods').getSpeed()).to.equal(20);
        expect(player.getSpeed()).to.equal(120);

        brain.toggleFightMode();
        attackCallback = brain.decideNextAction({code: ROT.VK_X});
        attackCallback();
        expect(player.getSpeed()).to.equal(80);
    });

    it('Needs confirm before attacking friends', function() {
        level.addActor(human, 2, 2);
        const brain = new Brain.Player(player);

        brain.decideNextAction({code: RG.K_MOVE_SE});
        expect(brain.energy).to.equal(0);
        brain.decideNextAction({code: RG.K_REST});
        expect(brain.energy).to.equal(0);

        brain.decideNextAction({code: RG.K_MOVE_SE});
        brain.decideNextAction({code: RG.K_YES});
        expect(brain.energy).to.equal(RG.energy.ATTACK);
    });

    it('can toggle between fighting modes', function() {
        const brain = new Brain.Player(player);
        let fightMode = brain.getFightMode();
        expect(fightMode).to.equal(RG.FMODE_NORMAL);
        brain.decideNextAction({code: RG.K_FIGHT});
        fightMode = brain.getFightMode();
        expect(fightMode).to.equal(RG.FMODE_FAST);

        brain.decideNextAction({code: RG.K_FIGHT});
        fightMode = brain.getFightMode();
        expect(fightMode).to.equal(RG.FMODE_SLOW);
        brain.decideNextAction({code: RG.K_FIGHT});
        fightMode = brain.getFightMode();
        expect(fightMode).to.equal(RG.FMODE_NORMAL);
    });

    it('handles picking up of items', function() {
        const brain = new Brain.Player(player);
        const food = new RG.Item.Food('food');
        const weapon = new RG.Item.Weapon('weapon');
        level.addItem(food, 1, 1);
        level.addItem(weapon, 1, 1);
        brain.decideNextAction({code: RG.K_NEXT_ITEM});
        expect(brain.energy).to.equal(0);

        brain.decideNextAction({code: RG.K_PICKUP});
        expect(brain.energy).to.equal(RG.energy.PICKUP);

    });

    it('can have GUI callbacks added to it', function() {
        const cbCode = ROT.VK_ADD;
        let called = false;
        const callback = function(code) {
            called = true;
            return code;
        };
        const brain = new Brain.Player(player);
        brain.addGUICallback(cbCode, callback);

        expect(called).to.be.false;
        brain.decideNextAction({code: cbCode});
        expect(called).to.be.true;
    });
});

describe('RG.Brain.Rogue', function() {
    let level = null;
    let player = null;
    let demon = null;
    let human = null;

    beforeEach( () => {
        level = RG.FACT.createLevel('arena', 10, 10);
        player = new RG.Actor.Rogue('Player');
        demon = new RG.Actor.Rogue('Demon');
        human = new RG.Actor.Rogue('Human friend');

        demon.setType('demon');
        demon.setBrain(new RG.Brain.Demon(demon));
        demon.addEnemy(player);

        human.setType('human');
        human.setBrain(new RG.Brain.Human(human));

        player.setIsPlayer(true);
        level.addActor(player, 1, 1);
        level.addActor(demon, 1, 2);
    });

    it('Has 1st priority for enemies', function() {
        // var brain = demon.getBrain();
        let cells = RG.Brain.getCellsAround(demon);
        expect(cells).to.have.length(9);

        level.addActor(human, 0, 0);
        cells = RG.Brain.getCellsAround(human);
        expect(cells).to.have.length(4);
    });

});
