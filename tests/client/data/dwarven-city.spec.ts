

import { expect } from 'chai';
import * as RG from '../../../client/src/battles';
import {DwarvenCity} from '../../../client/data/dwarven-city';

describe('DwarvenCity', () => {

    it('can be simulated without errors', () => {
        const cols = 260;
        const rows = 250;
        const fortLevel = new DwarvenCity(cols, rows).getLevel();
        expect(fortLevel.getMap().cols).to.equal(cols);
        expect(fortLevel.getMap().rows).to.equal(rows);

        // fortLevel.debugPrintInASCII();
        const game = new RG.GameMain();
        game.addActiveLevel(fortLevel);

        expect(() => {game.simulateGame(1000);}).not.to.throw();

        const actors = fortLevel.getActors();
        expect(actors.length).to.be.above(200 + 100 + 50 + 25);
        const keepers = actors.filter(a => /shopkeeper/.test(a.getName()));
        expect(keepers).to.have.length.above(0);

        keepers.forEach(keeper => {
            const brain = keeper.getBrain();
            const goal = brain.getGoal();
            const shopEval = goal.getEvaluator('Shopkeeper');
            if (shopEval) {
                const {x, y} = shopEval;
                const shopCell = fortLevel.getMap().getCell(x, y);
                expect(shopCell.hasShop(), `ShopCell at ${x},${y}`).to.equal(true);
            }
            else {
                expect(!!shopEval).to.equal(true);
            }
        });
    });
});
