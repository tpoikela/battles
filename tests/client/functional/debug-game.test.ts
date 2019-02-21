
/* This is a test file for debug game, which can be also played
 * quickly in the browser. */

import { expect } from 'chai';
import * as RG from '../../../client/src/battles';
import ROT from '../../../lib/rot';
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
        ROT.RNG.setSeed(0);
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
            fromJSON = new RG.Game.FromJSON();
            gameJSON = game.toJSON();
            game = fromJSON.createGame(gameJSON);
        };

        const components = game.getComponents();
        components.forEach(id => {
            if (id >= RG.GameObject.ID) {
                console.log('Comp too high ID', components[id]);
            }
            // expect(id, 'ID must not exceed ID count').to.be.below(
                //RG.GameObject.ID);
        });
        const index = components.indexOf(RG.GameObject.ID);
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
        const numTurns = 500;
        for (let i = 0; i < numTurns; i++) {
            updateFunc();

            if (i === 10) {
                expect(simulSpellOn1stTurn).not.to.throw(Error);
            }
            if (i % 5000 === 0 && i > 0) {
                console.log(`Saving game after ${i}/${numTurns} turns`);
                expect(saveFunc).not.to.throw(Error);
                // saveFunc();
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
