
import RG from '../src/rg';
import {FactoryGame} from '../src/factory.game';
import {verifySaveData} from '../src/verify';

function progress(msg) {
    postMessage({progress: msg});
}

addEventListener('message', function(e) {
    const gameConf = e.data[0];
    const gameFactory = new FactoryGame();
    gameFactory.setCallback('progress', progress);
    const game = gameFactory.createNewGame(gameConf);

    const json = game.toJSON();
    verifySaveData(json);
    postMessage(JSON.stringify(json));
});
