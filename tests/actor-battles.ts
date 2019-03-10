
/* Helper functions for testing actor balancing. */
import * as RG from '../client/src/battles';
const fs = require('fs');
import {IShell} from '../client/data/actor-gen';

const UNLIMITED = -1;
const parser = RG.ObjectShell.getParser();

interface ActorEntry {
    won: number;
    lost: number;
    tied: number;
}

interface ActorHist {
    [key: string]: ActorEntry;
}

const ActorBattles = function(args) {
    this.monitorActor = args.monitorActor;
    this.matchLimit = args.matchLimit || UNLIMITED;
    this.shells = args.shells;
    this.equalizeLevels = true;

    this.parser = parser;
    this.parser.parseShellData({actors: this.shells});

    this.fname = 'actor_fight_results';
    this.dir = 'results';

    // Weapon database for actors
    this.weaponDb = {};

    this.histogram = {} as ActorHist;
    this.monitor = {
        name: this.monitorActor,
        won: {},
        lost: {},
        tied: {}
    };

    this.propsToQuery = {
        equip: (shell) => !!shell.equip,
        weaponDmg: (shell) => (
            this.weaponDb[shell.name] ? this.weaponDb[shell.name] : ''
        ),
        spells: (shell) => !!shell.spells
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

/* Returns the actor object that will be used. If given arg is function,
 * calls the function and returns the result. */
ActorBattles.prototype.getActorObj = function(a1) {
    let actor = null;
    if (typeof a1 === 'function') {
        actor = a1(); // Mainly used for player
    }
    if (a1.name) {
        actor = this.parser.createActor(a1.name);
    }
    else if (RG.RG.isActor(a1)) {
        actor = a1;
    }
    const weapon = actor.getWeapon();
    if (weapon) {
        this.weaponDb[actor.getName()] = weapon.getDamageDie().toString();
    }
    return actor;
};

ActorBattles.prototype.runBattleTest = function(a1, a2) {

    let watchdog = 300;
    const factLevel = new RG.FactoryLevel();
    const arena = factLevel.createLevel('arena', 12, 12);
    const actor1 = this.getActorObj(a1);
    const actor2 = this.getActorObj(a2);

    this.initHistograms(actor1, actor2);
    arena.addActor(actor1, 1, 1);
    arena.addActor(actor2, 6, 6);

    actor1.addEnemy(actor2);
    actor2.addEnemy(actor1);

    const game = new RG.GameMain();
    game.addLevel(arena);
    game.addActiveLevel(arena);

    const h1 = actor1.get('Health');
    const h2 = actor2.get('Health');

    const a1Name = actor1.getName();
    const a2Name = actor2.getName();

    const a1Level = actor1.get('Experience').getExpLevel();
    if (this.equalizeLevels) {
        if (a1Level > actor2.get('Experience').getExpLevel()) {
            RG.RG.levelUpActor(actor2, a1Level);
        }
    }

    while (h1.isAlive() && h2.isAlive()) {
        game.simulate();
        if (--watchdog === 0) {break;}
    }

    if (watchdog === 0) {
        this.recordResult('tied', a1Name, a2Name);
        this.recordResult('tied', a2Name, a1Name);
    }
    else if (h1.isAlive()) {
        this.recordResult('won', a1Name, a2Name);
        this.recordResult('lost', a2Name, a1Name);
    }
    else {
        this.recordResult('lost', a1Name, a2Name);
        this.recordResult('won', a2Name, a1Name);
    }

};

ActorBattles.prototype.recordResult = function(resType: string, aName, a2Name): void {
    this.histogram[aName][resType] += 1;
    if (aName === this.monitorActor) {
        if (!this.monitor[resType][a2Name]) {
            this.monitor[resType][a2Name] = 1;
        }
        else {
            this.monitor[resType][a2Name] += 1;
        }
    }
};

/* For filtering the valid actors for the test. */
ActorBattles.prototype.validActorsForTest = function(arr): boolean {
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

    /* TODO fix this
    ['won', 'lost', 'tied'].forEach(prop => {
        const values = Object.values(this.monitor[prop]);
        const sum = values.reduce((acc, val) => {
            return acc + val;
        }, 0);
        this.monitor[prop].sum = sum;
    });
    */

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

const propsToAppend = ['danger', 'hp', 'attack', 'defense', 'protection', 'damage'];


ActorBattles.prototype.printCSV = function(tag) {
    const histogram: ActorHist = this.histogram;
    const outputFile = `${this.dir}/${this.fname}_${tag}.csv`;
    if (!fs.existsSync(this.dir)) {
        fs.mkdirSync(this.dir);
    }
    if (tag.length > 0) {
        fs.writeFileSync(outputFile, `tag: ${tag}`);
    }

    // Format the header for CSV file
    let headerLine = 'Actor,Won,Tied,Lost,WinRatio';
    headerLine += ',' + propsToAppend.join(',');
    headerLine += ',' + Object.keys(this.propsToQuery).join(',');
    this.headerLine = headerLine;
    fs.appendFileSync(outputFile, headerLine + '\n');

    let actorData: Array<[string, ActorEntry]> = Object.entries(histogram);
    actorData = actorData.sort((a, b) => {
        const [e1, e2]: [ActorEntry, ActorEntry] = [a[1], b[1]];
        if (a[1].won > b[1].won) {
            return -1;
        }
        else if (a[1].won < b[1].won) {
            return 1;
        }
        return 0;
    });

    actorData.forEach(entry => {
        const key = entry[0];
        let shellFromDb: IShell = this.parser.dbGet({name: key})[0];
        if (!shellFromDb) {
            shellFromDb = this.parser.dbGetNoRandom({categ: 'actors', name: key})[0];
            if (!shellFromDb) {
                console.error(`ERROR. No shell for ${key} found`);
                return;
            }
        }

        const {won, lost, tied} = entry[1];
        const newKey = key.replace(',', '');
        const winRatio = Math.round((won / (won + lost)) * 100);

        // Format CSV data for this actor
        let csvData = `${newKey},${won},${tied},${lost},${winRatio}`;
        propsToAppend.forEach(prop => {
            csvData += ',' + shellFromDb[prop];
        });
        Object.keys(this.propsToQuery).forEach(name => {
            const funcToCall = this.propsToQuery[name];
            csvData += ',' + funcToCall(shellFromDb);
        });
        fs.appendFileSync(outputFile, csvData + '\n');
    });
    fs.appendFileSync(outputFile, this.headerLine + '\n');
    const linkName = `${this.dir}/last_sim.csv`;
    if (fs.existsSync(linkName)) {
        fs.unlinkSync(linkName);
    }
    fs.linkSync(outputFile, linkName);
    console.log('Results printed to file ' + outputFile);
};

module.exports = ActorBattles;
