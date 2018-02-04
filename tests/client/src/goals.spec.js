
import { expect } from 'chai';

const RGTest = require('../../roguetest');
const RG = require('../../../client/src/battles');
// const Goal = require('../../../client/src/goals');

describe('Goal', () => {
    it('', () => {
        const movSys = new RG.System.Movement(['Movement']);
        const attSys = new RG.System.Attack(['Attack']);
        const dmgSys = new RG.System.Damage(['Damage']);
        const systems = [movSys, attSys, dmgSys];

        const actor = new RG.Actor.Rogue('thinker');
        const enemy = new RG.Actor.Rogue('enemy');
        actor.setBrain(new RG.Brain.GoalOriented(actor));

        actor.addEnemy(enemy);
        enemy.addEnemy(actor);
        const startHP = enemy.get('Health').getHP();
        const level = RGTest.wrapIntoLevel([actor, enemy]);
        RGTest.moveEntityTo(actor, 5, 5);
        RGTest.moveEntityTo(actor, 17, 17);

        let [x, y] = actor.getXY();
        let action = actor.nextAction();
        action.doAction();
        systems.forEach(sys => {sys.update();});

        const [nX, nY] = actor.getXY();
        console.log(`Actor at nX,nY ${nX},${nY}`);

        const coordSame = x === nX && y === nY;
        expect(coordSame).not.to.equal(true);

        RGTest.moveEntityTo(actor, 2, 2);
        RGTest.moveEntityTo(enemy, 5, 5);

        for (let i = 0; i < 5; i++) {
            console.log(`>>> TURN ${i} BEGIN <<<`);
            action = actor.nextAction();
            action.doAction();
            systems.forEach(sys => {sys.update();});
            const [x, y] = actor.getXY();
            console.log(`-> Actor location: ${x},${y}`);
        }
        // RGTest.printScreen(actor);
        const endHP = enemy.get('Health').getHP();
        expect(endHP).to.be.below(startHP);

        [x, y] = actor.getXY();
        expect([x, y]).to.deep.equal([4, 4]);
        actor.get('Health').setHP(5);
        for (let i = 0; i < 1; i++) {
            action = actor.nextAction();
            action.doAction();
            systems.forEach(sys => {sys.update();});
            [x, y] = actor.getXY();
            expect([x, y]).to.deep.equal([3, 3]);
        }

    });
});
