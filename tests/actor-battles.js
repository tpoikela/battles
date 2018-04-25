
/* Helper functions for testing actor balancing. */
const RG = require('../client/src/battles');
const fs = require('fs');

const UNLIMITED = -1;
const parser = RG.ObjectShell.getParser();

const ActorBattles = function(args) {
    this.monitorActor = args.monitorActor;
    this.matchLimit = args.matchLimit || UNLIMITED;
    this.shells = args.shells;

    this.fname = 'actor_fight_results';
    this.dir = 'results';

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
    const a1Name = a1.getName();
    const a2Name = a2.getName();
    if (!this.histogram[a1Name]) {
        this.histogram[a1Name] = {won: 0, lost: 0, tied: 0};
    }
    if (!this.histogram[a2Name]) {
        this.histogram[a2Name] = {won: 0, lost: 0, tied: 0};
    }
};

ActorBattles.prototype.getActorObj = function(a1) {
    if (typeof a1 === 'function') {
        return a1();
    }
    if (a1.name) {
        return parser.createActor(a1.name);
    }
    else if (a1.getName && typeof a1.getName === 'function') {
        return a1;
    }
    return a1;
};

ActorBattles.prototype.runBattleTest = function(a1, a2) {

    let watchdog = 300;
    const arena = RG.FACT.createLevel('arena', 7, 7);
    const actor1 = this.getActorObj(a1);
    const actor2 = this.getActorObj(a2);

    this.initHistograms(actor1, actor2);
    arena.addActor(actor1, 1, 1);
    arena.addActor(actor2, 6, 6);

    actor1.addEnemy(actor2);
    actor2.addEnemy(actor1);

    const game = new RG.Game.Main();
    game.addLevel(arena);
    game.addActiveLevel(arena);

    const h1 = actor1.get('Health');
    const h2 = actor2.get('Health');

    const a1Name = actor1.getName();
    const a2Name = actor2.getName();

    const a1Level = actor1.get('Experience').getExpLevel();
    RG.levelUpActor(actor2, a1Level);

    while (h1.isAlive() && h2.isAlive()) {
        game.simulate();
        if (--watchdog === 0) {break;}
    }

    if (watchdog === 0) {
        this.histogram[a1Name].tied += 1;
        this.histogram[a2Name].tied += 1;
        if (a1Name === this.monitorActor) {
            if (!this.monitor.tied[a2Name]) {this.monitor.tied[a2Name] = 1;}
            else {this.monitor.tied[a2Name] += 1;}
        }
        else if (a2Name === this.monitorActor) {
            if (!this.monitor.tied[a1Name]) {this.monitor.tied[a1Name] = 1;}
            else {this.monitor.tied[a1Name] += 1;}
        }
    }
    else if (h1.isAlive()) {
        this.histogram[a1Name].won += 1;
        this.histogram[a2Name].lost += 1;
        if (a1Name === this.monitorActor) {
            if (!this.monitor.won[a2Name]) {this.monitor.won[a2Name] = 1;}
            else {this.monitor.won[a2Name] += 1;}
        }
        else if (a2Name === this.monitorActor) {
            if (!this.monitor.lost[a1Name]) {this.monitor.lost[a1Name] = 1;}
            else {this.monitor.lost[a1Name] += 1;}
        }
    }
    else {
        this.histogram[a1Name].lost += 1;
        this.histogram[a2Name].won += 1;
        if (a1Name === this.monitorActor) {
            if (!this.monitor.lost[a2Name]) {this.monitor.lost[a2Name] = 1;}
            else {this.monitor.lost[a2Name] += 1;}
        }
        else if (a2Name === this.monitorActor) {
            if (!this.monitor.won[a1Name]) {this.monitor.won[a1Name] = 1;}
            else {this.monitor.won[a1Name] += 1;}
        }
    }

};

ActorBattles.prototype.validActorsForTest = function(arr) {
    for (let i = 0; i < arr.length; i++) {
        const actor = arr[i];
        if (actor.dontCreate) {return false;}
        if (actor.base === 'SpecialBase') {return false;}
        if (actor.type === 'spirit') {return false;}
    }
    if (arr.length === 2) {
        if (arr[0].name === arr[1].name) {return false;}
    }
    return true;
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
                    if (this.validActorsForTest([a1, a2])) {
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
                if (this.validActorsForTest([a2])) {
                    this.runBattleTest(actor, a2);
                    ++nMatches;
                }
            }
            else {
                ++matchesLeftOut;
            }
        }
    }

    ['won', 'lost', 'tied'].forEach(prop => {
        const values = Object.values(this.monitor[prop]);
        const sum = values.reduce((acc, val) => {
            return acc + val;
        }, 0);
        this.monitor[prop].sum = sum;
    });

    this.finish();
    this.nMatches = nMatches;
    this.matchesLeftOut = matchesLeftOut;
};


ActorBattles.prototype.printOutputs = function(tag = '') {
    const histogram = this.histogram;
    console.log('======= RESULTS =======');
    console.log(JSON.stringify(histogram, null, 1));
    console.log('Matches still remaining: ' + this.matchesLeftOut);

    console.log(JSON.stringify(this.monitor, null, 1));

    this.printCSV(tag);
};

ActorBattles.prototype.printMonitored = function(tag = '') {
    console.log(JSON.stringify(this.monitor, null, 1));
    this.printCSV(tag);
};

ActorBattles.prototype.printCSV = function(tag) {
    const histogram = this.histogram;
    const outputFile = `${this.dir}/${this.fname}_${tag}.csv`;
    if (!fs.existsSync(this.dir)) {
        fs.mkdirSync(this.dir);
    }
    if (tag.length > 0) {
        fs.writeFileSync(outputFile, `tag: ${tag}`);
    }
    fs.appendFileSync(outputFile, 'Actor,Won,Tied,Lost\n');
    Object.keys(histogram).forEach(key => {
        const {won, lost, tied} = histogram[key];
        const newKey = key.replace(',', '');
        const csvData = `${newKey},${won},${tied},${lost}\n`;
        fs.appendFileSync(outputFile, csvData);
    });
};

module.exports = ActorBattles;
