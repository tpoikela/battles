
/* This is a test file for debug game, which can be also played
 * quickly in the browser. */

import { expect } from 'chai';
import * as RG from '../../../client/src/battles';
import {Keys} from '../../../client/src/keymap';
const fs = require('fs');

import {ACTOR_CLASSES} from '../../../client/src/actor-class';

const RNG = RG.Random.getRNG();
const POOL = RG.EventPool.getPool();
const {ACTOR_RACES} = RG.RG;

const restKey = {code: Keys.KEY.REST};

const CompMonitor = function() {
    this.hasNotify = true;
    this.wantID = -1;
    this.wantComp = '';
    this.numEvents = 0;

    const compTypes = Object.keys(RG.Component);
    console.log('Listen compTypes', compTypes);
    compTypes.forEach(type => {
        POOL.listenEvent(type, this);
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
    this.timeout(25000);

    it('should execute without throwing', () => {
        RNG.setSeed(0);
        const monitor = new CompMonitor();
        const gameConf = {
            cols: 60,
            rows: 30,
            levels: 2,

            playerLevel: 'Medium',
            levelSize: 'Medium',
            playerClass: ACTOR_CLASSES[0],
            playerRace: ACTOR_RACES[0],

            sqrPerActor: 120,
            sqrPerItem: 120,
            playMode: 'Arena',
            loadedPlayer: null,
            loadedLevel: null,
            playerName: 'Player'
        };
        const gameFact = new RG.FactoryGame();
        let game = gameFact.createNewGame(gameConf);

        // Simulate 1st serialisation in worker thread
        let gameJSON = game.toJSON();
        let fromJSON = new RG.FromJSON();
        game = new RG.GameMain();
        game = fromJSON.createGame(game, gameJSON);

        // Used with expect() later
        const saveFunc = () => {
            fromJSON = new RG.FromJSON();
            gameJSON = game.toJSON();
            game = new RG.GameMain();
            game = fromJSON.createGame(game, gameJSON);
        };

        const components = game.getComponents();
        const id2Comp = {};
        components.forEach(id => {
            expect(id2Comp, 'No duplicate found').to.not.have.property(id);
            id2Comp[id] = id;
        });
        // const index = components.indexOf(RG.GameObject.ID);
        // expect(index, 'No duplicate found').to.equal(-1);

        const updateFunc = () => {
            game.update(restKey);
        };

        // Should can a spell which does not require target, such as IceShield
        // Check the required key from GUI
        const simulSpellOn1stTurn = () => {
            game.update({code: Keys.KEY.POWER});
            game.update({code: Keys.VK.e});
        };

        const timeStart = new Date().getTime();
        const numTurns = 5000;
        for (let i = 0; i < numTurns; i++) {
            updateFunc();

            if (i === 10) {
                expect(simulSpellOn1stTurn).not.to.throw(Error);
            }
            if (i % 250 === 0 && i > 0) {
                console.log(`Saving game after ${i}/${numTurns} turns`);
                //expect(saveFunc).not.to.throw(Error);
                saveFunc();
            }

            if (i && i % 100 === 0) {
                console.log('Finished turn ' + i);
            }
        }
        const timeEnd = new Date().getTime();
        const dur = timeEnd - timeStart;
        console.log('Execution took ' + dur + ' ms');

        const fps = numTurns / (dur / 1000);
        console.log('FPS: ' + fps);

        fromJSON = new RG.FromJSON();
        gameJSON = game.toJSON();
        fs.writeFileSync('results/debug-game.json',
            JSON.stringify(gameJSON));

        monitor.report();
    });
});
