
/* This is a test file for debug game, which can be also played
 * quickly in the browser. */

const expect = require('chai').expect;
const RG = require('../../../client/src/battles');
const Keys = require('../../../client/src/keymap');
const fs = require('fs');

const RNG = RG.Random.getRNG();
const ROT = require('../../../lib/rot');

const restKey = {code: Keys.KEY.REST};

const CompMonitor = function() {
    this.hasNotify = true;
    this.wantID = -1;
    this.wantComp = '';
    this.numEvents = 0;

    const compTypes = Object.keys(RG.Component);
    console.log('Listen compTypes', compTypes);
    compTypes.forEach(type => {
        RG.POOL.listenEvent(type, this);
    });

    this.notify = function(evtName, args) {
        const {entity, add} = args;
        ++this.numEvents;
        if (evtName === 'Health') {
            if (!add) {
                console.log('rm Health from ', entity);
            }
        }
    };

    this.report = function() {
        console.log('CompMonitor caught', this.numEvents, 'events');
    };

};

describe('Debug game simulation with player and actors', function() {
    this.timeout(15000);

    it('should execute without throwing', () => {
        RNG.setSeed(0);
        ROT.RNG.setSeed(0);
        const monitor = new CompMonitor();
        const gameConf = {
            cols: 60,
            rows: 30,
            levels: 2,

            playerLevel: 'Medium',
            levelSize: 'Medium',
            playerClass: RG.ACTOR_CLASSES[0],
            playerRace: RG.ACTOR_RACES[0],

            sqrPerActor: 120,
            sqrPerItem: 120,
            playMode: 'Arena',
            loadedPlayer: null,
            loadedLevel: null,
            playerName: 'Player'
        };
        const gameFact = new RG.Factory.Game();
        let game = gameFact.createNewGame(gameConf);

        // Simulate 1st serialisation in worker thread
        let gameJSON = game.toJSON();
        let fromJSON = new RG.Game.FromJSON();
        game = fromJSON.createGame(gameJSON);

        // Used with expect() later
        const saveFunc = () => {
            fromJSON = new RG.Game.FromJSON();
            gameJSON = game.toJSON();
            game = fromJSON.createGame(gameJSON);
        };

        const components = game.getComponents();
        components.forEach(id => {
            expect(id, 'ID must not exceed ID count').to.be.below(
                RG.Component.idCount);
        });
        // console.log(components);
        // console.log('ID count: ' + RG.Component.idCount);
        const index = components.indexOf(RG.Component.idCount);
        expect(index, 'No duplicate found').to.equal(-1);

        const updateFunc = () => {
            game.update(restKey);
        };

        const simulSpellOn1stTurn = () => {
            game.update({code: Keys.KEY.POWER});
            game.update({code: Keys.VK_h});
        };
        // expect(simulSpellOn1stTurn).not.to.throw(Error);

        const timeStart = new Date().getTime();
        const numTurns = 1000;
        for (let i = 0; i < numTurns; i++) {
            // expect(updateFunc).not.to.throw(Error);
            updateFunc();

            if (i === 10) {
                expect(simulSpellOn1stTurn).not.to.throw(Error);
            }
            if (i % 5000 === 0 && i > 0) {
                console.log(`Saving game after ${i}/${numTurns} turns`);
                expect(saveFunc).not.to.throw(Error);
                // saveFunc();
            }
            console.log('Finished turn ' + i);
        }
        const timeEnd = new Date().getTime();
        const dur = timeEnd - timeStart;
        console.log('Execution took ' + dur + ' ms');

        const fps = numTurns / (dur / 1000);
        console.log('FPS: ' + fps);

        fromJSON = new RG.Game.FromJSON();
        gameJSON = game.toJSON();
        fs.writeFileSync('results/debug-game.json',
            JSON.stringify(gameJSON));

        monitor.report();
    });
});
