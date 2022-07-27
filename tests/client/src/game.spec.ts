/**
 * Unit tests for checking that a full game works. It's tedious to repeat very
 * long sequence with GUI, but this module makes sure that basics are working.
 */

import chai from 'chai';
import {chaiBattles} from '../../helpers/chai-battles';
import RG from '../../../client/src/rg';
import {Keys} from '../../../client/src/keymap';
import {RGTest} from '../../roguetest';
import {GameMain} from '../../../client/src/game';
import {WinCondition} from '../../../client/src/win-condition';
import {ObjectShell} from '../../../client/src/objectshellparser';
import {FactoryLevel} from '../../../client/src/factory.level';
import {FactoryWorld} from '../../../client/src/factory.world';
import {SentientActor} from '../../../client/src/actor';
import {System} from '../../../client/src/system';
import {EventPool} from '../../../client/src/eventpool';
import * as Component from '../../../client/src/component';
import * as Brain from '../../../client/src/brain';
import {Entity} from '../../../client/src/entity';

const checkXY = RGTest.checkActorXY;
const Actor = SentientActor;
const POOL = EventPool.getPool();

const expect = chai.expect;
chai.use(chaiBattles);

import {Objects} from '../../../client/data/battles_objects';
import {Effects} from '../../../client/data/effects';

const globalParser = new ObjectShell.Parser();
globalParser.parseShellData(Effects);
globalParser.parseShellData(Objects);

function checkMap(map, cols, rows) {
    for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
            // console.log("x :: " + x);
            expect(typeof map.getCell(x, y)).not.to.equal('undefined');
        }
    }
}

function getNewLevel(cols, rows) {
    const factLevel = new FactoryLevel();
    return factLevel.createLevel('arena', cols, rows);
}

describe('Game.Main', () => {
    let game = null;
    beforeEach( () => {
        game = new GameMain();
    });

    it('Initializes the game and adds player', () => {
        const pool = Entity.getPool();
        const movSystem = new System.Movement(['Movement'], pool);
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

        const npc = new SentientActor('npc');
        level.addActor(npc, 2, 2);

        const newMap = level.getMap();
        checkMap(newMap, cols, rows);

        const movComp = new Component.Movement(12, 13, level);
        actor.add(movComp);
        movSystem.update();
        expect(actor.getX()).to.equal(12);
        expect(actor.getY()).to.equal(13);

        const explCells = level.exploreCells(actor);
        expect(explCells.length).to.equal(109);

        const dmgComp = new Component.Damage(100, 'slash');
        dmgComp.setSource(npc);
        actor.add(dmgComp);
        game.update({code: Keys.KEY.REST});
    });

    it('can add player to the specified location', () => {
        const fact = new FactoryWorld();
        const worldConf = {
            name: 'StartPlace',
            nAreas: 1, area: [{name: 'a1', maxX: 2, maxY: 2}]
        };
        const world = fact.createWorld(worldConf);
        game = new GameMain();
        game.addPlace(world);
        expect(game.getLevels()).to.have.length(4);

        const player = new SentientActor('PlayerHero');
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
    POOL.listenEvent(RG.EVT_ACTOR_KILLED, this);
};

describe('How combat should evolve', () => {


    it('Deals damage from attacker to defender', () => {
        const pool = Entity.getPool();
        const comSystem = new System.Attack(['Attack'], pool);
        const dmgSystem = new System.Damage(['Damage'], pool);

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

        const attackComp = new Component.Attack({target: defender});
        attacker.add(attackComp);
        comSystem.update();
        expect(defender.has('Damage')).to.equal(true);
        dmgSystem.update();
        expect(attacker.has('Attack')).to.equal(false);
        expect(defender.has('Damage')).to.equal(false);

        expect(defender.get('Health').isAlive()).to.equal(false);

        const def2 = new Actor('defender2');
        level.addActor(def2, 2, 2);

        const attComp2 = new Component.Attack({target: def2});
        attacker.add(attComp2);

        def2.get('Health').setHP(20);
        def2.get('Combat').setDefense(0);
        def2.get('Stats').setAgility(0);
        expect(def2.get('Health').isAlive()).to.equal(true);

        comSystem.update();
        expect(def2).to.have.component('Damage');
        dmgSystem.update();
        expect(def2).not.to.have.component('Damage');

        expect(def2.get('Health').getHP() < 20).to.equal(true);
        expect(def2.get('Health').isAlive()).to.equal(true);

        attacker.add(attComp2);
        comSystem.update();
        dmgSystem.update();

        expect(def2.get('Health').isAlive()).to.equal(true);

        const killListen = new KillListener(def2);
        let watchdog = 100;
        while (killListen.isAlive) {
            attacker.add(attComp2);
            comSystem.update();
            dmgSystem.update();
            if (--watchdog === 0) {break;}
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
        mons1.setBrain(new Brain.BrainGoalOriented(mons1));
        player = new Actor('Player');
        player.setIsPlayer(true);
        mons1.addEnemy(player);
    });

    it('Brain should find player cell', () => {
        expect(level.addActor(player, 2, 2)).to.equal(true);
        expect(level.addActor(mons1, 3, 5)).to.equal(true);

        const map = level.getMap();
        expect(map.isPassable(2, 3, 2, 2)).to.equal(true);

        const brain = mons1.getBrain();
        const seenCells = level.getMap().getCellsInFOV(mons1);
        expect(seenCells.length).to.not.equal(0);
        const playerCell = brain.findEnemyCell(seenCells);
        expect(playerCell.hasProp('actors')).to.equal(true);

        const pathCells = brain.getShortestPathTo(playerCell);
        expect(pathCells).to.be.an('array');
        expect(pathCells.length).to.not.equal(0);
    });


    it('Moves towards player when seen.', () => {
        const pool = Entity.getPool();
        const movSystem = new System.Movement(['Movement'], pool);
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

        const game = new GameMain();
        const factLevel = new FactoryLevel();
        const level = factLevel.createLevel('arena', 20, 20);
        const assassin = new Actor('assassin');
        assassin.setBrain(new Brain.BrainGoalOriented(assassin));
        const poison = globalParser.createActualObj('items',
            'Potion of frost poison');
        assassin.getInvEq().addItem(poison);

        const victim = new Actor('victim');
        victim.get('Health').setHP(5);

        level.addActor(assassin, 3, 5);
        level.addActor(victim, 6, 6);
        poison.useItem({target: level.getMap().getCell(6, 6)});

        game.addLevel(level);
        game.addActiveLevel(level);

        const startExp = assassin.get('Experience').getExp();
        let count = 0;
        while (victim.get('Health').isAlive() && count < 100) {
            game.simulateGame(1);
            ++count;
        }
        expect(count, 'Victim dies in 100 turns').to.be.below(100);
        expect(victim.get('Health').isAlive(), 'Victim is dead').to.equal(false);

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

        const poisonUsed = assassin.getInvEq().getItemsNamed('Potion of frost poison');
        expect(poisonUsed).to.have.length(1);
        expect(poisonUsed[0].useItem({target: poisonTarget})).to.equal(true);
        game.simulateGame(1);
        expect(curedVictim.has('Expiration')).to.equal(true);
        expect(curedVictim.has('Poison')).to.equal(true);

        curedVictim.getInvEq().addItem(curePoison);
        game.simulateGame(1);

        const cureTarget = level.getMap().getCell(4, 4);
        expect(curePoison.useItem({target: cureTarget})).to.equal(true);
        expect(curedVictim.has('Poison')).to.equal(false);
        expect(curedVictim.get('Health').isAlive()).to.equal(true);
        for (let i = 0; i < 20; i++) {
            game.simulateGame(1);
        }
        expect(curedVictim.has('Expiration')).to.equal(false);


    });
});

describe('WinCondition', () => {
    it('can listen to event and become true', () => {
        const pool = new EventPool();
        const winCond = new WinCondition('Kill boss', pool);
        winCond.setPool(pool);
        expect(winCond.isTrue(), 'Win condition false').to.equal(false);

        const boss = new SentientActor('Huge evil boss');
        winCond.addActorKilled(boss);
        pool.emitEvent(RG.EVT_ACTOR_KILLED, {actor: boss});
        expect(winCond.isTrue(), 'Win condition true now').to.equal(true);

    });
});
