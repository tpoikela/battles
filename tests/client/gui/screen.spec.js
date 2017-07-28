
const expect = require('chai').expect;
const Screen = require('../../../client/gui/screen');
const RG = require('../../../client/src/battles');

const wallChar = '#';
const wallClass = 'cell-element-wall';

describe('GUI.Screen', () => {
    it('Returns ASCII chars and CSS classes for the level', () => {
        const level = RG.FACT.createLevel('arena', 10, 10);
        const map = level.getMap();
        const screen = new Screen(10, 10);
        const actor = new RG.Actor.Rogue('rogue');
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
        const level = RG.FACT.createLevel('arena', 40, 40);
        const map = level.getMap();
        const screen = new Screen(20, 20);
        screen.setViewportXY(5, 5);
        const actor = new RG.Actor.Rogue('rogue');
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

    it('can render a full map without player', () => {
        const level = RG.FACT.createLevel('arena', 10, 10);
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

        const level = RG.FACT.createLevel('arena', 5, 5);
        const map = level.getMap();
        const screen = new Screen(5, 5);

        map.setBaseElemXY(2, 2, RG.WALL_ELEM);

        map._optimizeForRowAccess(map);
        screen.renderFullMapWithRLE(map);

        const chars = screen.getCharRows();
        const classes = screen.getClassRows();
        expect(chars[0]).to.have.length(1);
        expect(classes[0]).to.have.length(1);

        console.log(JSON.stringify(chars[1]));
        expect(chars[1]).to.have.length(3);
        expect(classes[1]).to.have.length(3);

        expect(chars[2]).to.have.length(5);
        expect(classes[2]).to.have.length(5);

        expect(chars[2][2][1]).to.equal('#');
        expect(classes[2][2][1]).to.equal('cell-element-wall');
    });
});
