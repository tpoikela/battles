
import { expect } from 'chai';
import * as RG from '../../../client/src/battles';
import {Capital} from '../../../client/data/capital';

describe('Capital', () => {

    it('can be simulated without errors', () => {
        const capitalLevel = new Capital(100, 300).getLevel();
        expect(capitalLevel).to.not.be.empty;

        const game = new RG.GameMain();
        game.addActiveLevel(capitalLevel);
        for (let i = 0; i < 100; i++) {
            expect(() => {game.simulateGame();}).not.to.throw();
        }
    });
});
