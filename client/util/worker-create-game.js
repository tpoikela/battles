
const RG = require('../src/rg');
RG.Factory = require('../src/factory');
RG.Factory.Game = require('../src/factory.game');

module.exports = function(self) {
    function progress(msg) {
        self.postMessage({progress: msg});
    }

    self.addEventListener('message', function(e) {
        const gameConf = e.data[0];
        gameConf.progressCallback = progress;
        const gameFactory = new RG.Factory.Game();
        const game = gameFactory.createNewGame(gameConf);

        const json = game.toJSON();
        self.postMessage(JSON.stringify(json));
    });
};

