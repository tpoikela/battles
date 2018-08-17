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


const globalParser = new RG.ObjectShell.Parser();
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


describe('Game.Main', () => {
    let game = null;
    beforeEach( () => {
        game = new Game.Main();
    });

    it('Initializes the game and adds player', () => {
        const movSystem = new RG.System.Movement(['Movement']);
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
        expect(explCells.length).to.equal(145);
    });

    it('can add player to the specified location', () => {
        const fact = new RG.Factory.World();
        const worldConf = {
            name: 'StartPlace',
            nAreas: 1, area: [{name: 'a1', maxX: 2, maxY: 2}]
        };
        const world = fact.createWorld(worldConf);
        const game = new RG.Game.Main();
        game.addPlace(world);
        expect(game.getLevels()).to.have.length(4);

        const player = new RG.Actor.Rogue('PlayerHero');
        player.setIsPlayer(true);
        game.addPlayer(player, {place: 'StartPlace', x: 1, y: 1});

        const playerLevelID = player.getLevel().getID();
        const area = world.getAreas()[0];
        const expectedLevelID = area.getTileXY(1, 1).getLevel().getID();
        expect(playerLevelID).to.equal(expectedLevelID);
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

describe('How combat should evolve', () => {


    it('Deals damage from attacker to defender', () => {
        const comSystem = new RG.System.Attack(['Attack']);
        const dmgSystem = new RG.System.Damage(['Damage']);

        const cols = 50;
        const rows = 30;
        const level = getNewLevel(cols, rows);

        const attacker = new Actor('Attacker');
        expect(attacker.get('Health').isAlive()).to.equal(true);
        const defender = new Actor('Defender');
        expect(defender.get('Health').isAlive()).to.equal(true);
        attacker.get('Combat').setAttack(10);
        attacker.get('Combat').setDamageDie('1d4');
        defender.get('Health').setHP(1);
        defender.get('Combat').setDefense(0);
        defender.get('Combat').setProtection(0);
        defender.get('Stats').setAgility(0);

        level.addActor(attacker, 1, 1);
        level.addActor(defender, 2, 2);

        const attackComp = new RG.Component.Attack({target: defender});
        attacker.add('Attack', attackComp);
        comSystem.update();
        expect(defender.has('Damage')).to.equal(true);
        dmgSystem.update();
        expect(attacker.has('Attack')).to.equal(false);
        expect(defender.has('Damage')).to.equal(false);

        expect(defender.get('Health').isAlive()).to.equal(false);

        const def2 = new Actor('defender2');
        level.addActor(def2, 2, 2);

        const attComp2 = new RG.Component.Attack({target: def2});
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


describe('How AI brain works', () => {

    let level = null;
    let mons1 = null;
    let player = null;


    beforeEach(() => {
        const cols = 30;
        const rows = 20;
        level = getNewLevel(cols, rows);
        mons1 = new Actor('Monster');
        player = new Actor('Player');
        player.setIsPlayer(true);
        mons1.addEnemy(player);
    });

    it('Brain should find player cell', () => {
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


    it('Moves towards player when seen.', () => {
        const movSystem = new RG.System.Movement(['Movement']);
        expect(level.addActor(player, 2, 2)).to.equal(true);
        expect(level.addActor(mons1, 2, 4)).to.equal(true);
        const action = mons1.nextAction();
        action.doAction();
        movSystem.update();
        checkXY(mons1, 2, 3);
    });

});

describe('How poison item is used, and experience propagates', () => {
    it('Kills an actor after some time', () => {

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
        expect(count, 'Victim dies in 100 turns').to.be.below(100);
        expect(victim.get('Health', 'Victim is dead').isAlive()).to.be.false;

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
        game.simulateGame();
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

describe('Game.WinCondition', () => {
    it('description', () => {
        const winCond = new RG.Game.WinCondition('Kill boss');
        expect(winCond.isTrue(), 'Win condition false').to.be.false;

        const boss = new RG.Actor.Rogue('Huge evil boss');
        winCond.addActorKilled(boss);
        RG.POOL.emitEvent(RG.EVT_ACTOR_KILLED, {actor: boss});
        expect(winCond.isTrue(), 'Win condition true now').to.be.true;

    });
});
