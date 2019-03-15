
require('../../helpers/browser');

import {expect} from 'chai';
import {GameManager} from '../../../client/browser/game-manager';

describe('GameManager', () => {
    it('manages starting the game', () => {
        let numUpdates = 0;
        const updateFunc = () => {++numUpdates;};
        const gm = new GameManager(updateFunc);

        gm.enableKeys();
        let ok = false;
        gm.createNewGame(() => {
            ok = true;
        });
        expect(ok).to.equal(true);
    });
});

