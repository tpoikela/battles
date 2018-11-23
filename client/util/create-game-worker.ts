
import {FactoryGame} from '../src/factory.game';
import {verifySaveData} from '../src/verify';

import {CreateGameWorker, GameMessage, MESSAGE_TYPE} from './types';

const ctx: CreateGameWorker = self as any;

function progress(msg) {
    const gameMsg: GameMessage = {
        type: MESSAGE_TYPE.PROGRESS,
        progress: msg
    };
    ctx.postMessage(gameMsg);
}

ctx.addEventListener('message', function(e) {
    try {
        const gameConf = e.data[0];
        const gameFactory = new FactoryGame();
        gameFactory.setCallback('progress', progress);
        const game = gameFactory.createNewGame(gameConf);
        const json = game.toJSON();
        verifySaveData(json);

        const msg: GameMessage = {
            type: MESSAGE_TYPE.READY,
            ready: true,
            data: JSON.stringify(json)
        };
        ctx.postMessage(msg);
    }
    catch (e) {
        const errorMsg: GameMessage = {
            type: MESSAGE_TYPE.ERROR,
            error: e.message
        }
        ctx.postMessage(errorMsg);
    }
});
