
import { expect } from 'chai';
import * as RG from '../../../client/src/battles';
import {Capital} from '../../../client/data/capital';

describe('Capital', () => {

    it('can be simulated without errors', () => {
        const capitalLevel = new Capital(100, 300).getLevel();
        expect(capitalLevel.getMap().cols).to.equal(100);
        expect(capitalLevel.getMap().rows).to.equal(300);

        // capitalLevel.debugPrintInASCII();
        const game = new RG.GameMain();
        game.addLevel(capitalLevel);
        game.addActiveLevel(capitalLevel);

        expect(() => {game.simulateGame(1000);}).not.to.throw();

        const actors = capitalLevel.getActors();
        expect(actors.length).to.be.above(200 + 100 + 50 + 25);
        const keepers = actors.filter(a => /shopkeeper/.test(a.getName()));
        expect(keepers).to.have.length.above(0);

        keepers.forEach(keeper => {
            const brain = keeper.getBrain();
            const goal = brain.getGoal();
            const shopEval = goal.getEvaluator('Shopkeeper');
            if (shopEval) {
                const {x, y} = shopEval;
                const shopCell = capitalLevel.getMap().getCell(x, y);
                expect(shopCell.hasShop(), `ShopCell at ${x},${y}`).to.equal(true);
            }
            else {
                expect(!!shopEval).to.equal(true);
            }
        });
    });
});
