
import { expect } from 'chai';
import Capital from '../../../client/data/capital';

const RG = require('../../../client/src/battles');

describe('Capital', () => {
    /*
    it('can be created without errors', () => {
        const capitalLevel = new Capital(100, 300).getLevel();
        expect(capitalLevel).to.exist;
    });
    */

    it('can be simulated without errors', () => {
        const capitalLevel = new Capital(100, 300).getLevel();
        const game = new RG.Game.Main();
        game.addActiveLevel(capitalLevel);
        for (let i = 0; i < 100; i++) {
            game.simulateGame();
            //expect(() => {game.simulateGame();}).not.to.throw();
        }
    });
});
