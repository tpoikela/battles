
import {expect} from 'chai';
import RG from '../../../client/src/rg';
import {Screen, ScreenBuffered} from '../../../client/gui/screen';

import {Objects} from '../../../client/data/battles_objects';
import {Effects} from '../../../client/data/effects';
import {ObjectShell} from '../../../client/src/objectshellparser';
import {FactoryLevel} from '../../../client/src/factory.level';
import {SentientActor} from '../../../client/src/actor';
import {ElementWall} from '../../../client/src/element';
import {CellMap} from '../../../client/src/map';


const floorChar = '.';
const wallChar = '#';
const wallClass = 'cell-element-wall';
const floorClass = 'cell-element-floor';

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

        // screen.printRenderedChars();

        const chars = screen.getCharRows();
        const classes = screen.getClassRows();

        chars[1].forEach((cell, y) => {
            if (y > 1 && y < 9) {
                expect(cell, `Cell [0]${y} is floor`).to.equal(floorChar);
            }
        });
        chars[9].forEach((cell, y) => {
            if (y > 0 && y < 9) {
                expect(cell, `Cell [9]${y} is wall`).to.equal(wallChar);
            }
        });

        classes[1].forEach((cell, y) => {
            if (y > 1 && y < 9) {
                expect(cell).to.equal(floorClass);
            }
        });
        classes[9].forEach((cell, y) => {
            if (y > 1 && y < 9) {
                expect(cell).to.equal(wallClass);
            }
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
        // screen.printRenderedChars();

        const chars = screen.getCharRows();
        const classes = screen.getClassRows();

        const charRow1 = [[1, '#'], [1, '@'], [5, '.'], [14, 'X']];

        const firstRowLen = 4; // was 2
        expect(chars[0]).to.have.length(firstRowLen);
        expect(classes[0]).to.have.length(firstRowLen);

        expect(chars[1]).to.have.length(4);
        expect(chars[1]).to.deep.equal(charRow1);
        expect(classes[1]).to.have.length(4);

    });

    it('can render a full map without player', () => {
        const level = factLevel.createLevel('arena', 10, 10);
        const map = level.getMap();
        const screen = new Screen(5, 5);
        map._optimizeForRowAccess();
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

        map._optimizeForRowAccess();
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
        map._optimizeForRowAccess();

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
                expect(typeof chars[y][x][0] === 'number').to.equal(true);
                expect(typeof chars[y][x][1] === 'string').to.equal(true);
                expect(typeof classes[y][x][0] === 'number').to.equal(true);
                expect(typeof classes[y][x][1] === 'string').to.equal(true);
            }
        }

    });
});

describe('ScreenBuffered', () => {
    it('stores an initial buffer of cells before render', () => {
        const levelX = 50;
        const levelY = 40;
        const screen = new ScreenBuffered(levelX, levelY);
        const factLevel = new FactoryLevel();
        const level = factLevel.createLevel('arena', levelX, levelY);
        const player = new SentientActor('player');

        player.setIsPlayer(true);
        level.addActor(player, 15, 25);
        const map: CellMap = level.getMap();
        map._optimizeForRowAccess();

        const visible = map.getCells(c => c.getX() > 10 && c.getX() < 20 &&
             c.getY() > 20 && c.getY() < 30);
        screen.renderWithRLE(player.getX(), player.getY(), map, visible);

        const chars: string[][] = screen.getCharRows();
        const classes: string[][] = screen.getClassRows();

        for (let y = 1; y < levelY - 1; y++) {
            for (let x = 0; x < chars[y].length; x++) {
                expect(typeof chars[y][x][0] === 'number').to.equal(true);
                expect(typeof chars[y][x][1] === 'string').to.equal(true);
                expect(typeof classes[y][x][0] === 'number').to.equal(true);
                expect(typeof classes[y][x][1] === 'string').to.equal(true);
            }
        }
    });
});
