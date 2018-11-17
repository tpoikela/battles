
import RG from '../src/rg';
import {Factory} from '../src/factory';
import {FactoryGame} from '../src/factory.game';
import {verifySaveData} from '../src/verify';

module.exports = function(self) {
    function progress(msg) {
        self.postMessage({progress: msg});
    }

    self.addEventListener('message', function(e) {
        const gameConf = e.data[0];
        // gameConf.progressCallback = progress;
        const gameFactory = new RG.Factory.Game();
        gameFactory.setCallback('progress', progress);
        const game = gameFactory.createNewGame(gameConf);

        const json = game.toJSON();
        verifySaveData(json);
        self.postMessage(JSON.stringify(json));
    });
};

