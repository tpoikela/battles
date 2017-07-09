
const expect = require('chai').expect;
const Screen = require('../../../client/gui/screen');
const RG = require('../../../client/src/battles');

const wallChar = '#';
const wallClass = 'cell-element-wall';

describe('GUI.Screen', () => {
    it('', () => {
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
});
