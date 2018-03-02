/* Contains code related to in-game battles. */

const RG = require('./rg');
const debug = require('debug')('bitn:game.battle');

/* Army is a collection of actors associated with a battle. This is useful for
 *  battle commanders to have access to their full army. */
const Army = function(name) {
    this._name = name;
    this._actors = []; // All actors inside this army

    this._battle = null;
    this._casualties = 0;
    this._defeatThreshold = 0;

    this.getName = () => this._name;

    this.setDefeatThreshold = numActors => {
        this._defeatThreshold = numActors;
    };

    /* Default defeat is when all actors have been eliminated.*/
    this.isDefeated = () => {
        if (this._actors.length <= this._defeatThreshold) {
            return true;
        }
        return false;
    };

    this.setBattle = battle => {this._battle = battle;};
    this.getBattle = () => this._battle;

    this.getCasualties = () => this._casualties;

    this.getActors = () => this._actors.slice();

    this.hasActor = actor => {
        const id = actor.getID();
        const index = this._actors.findIndex(actor => actor.getID() === id);
        return index >= 0;
    };

    /* Tries to add an actor and returns true if success.*/
    this.addActor = function(actor) {
        if (!this.hasActor(actor)) {
            this._actors.push(actor);
            return true;
        }
        else {
            RG.err('Game.Army', 'addActor',
                'Actor already in army ' + this.getName());
        }
        return false;
    };

    /* Removes an actor from the army.*/
    this.removeActor = actor => {
        const index = this._actors.findIndex(
            a => a.getID() === actor.getID()
        );
        if (index >= 0) {
            this._actors.splice(index, 1);
            return true;
        }
        else {
            return false;
        }
    };

    this.removeAllActors = () => {this._actors = [];};

    /* Monitor killed actors and remove them from the army.*/
    this.hasNotify = true;
    this.notify = function(evtName, msg) {
        if (evtName === RG.EVT_ACTOR_KILLED) {
            debug(`${this._name} got EVT_ACTOR_KILLED`);
            const actor = msg.actor;
            if (this.hasActor(actor)) {
                if (!this.removeActor(actor)) {
                    const bName = this.getBattle().getName();
                    let msg = 'Battle: ' + bName;
                    msg += "Couldn't remove the actor " + actor.getName();
                    RG.err('Game.Army', 'notify', msg);
                }
                else {
                    ++this._casualties;
                    const bName = this.getBattle().getName();
                    let msg = `Battle: ${bName}, Army ${this._name}`;
                    msg += ` Actor: ${actor.getID()}`;
                    debug(`\tCasualties: ${this._casualties} ${msg}`);
                    const armyObj = {
                        type: 'Actor killed', army: this
                    };
                    debug(`${this._name} emit EVT_ARMY_EVENT`);
                    RG.POOL.emitEvent(RG.EVT_ARMY_EVENT, armyObj);
                    if (this._actors.length === 0) {
                        debug('<>Army<> ' + this._name + ' decimated');
                        debug(`\tCasualties: ${this._casualties}`);
                        RG.POOL.removeListener(this);
                    }
                }
            }
        }
    };
    RG.POOL.listenEvent(RG.EVT_ACTOR_KILLED, this);

    this.toJSON = function() {
        return {
            name: this._name,
            actors: this._actors.map(actor => actor.getID()),
            defeatThreshold: this._defeatThreshold
        };
    };
};

/* Battle is "mini-game" which uses its own scheduling and engine.*/
const Battle = function(name) {
    this._name = name;
    this._armies = [];
    this._level = null;
    this.finished = false;

    this.getType = () => 'battle';

    // Keeps track of battles statistics
    this._stats = {
        duration: 0,
        casualties: 0,
        survivors: 0
    };
    this.getArmies = () => this._armies.slice();
    this.setArmies = armies => {
        this._armies = armies;
        this._armies.forEach(army => {
            army.setBattle(this);
        });
    };

    this.getName = () => this._name;

    this.setLevel = level => {
        this._level = level;
        this._level.setParent(this);
    };
    this.getLevel = () => this._level;

    this.getStats = () => this._stats;
    this.setStats = stats => {this._stats = stats;};

    /* Adds an army to given x,y location.*/
    this.addArmy = (army, x, y, conf = {}) => {
        const horizontal = conf.horizontal ? true : false;
        const numRows = conf.numRows > 0 ? conf.numRows : 1;

        if (!RG.isNullOrUndef([this._level])) {
            this._armies.push(army);
            const actors = army.getActors();
            const actorsPerRow = Math.ceil(actors.length / numRows);

            if (horizontal) {
                let i = 0;
                for (let row = 0; row < numRows; row++) {
                    for (let xPos = 0; xPos < actorsPerRow; xPos++) {
                        if (i < actors.length) {
                            this.addActor(actors[i++], x + xPos, y + row);
                        }
                    }
                }
            }
            else {
                let i = 0;
                for (let row = 0; row < numRows; row++) {
                    for (let yPos = 0; yPos < actorsPerRow; yPos++) {
                        if (i < actors.length) {
                            this.addActor(actors[i++], x + row, y + yPos);
                        }
                    }
                }
            }
        }
        else {
            RG.err('Game.Battle', 'addArmy',
                'Level must exist before adding army.');
        }
        army.setBattle(this);
    };

    /* Adds actor to the battle level. Changes underlying base element if actor
     * would get stuck otherwise. */
    this.addActor = (actor, x, y) => {
        const cell = this._level.getMap().getCell(x, y);
        // TODO workaround for mountain level
        if (!cell.isPassable()) {
            cell.setBaseElem(RG.ELEM.FLOOR);
        }
        if (!this._level.addActor(actor, x, y)) {
            RG.err('Game.Battle', 'addActor',
                `Cannot add ${actor} to ${x},${y}`);
        }
    };

    this.armyInThisBattle = army => {
        const index = this._armies.indexOf(army);
        return index >= 0;
    };

    /* Returns true if the battle is over.*/
    this.isOver = () => {
        if (this._armies.length > 1) {
            let numArmies = 0;
            this._armies.forEach(army => {
                if (!army.isDefeated()) {
                    ++numArmies;
                }
            });
            if (numArmies <= 1) {
                return true;
            }
        }
        else {
            RG.err('Game.Battle', 'isOver', 'Battle should have >= 2 armies.');
        }
        return false;
    };

    this.hasNotify = true;
    this.notify = function(evtName, msg) {
        if (evtName === RG.EVT_ARMY_EVENT) {
            const bName = this.getName();
            debug(`${bName} got EVT_ARMY_EVENT`);
            const {type, army} = msg;
            if (this.armyInThisBattle(army) && type === 'Actor killed') {
                if (!this.finished && this.isOver()) {
                    debug(`Battle |${bName}| is over!`);
                    debug('\tRemoving all event listeners');
                    RG.POOL.removeListener(this);
                    const obj = {battle: this};
                    debug(`${bName} emit EVT_BATTLE_OVER`);
                    RG.POOL.emitEvent(RG.EVT_BATTLE_OVER, obj);
                    this.finished = true;
                }
            }
        }
    };
    RG.POOL.listenEvent(RG.EVT_ARMY_EVENT, this);

    /* Serialies the object into JSON. */
    this.toJSON = function() {
        return {
            isJSON: true,
            name: this._name,
            level: this._level.getID(),
            armies: this._armies.map(army => army.toJSON()),
            stats: this._stats,
            finished: this.finished
        };
    };

};

Battle.prototype.removeListeners = function() {
    this._armies.forEach(army => {
        RG.POOL.removeListener(army);
    });
    RG.POOL.removeListener(this);
};

module.exports = {
    Army, Battle
};
