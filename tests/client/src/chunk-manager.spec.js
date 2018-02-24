
import { expect } from 'chai';

import ChunkManager, {LOAD, CREATE} from '../../../client/src/chunk-manager';

const RG = require('../../../client/src/battles');
RG.World = require('../../../client/src/world');

describe('ChunkManager', () => {

    it('stores the state of world area/chunks ', () => {
        const game = new RG.Game.Main();
        const area = new RG.World.Area('north', 4, 4, 100, 100);
        game.addPlace(area);
        expect(game.getLevels().length).to.equal(16);
        const manager = new ChunkManager(game, area);
        expect(manager.getCreateState(0, 0)).to.equal(CREATE.CREATED);
        manager.serializeArea();
        expect(game.getLevels().length).to.equal(0);
        expect(manager.getCreateState(0, 0)).to.equal(CREATE.CREATED);
        expect(manager.getLoadState(0, 0)).to.equal(LOAD.JSON);

        manager.setPlayerTile(0, 0);
        expect(manager.getLoadState(0, 0)).to.equal(LOAD.LOADED);
        expect(manager.getLoadState(0, 1)).to.equal(LOAD.LOADED);
        expect(manager.getLoadState(1, 0)).to.equal(LOAD.LOADED);
        expect(manager.getLoadState(1, 1)).to.equal(LOAD.LOADED);

        expect(game.getLevels().length).to.equal(4);
    });
});
