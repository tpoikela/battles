/* Unit tests for System.Movement. */

import chai from 'chai';
import {RGTest} from '../../roguetest';
import {chaiBattles} from '../../helpers/chai-battles';

import {SentientActor } from '../../../client/src/actor';
import {System} from '../../../client/src/system';
import {FactoryLevel} from '../../../client/src/factory.level';
import {FactoryActor} from '../../../client/src/factory.actors';
import {Level} from '../../../client/src/level';
import {MapGenerator} from '../../../client/src/generator';
import * as Element from '../../../client/src/element';
import * as Component from '../../../client/src/component';

const Stairs = Element.ElementStairs;
const factLevel = new FactoryLevel();
const Factory = new FactoryLevel();

const expect = chai.expect;
chai.use(chaiBattles);

/* Updates given systems in given order.*/
const updateSystems = RGTest.updateSystems;

describe('System.Movement', () => {
    it('handles actor movement', () => {
        const movSystem = new System.Movement(['Movement']);
        const player = new SentientActor('player name');
        player.setIsPlayer(true);
        const level = factLevel.createLevel('arena', 20, 20);
        level.addActor(player, 1, 1);

        const expElem = new Element.ElementExploration();
        expElem.setExp(100);
        level.addElement(expElem, 2, 2);
        const movComp = new Component.Movement(2, 2, level);
        player.add(movComp);

        expect(level.getElements()).to.have.length(1);
        updateSystems([movSystem]);

        expect(player).to.have.component('ExpPoints');
        expect(level.getElements()).to.have.length(0);
    });

    it('Moves but is blocked by walls.', () => {
        const movSystem = new System.Movement(['Movement']);
        const actor = new SentientActor('TestActor');
        const level = new Level();
        const mapgen = new MapGenerator();
        mapgen.setGen('arena', 10, 10);
        const mapObj = mapgen.getMap();
        level.setMap(mapObj.map);
        level.addActor(actor, 1, 2);
        expect(actor.getX()).to.equal(1);
        expect(actor.getY()).to.equal(2);

        // Actors x,y changes due to move
        const movComp = new Component.Movement(2, 3, level);
        actor.add(movComp);
        movSystem.update();
        expect(actor.getX()).to.equal(2);
        expect(actor.getY()).to.equal(3);

        // Create a wall to block the passage
        const wall = new Element.ElementWall('wall');
        level.getMap().setBaseElemXY(4, 4, wall);
        movSystem.update();
        expect(actor.getX(), 'X did not change due to wall').to.equal(2);
        expect(actor.getY()).to.equal(3);

    });

    it('Moves actors between levels using stairs', () => {
        const movSystem = new System.Movement(['Movement']);
        const level1 = Factory.createLevel('arena', 20, 20);
        const level2 = Factory.createLevel('arena', 20, 20);

        const factActor = new FactoryActor();
        const player = factActor.createPlayer('Player', {});

        const stairs1 = new Stairs('stairsDown', level1, level2);
        const stairs2 = new Stairs('stairsUp', level2, level1);
        stairs1.setTargetStairs(stairs2);
        stairs2.setTargetStairs(stairs1);

        level1.addActor(player, 2, 2);
        expect(player.getLevel()).to.equal(level1);

        const map1 = level1.getMap();
        const map2 = level2.getMap();
        expect(map1.getCell(2, 2).hasPropType('connection')).to.equal(false);
        expect(map2.getCell(10, 10).hasPropType('connection')).to.equal(false);

        // Now add stairs and check they exist in the cells
        level1.addStairs(stairs1, 2, 2);
        level2.addStairs(stairs2, 10, 10);

        const cell22 = map1.getCell(2, 2);
        expect(cell22.hasStairs()).to.equal(true);
        expect(cell22.hasConnection()).to.equal(true);
        expect(cell22.hasPassage()).to.equal(false);
        expect(cell22.hasPropType('connection')).to.equal(true);
        expect(map2.getCell(10, 10).hasPropType('connection')).to.equal(true);

        const refStairs1 = level1.getMap().getCell(2, 2).getStairs();
        expect(refStairs1).to.equal(stairs1);

        const refStairs2 = level2.getMap().getCell(10, 10).getStairs();
        expect(refStairs2).to.equal(stairs2);

        expect(player.getX()).to.equal(2);
        expect(player.getY()).to.equal(2);
        level1.useStairs(player);
        expect(player.getLevel()).to.equal(level2);
        expect(player.getX()).to.equal(10);
        expect(player.getY()).to.equal(10);

        // Return to prev level
        level2.useStairs(player);
        expect(player.getLevel()).to.equal(level1);
        expect(player.getX()).to.equal(2);
        expect(player.getY()).to.equal(2);
        level1.useStairs(player);

        // Check level with two stairs to different levels
        const level3 = Factory.createLevel('arena', 30, 30);
        const stairsDown23 = new Stairs('stairsDown', level2, level3);
        const stairsUp32 = new Stairs('stairsUp', level2, level3);
        level2.addStairs(stairsDown23, 12, 13);
        level3.addStairs(stairsUp32, 6, 7);
        stairsDown23.setTargetStairs(stairsUp32);
        stairsUp32.setTargetStairs(stairsDown23);

        const movComp = new Component.Movement(12, 13, level2);
        player.add(movComp);
        movSystem.update();
        level2.useStairs(player);
        expect(player.getLevel()).to.equal(level3);
        expect(player.getX()).to.equal(6);
        expect(player.getY()).to.equal(7);

        for (let i = 0; i < 10; i++) {
            level3.useStairs(player);
            level2.useStairs(player);
        }
    });
});
