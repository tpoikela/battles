/**
 * Unit tests for checking that a full game works. It's tedious to repeat very
 * long sequence with GUI, but this module makes sure that basics are working.
 */

const expect = require('chai').expect;
const RG = require('../../../client/src/battles');
const RGTest = require('../../roguetest.js');
const Game = require('../../../client/src/game');

const checkXY = RGTest.checkActorXY;
const Actor = RG.Actor.Rogue;

const RGObjects = require('../../../client/data/battles_objects.js');
RG.Effects = require('../../../client/data/effects.js');

const LocalStorage = require('node-localstorage').LocalStorage,
localStorage = new LocalStorage('./battles_local_storage');

const globalParser = new RG.ObjectShellParser();
globalParser.parseShellData(RG.Effects);
globalParser.parseShellData(RGObjects);

function checkMap(map, cols, rows) {
    for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
            // console.log("x :: " + x);
            expect(typeof map.getCell(x, y)).not.to.equal('undefined');
        }
    }
}

function getNewLevel(cols, rows) {
    return RG.FACT.createLevel('arena', cols, rows);
}

/* Returns a level with initialized with given actors.*/
function getLevelWithNActors(cols, rows, nactors) {
    const level = getNewLevel(cols, rows);
    const actors = [];
    for (let i = 0; i < nactors; i++) {
        const actor = new Actor(false);
        actors.push(actor);
        level.addActorToFreeCell(actor);
    }
    return [level, actors];
}

describe('Game.Main', function() {
    let game = null;
    beforeEach( () => {
        game = new Game.Main();
    });


    it('Initializes the game and adds player', function() {
        const movSystem = new RG.System.Movement('Movement', ['Movement']);
        const cols = 50;
        const rows = 30;
        const level = getNewLevel(cols, rows);

        const actor = new Actor('Player'); // player
        actor.setIsPlayer(true);
        actor.setFOVRange(5);
        game.addLevel(level);
        expect(game.addPlayer(actor)).to.equal(true);

        expect(game.shownLevel()).to.equal(level);
        expect(actor.getLevel()).to.equal(level);

        const newMap = level.getMap();
        checkMap(newMap, cols, rows);

        const movComp = new RG.Component.Movement(12, 13, level);
        actor.add('Movement', movComp);
        movSystem.update();
        expect(actor.getX()).to.equal(12);
        expect(actor.getY()).to.equal(13);

        const explCells = level.exploreCells(actor);
        expect(explCells.length).to.equal(11 * 11);

        // expect(level.moveActorTo(actor, 11, 13)).to.equal(true);

    });
});

/* For listening actor killed events.*/
const KillListener = function(actor) {

    const _actor = actor;

    this.isAlive = actor.get('Health').isAlive();

    this.notify = function(evtName, obj) {
        if (evtName === RG.EVT_ACTOR_KILLED) {
            if (obj.actor === _actor) {
                this.isAlive = false;
            }
        }
    };
    RG.POOL.listenEvent(RG.EVT_ACTOR_KILLED, this);
};

describe('How combat should evolve', function() {


    it('Deals damage from attacker to defender', function() {
        const comSystem = new RG.System.Attack('Attack', ['Attack']);
        const dmgSystem = new RG.System.Damage('Damage', ['Damage']);

        const cols = 50;
        const rows = 30;
        const level = getNewLevel(cols, rows);

        const attacker = new Actor('Attacker');
        expect(attacker.get('Health').isAlive()).to.equal(true);
        const defender = new Actor('Defender');
        expect(defender.get('Health').isAlive()).to.equal(true);
        attacker.get('Combat').setAttack(10);
        attacker.get('Combat').setDamage('1d4');
        defender.get('Health').setHP(1);
        defender.get('Combat').setDefense(0);
        defender.get('Combat').setProtection(0);
        defender.get('Stats').setAgility(0);

        level.addActor(attacker, 1, 1);
        level.addActor(defender, 2, 2);

        const attackComp = new RG.Component.Attack(defender);
        attacker.add('Attack', attackComp);
        comSystem.update();
        expect(defender.has('Damage')).to.equal(true);
        dmgSystem.update();
        expect(attacker.has('Attack')).to.equal(false);
        expect(defender.has('Damage')).to.equal(false);

        expect(defender.get('Health').isAlive()).to.equal(false);

        const def2 = new Actor('defender2');
        level.addActor(def2, 2, 2);

        const attComp2 = new RG.Component.Attack(def2);
        attacker.add('Attack', attComp2);

        def2.get('Health').setHP(20);
        def2.get('Combat').setDefense(0);
        def2.get('Stats').setAgility(0);
        expect(def2.get('Health').isAlive()).to.equal(true);

        comSystem.update();
        expect(def2.has('Damage')).to.equal(true);
        dmgSystem.update();
        expect(def2.has('Damage')).to.equal(false);

        expect(def2.get('Health').getHP() < 20).to.equal(true);

        expect(def2.get('Health').isAlive()).to.equal(true);

        attacker.add('Attack', attComp2);
        comSystem.update();
        dmgSystem.update();

        expect(def2.get('Health').isAlive()).to.equal(true);

        const killListen = new KillListener(def2);
        while (killListen.isAlive) {
            attacker.add('Attack', attComp2);
            comSystem.update();
            dmgSystem.update();
        }
        expect(def2.get('Health').isAlive()).to.equal(false);

    });
});

describe('How AI brain works', function() {
    const cols = 30;
    const rows = 20;
    const level = getNewLevel(cols, rows);
    const mons1 = new Actor('Monster');
    const player = new Actor('Player');
    player.setType('player');
    player.setIsPlayer(true);

    it('Brain should find player cell', function() {
        expect(level.addActor(player, 2, 2)).to.equal(true);
        expect(level.addActor(mons1, 3, 5)).to.equal(true);

        const map = level.getMap();
        expect(map.isPassable(2, 3)).to.equal(true);

        const brain = mons1.getBrain();
        const seenCells = level.getMap().getVisibleCells(mons1);
        expect(seenCells.length).to.not.equal(0);
        const playerCell = brain.findEnemyCell(seenCells);
        expect(playerCell.hasProp('actors')).to.equal(true);

        const pathCells = brain.getShortestPathTo(playerCell);
        expect(pathCells).to.be.an('array');
        expect(pathCells.length).to.not.equal(0);
    });


    it('Moves towards player when seen.', function() {
        const movSystem = new RG.System.Movement('Movement', ['Movement']);
        expect(level.addActor(player, 2, 2)).to.equal(true);
        expect(level.addActor(mons1, 2, 4)).to.equal(true);
        const action = mons1.nextAction();
        action.doAction();
        movSystem.update();
        checkXY(mons1, 2, 3);
    });

});

describe('Game.Save how saving works', function() {

    // TODO add to RGTest
    const setupPlayer = function(name) {
        const level = RG.FACT.createLevel('arena', 10, 10);
        level.setLevelNumber(3);
        const player = new RG.Actor.Rogue(name);
        player.setType('player');
        player.setIsPlayer(true);
        level.addActor(player, 3, 3);
        return player;
    };

    it('Saves/restores player properly', function() {
        const gameSave = new RG.Game.Save();
        gameSave.setStorage(localStorage);
        const player = setupPlayer('Player1');

        player.get('Experience').setExpLevel(5);
        gameSave.savePlayer(player);

        let rest = gameSave.restorePlayer('Player1');
        expect(rest.getName()).to.equal(player.getName());
        expect(rest.get('Experience').getExpLevel()).to.equal(5);

        const playersAsObj = gameSave.getPlayersAsObj();
        expect(playersAsObj.hasOwnProperty('Player1')).to.equal(true);

        const die = rest.get('Combat').getDamageDie();
        expect(die !== null).to.equal(true);
        expect(typeof die !== 'undefined').to.equal(true);
        expect(gameSave.getDungeonLevel()).to.equal(3);

        const playerList = gameSave.getPlayersAsList();
        const playerObj = playerList[0];
        expect(playerObj.hasOwnProperty('name')).to.equal(true);
        expect(playerObj.hasOwnProperty('expLevel')).to.equal(true);
        expect(playerObj.hasOwnProperty('dungeonLevel')).to.equal(true);

    });

    it('Saves/restores inventory properly', function() {
        const gameSave = new RG.Game.Save();
        gameSave.setStorage(localStorage);
        const player = setupPlayer('Player1');
        const invEq = player.getInvEq();

        // Test first with simple food
        const food = new RG.Item.Food('Habanero');
        invEq.addItem(food);

        gameSave.savePlayer(player);
        let rest = gameSave.restorePlayer('Player1');
        let invItems = rest.getInvEq().getInventory().getItems();
        expect(invItems.length).to.equal(1);
        expect(invItems[0].equals(food)).to.equal(true);

        // Create a new weapon
        const weapon = new RG.Item.Weapon('Sword');
        weapon.setAttack(10);
        weapon.setDamage('3d3+5');
        weapon.count = 2;

        // Add it, save player and then restore
        invEq.addItem(weapon);
        gameSave.savePlayer(player);
        rest = gameSave.restorePlayer('Player1');
        invItems = rest.getInvEq().getInventory().getItems();
        expect(invItems.length).to.equal(2);

        const sword = invItems[1];
        expect(sword.equals(weapon)).to.equal(true);
        expect(sword.count).to.equal(2);

        const armour = new RG.Item.Armour('Plate mail');
        armour.setDefense(11);
        invEq.addItem(armour);
        gameSave.savePlayer(player);
        rest = gameSave.restorePlayer('Player1');
        invItems = rest.getInvEq().getInventory().getItems();
        expect(invItems.length).to.equal(3);

        const plateMail = invItems[2];
        expect(armour.equals(plateMail)).to.equal(true);

    });

    it('Saves/restores and equips equipment correctly', function() {
        const gameSave = new RG.Game.Save();
        gameSave.setStorage(localStorage);
        const player = setupPlayer('HeroPlayer');
        const invEq = player.getInvEq();

        const weapon = new RG.Item.Weapon('Sword');
        weapon.setDefense(15);
        weapon.setAttack(1);
        weapon.setWeight(2.5);

        invEq.addItem(weapon);
        expect(invEq.equipItem(weapon)).to.equal(true);

        // Empty spirit gem
        const emptygem = new RG.Item.SpiritGem('Wolf gem');
        invEq.addItem(emptygem);

        const gemWithSpirit = new RG.Item.SpiritGem('Used gem');
        const spirit = new RG.Actor.Spirit('Wolf spirit');
        spirit.get('Stats').setStrength(11);
        gemWithSpirit.setSpirit(spirit);
        invEq.addItem(gemWithSpirit);

        gameSave.savePlayer(player);
        const rest = gameSave.restorePlayer('HeroPlayer');
        const restWeapon = rest.getWeapon();
        expect(restWeapon.equals(weapon)).to.equal(true);

        const inv = rest.getInvEq().getInventory();
        const emptyGemRest = inv.getItems()[0];
        expect(emptyGemRest.equals(emptygem)).to.equal(true);

        const gemWithSpirit2 = inv.getItems()[1];
        const spiritRest = gemWithSpirit2.getSpirit();
        const statsRest = spiritRest.get('Stats');
        const statsOrig = spirit.get('Stats');
        expect(statsRest.getStrength()).to.equal(statsOrig.getStrength());


    });

});

describe('How poison item is used, and experience propagates', function() {
    it('Kills an actor after some time', function() {

        const game = new RG.Game.Main();
        const level = RG.FACT.createLevel('arena', 20, 20);
        const assassin = new Actor('assassin');
        const poison = globalParser.createActualObj('items',
            'Potion of frost poison');
        assassin.getInvEq().addItem(poison);

        const victim = new Actor('victim');
        victim.get('Health').setHP(5);

        level.addActor(assassin, 3, 5);
        level.addActor(victim, 6, 6);
        poison.useItem({target: level.getMap().getCell(6, 6)});

        const startExp = assassin.get('Experience').getExp();

        let count = 0;
        while (victim.get('Health').isAlive() && count < 100) {
            game.simulateGame();
            ++count;
        }
        const endExp = assassin.get('Experience').getExp();
        expect(endExp > startExp, 'Exp. points from poison').to.equal(true);

        const curePoison = globalParser.createActualObj('items',
            'Potion of cure poison');
        const frostPoison = globalParser.createActualObj('items',
            'Potion of frost poison');

        assassin.getInvEq().addItem(frostPoison);
        const curedVictim = new Actor('Cured victim');

        expect(curedVictim.has('Expiration')).to.equal(false);
        expect(curedVictim.has('Poison')).to.equal(false);
        level.addActor(curedVictim, 4, 4);

        const poisonTarget = level.getMap().getCell(4, 4);
        expect(frostPoison.useItem({target: poisonTarget})).to.equal(true);
        expect(curedVictim.has('Expiration')).to.equal(true);
        expect(curedVictim.has('Poison')).to.equal(true);

        curedVictim.getInvEq().addItem(curePoison);
        game.simulateGame();

        const cureTarget = level.getMap().getCell(4, 4);
        expect(curePoison.useItem({target: cureTarget})).to.equal(true);
        expect(curedVictim.has('Poison')).to.equal(false);
        expect(curedVictim.get('Health').isAlive()).to.equal(true);
        for (let i = 0; i < 20; i++) {game.simulateGame();}
        expect(curedVictim.has('Expiration')).to.equal(false);


    });
});

