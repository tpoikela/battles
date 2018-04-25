
/* Helper functions for testing actor balancing. */
const RG = require('../client/src/battles');
const fs = require('fs');

const UNLIMITED = -1;
const parser = RG.ObjectShell.getParser();

const ActorBattles = function(args) {
    this.monitorActor = args.monitorActor;
    this.matchLimit = args.matchLimit || UNLIMITED;
    this.shells = args.shells;

    this.histogram = {};
    this.monitor = {
        name: this.monitorActor,
        won: {},
        lost: {},
        tied: {}
    };
};

ActorBattles.prototype.start = function() {
    this.startTime = new Date().getTime();
};

ActorBattles.prototype.finish = function() {
    this.endTime = new Date().getTime();
};

ActorBattles.prototype.getDuration = function() {
    return this.endTime - this.startTime;
};

ActorBattles.prototype.initHistograms = function(a1, a2) {
    if (!this.histogram[a1.name]) {
        this.histogram[a1.name] = {won: 0, lost: 0, tied: 0};
    }
    if (!this.histogram[a2.name]) {
        this.histogram[a2.name] = {won: 0, lost: 0, tied: 0};
    }
};

ActorBattles.prototype.getActorObj = function(a1) {
    if (a1.name) {
        return parser.createActor(a1.name);
    }
    else if (a1.getName && typeof a1.getName === 'function') {
        a1.name = a1.getName();
    }
    return a1;
};

ActorBattles.prototype.runBattleTest = function(a1, a2) {
    this.initHistograms(a1, a2);

    let watchdog = 300;
    const arena = RG.FACT.createLevel('arena', 7, 7);
    const actor1 = this.getActorObj(a1);
    const actor2 = this.getActorObj(a2);
    arena.addActor(actor1, 1, 1);
    arena.addActor(actor2, 6, 6);

    actor1.addEnemy(actor2);
    actor2.addEnemy(actor1);

    const game = new RG.Game.Main();
    game.addLevel(arena);
    game.addActiveLevel(arena);

    const h1 = actor1.get('Health');
    const h2 = actor2.get('Health');

    while (h1.isAlive() && h2.isAlive()) {
        game.simulate();
        if (--watchdog === 0) {break;}
    }

    if (watchdog === 0) {
        this.histogram[a1.name].tied += 1;
        this.histogram[a2.name].tied += 1;
        if (a1.name === this.monitorActor) {
            if (!this.monitor.tied[a2.name]) {this.monitor.tied[a2.name] = 1;}
            else {this.monitor.tied[a2.name] += 1;}
        }
        else if (a2.name === this.monitorActor) {
            if (!this.monitor.tied[a1.name]) {this.monitor.tied[a1.name] = 1;}
            else {this.monitor.tied[a1.name] += 1;}
        }
    }
    else if (h1.isAlive()) {
        this.histogram[a1.name].won += 1;
        this.histogram[a2.name].lost += 1;
        if (a1.name === this.monitorActor) {
            if (!this.monitor.won[a2.name]) {this.monitor.won[a2.name] = 1;}
            else {this.monitor.won[a2.name] += 1;}
        }
        else if (a2.name === this.monitorActor) {
            if (!this.monitor.lost[a1.name]) {this.monitor.lost[a1.name] = 1;}
            else {this.monitor.lost[a1.name] += 1;}
        }
    }
    else {
        this.histogram[a1.name].lost += 1;
        this.histogram[a2.name].won += 1;
        if (a1.name === this.monitorActor) {
            if (!this.monitor.lost[a2.name]) {this.monitor.lost[a2.name] = 1;}
            else {this.monitor.lost[a2.name] += 1;}
        }
        else if (a2.name === this.monitorActor) {
            if (!this.monitor.won[a1.name]) {this.monitor.won[a1.name] = 1;}
            else {this.monitor.won[a1.name] += 1;}
        }
    }

};

ActorBattles.prototype.validActorsForTest = function(a1, a2) {
    if (a1.name !== a2.name) {
        if (!a1.dontCreate && !a2.dontCreate) {
            if (a1.base !== 'SpecialBase' && a2.base !== 'SpecialBase') {
                if (a1.type !== 'spirit' && a2.type !== 'spirit') {
                    return true;
                }
            }
        }
    }
    return false;
};

ActorBattles.prototype.runSweep = function(nRounds = 1) {
    let nMatches = 0;
    let matchesLeftOut = 0;
    this.start();
    for (let n = 0; n < nRounds; n++) {
        console.error(`Starting round ${n}`);
        for (let i = 0; i < this.shells.length; i++) {
            for (let j = 0; j < this.shells.length; j++) {
                if (i !== j) {
                    const a1 = this.shells[i];
                    const a2 = this.shells[j];
                    if (this.validActorsForTest(a1, a2)) {
                        if (nMatches < this.matchLimit) {
                            this.runBattleTest(a1, a2);
                            ++nMatches;
                        }
                        else {
                            ++matchesLeftOut;
                        }
                    }
                }
            }
        }
        console.error(`Round ${n} finished. Matches: ${nMatches}`);
    }
    this.finish();
    this.nMatches = nMatches;
    this.matchesLeftOut = matchesLeftOut;
};

/* Runs the battles for given number of rounds. Fixes the first actor in each
 * battle to be the same. */
ActorBattles.prototype.runWithActor = function(actor, nRounds = 1) {
    let nMatches = 0;
    let matchesLeftOut = 0;
    this.start();
    for (let n = 0; n < nRounds; n++) {
        for (let i = 0; i < this.shells.length; i++) {
            const a2 = this.shells[i];
            if (nMatches < this.matchLimit) {
                this.runBattleTest(actor, a2);
                ++nMatches;
            }
            else {
                ++matchesLeftOut;
            }
        }
    }
    this.finish();
    this.nMatches = nMatches;
    this.matchesLeftOut = matchesLeftOut;
};


ActorBattles.prototype.printOutputs = function() {
    const histogram = this.histogram;
    console.log('======= RESULTS =======');
    console.log(JSON.stringify(histogram, null, 1));
    console.log('Matches still remaining: ' + this.matchesLeftOut);

    console.log(JSON.stringify(this.monitor, null, 1));

    const outputFile = 'actor_fight_results.csv';
    fs.writeFileSync(outputFile, 'Actor,Won,Tied,Lost\n');
    Object.keys(histogram).forEach(key => {
        const {won, lost, tied} = histogram[key];
        const newKey = key.replace(',', '');
        const csvData = `${newKey},${won},${tied},${lost}\n`;
        fs.appendFileSync(outputFile, csvData);
    });
};

module.exports = ActorBattles;
