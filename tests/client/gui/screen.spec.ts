
import {expect} from 'chai';
import RG from '../../../client/src/rg';
import {Screen} from '../../../client/gui/screen';

import {Objects} from '../../../client/data/battles_objects';
import {Effects} from '../../../client/data/effects';
import {ObjectShell} from '../../../client/src/objectshellparser';
import {FactoryLevel} from '../../../client/src/factory.level';
import {SentientActor} from '../../../client/src/actor';
import {ElementWall} from '../../../client/src/element';

const wallChar = '#';
const wallClass = 'cell-element-wall';

describe('GUI.Screen', () => {
    let factLevel = null;

    beforeEach(() => {
        factLevel = new FactoryLevel();
    });

    it('Returns ASCII chars and CSS classes for the level', () => {
        const level = factLevel.createLevel('arena', 10, 10);
        const map = level.getMap();
        const screen = new Screen(10, 10);
        const actor = new SentientActor('rogue');
        actor.setIsPlayer(true);
        actor.setFOVRange(10);
        level.addActor(actor, 1, 1);
        const visibleCells = level.exploreCells(actor);
        screen.render(1, 1, map, visibleCells);

        const chars = screen.getCharRows();
        const classes = screen.getClassRows();

        chars[0].forEach((cell, index) => {
            expect(cell, `Cell ${index} is wall`).to.equal(wallChar);
        });

        classes[0].forEach(cell => {
            expect(cell).to.equal(wallClass);
        });
    });

    it('uses a viewport to show only part of the level', () => {
        const level = factLevel.createLevel('arena', 40, 40);
        const map = level.getMap();
        const screen = new Screen(20, 20);
        screen.setViewportXY(5, 5);
        const actor = new SentientActor('rogue');
        actor.setIsPlayer(true);
        actor.setFOVRange(10);
        level.addActor(actor, 1, 1);
        const visibleCells = level.exploreCells(actor);
        screen.render(1, 1, map, visibleCells);

        const chars = screen.getCharRows();
        const classes = screen.getClassRows();

        expect(chars).to.have.length(11);
        expect(classes).to.have.length(11);

    });

    it('can use viewport combined with RLE during game', () => {
        const level = factLevel.createLevel('arena', 40, 40);
        const map = level.getMap();
        const screen = new Screen(20, 20);
        screen.setViewportXY(10, 10);
        const actor = new SentientActor('rogue');
        actor.setType('player');
        RG.addCharStyle(RG.TYPE_ACTOR, 'player', '@');

        actor.setIsPlayer(true);
        actor.setFOVRange(5);
        level.addActor(actor, 1, 1);
        const visibleCells = level.exploreCells(actor);
        screen.renderWithRLE(1, 1, map, visibleCells);

        const chars = screen.getCharRows();
        const classes = screen.getClassRows();

        const charRow1 = [[1, '#'], [1, '@'], [5, '.'], [14, 'X']];

        expect(chars[0]).to.have.length(2);
        expect(classes[0]).to.have.length(2);
        expect(chars[1]).to.have.length(4);
        expect(chars[1]).to.deep.equal(charRow1);
        expect(classes[1]).to.have.length(4);

    });

    it('can render a full map without player', () => {
        const level = factLevel.createLevel('arena', 10, 10);
        const map = level.getMap();
        const screen = new Screen(5, 5);
        map._optimizeForRowAccess(map);
        screen.renderFullMap(map);

        const chars = screen.getCharRows();
        const classes = screen.getClassRows();
        expect(chars).to.have.length(10);
        expect(classes).to.have.length(10);
    });

    it('can render full map with run-length enc', () => {

        // Test level:
        // ##### RLE: 1, 5x wall
        // #...# RLE: 3, 2x wall, 2x floor, wall
        // #.#.# RLE: 5, wall, floor, wall, floor, wall
        // #...# RLE: 3, wall, 3x floor, wall
        // ##### RLE: 1, 5x wall
        //

        const level = factLevel.createLevel('arena', 5, 5);
        const map = level.getMap();
        const screen = new Screen(5, 5);

        map.setBaseElemXY(2, 2, new ElementWall('wall'));

        map._optimizeForRowAccess(map);
        screen.renderFullMapWithRLE(map);

        const chars = screen.getCharRows();
        const classes = screen.getClassRows();
        expect(chars[0]).to.have.length(1);
        expect(classes[0]).to.have.length(1);

        expect(chars[1]).to.have.length(3);
        expect(classes[1]).to.have.length(3);

        expect(chars[2]).to.have.length(5);
        expect(classes[2]).to.have.length(5);

        expect(chars[2][2][1]).to.equal('#');
        expect(classes[2][2][1]).to.equal('cell-element-wall');
    });

    it('can render full map with actors using RLE correctly', () => {
        const parser = new ObjectShell.Parser();
        parser.parseShellData(Objects);
        parser.parseShellData(Effects);
        const levelX = 100;
        const levelY = 100;
        const level = factLevel.createLevel('arena', levelX, levelY);
        const map = level.getMap();
        const screen = new Screen(100, 100);
        map._optimizeForRowAccess(map);

        // Slap some actors into the level before rendering
        let xPos = 2;
        for (let y = 1; y < levelY - 1; y++) {
            const actor1 = parser.createRandomActor({
                func: (actor) => (actor.type === 'animal')
            });
            const actor2 = parser.createRandomActor({
                func: (actor) => (actor.type === 'animal')
            });
            level.addActor(actor1, xPos, y);
            level.addActor(actor2, xPos + 1, y);
            if (xPos < levelX - 4) {
                ++xPos;
            }
        }

        screen.renderFullMapWithRLE(map);
        const chars = screen.getCharRows();
        const classes = screen.getClassRows();

        for (let y = 1; y < levelY - 1; y++) {
            const msg = `Row ${y} is okay.`;
            expect(chars[y].length, `Char: ${msg}`).to.be.within(5, 6);
            expect(classes[y].length, `Class: ${msg}`).to.be.within(5, 6);
            for (let x = 0; x < chars[y].length; x++) {
                expect(chars[y][x]).not.to.be.empty;
                expect(classes[y][x]).not.to.be.empty;
            }
        }
    });
});
