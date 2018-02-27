/* Contains code related to in-game battles. */

const RG = require('./rg');
const debug = require('debug')('bitn:game.battle');

/* Army is a collection of actors associated with a battle. This is useful for
 *  battle commanders to have access to their full army. */
const Army = function(name) {
    const _name = name;
    let _actors = []; // All actors inside this army

    let _battle = null;
    let _casualties = 0;
    let _defeatThreshold = 0;

    this.getName = () => _name;

    this.setDefeatThreshold = numActors => {
        _defeatThreshold = numActors;
    };

    /* Default defeat is when all actors have been eliminated.*/
    this.isDefeated = () => {
        if (_actors.length <= _defeatThreshold) {
            return true;
        }
        return false;
    };

    this.setBattle = battle => {_battle = battle;};
    this.getBattle = () => _battle;

    this.getCasualties = () => _casualties;

    this.getActors = () => _actors.slice();

    this.hasActor = actor => {
        const id = actor.getID();
        const index = _actors.findIndex(actor => actor.getID() === id);
        return index >= 0;
    };

    /* Tries to add an actor and returns true if success.*/
    this.addActor = function(actor) {
        if (!this.hasActor(actor)) {
            _actors.push(actor);
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
        const index = _actors.findIndex(
            a => a.getID() === actor.getID()
        );
        if (index >= 0) {
            _actors.splice(index, 1);
            return true;
        }
        else {
            return false;
        }
    };

    this.removeAllActors = () => {_actors = [];};

    /* Monitor killed actors and remove them from the army.*/
    this.hasNotify = true;
    this.notify = function(evtName, msg) {
        if (evtName === RG.EVT_ACTOR_KILLED) {
            debug(`${_name} got EVT_ACTOR_KILLED`);
            const actor = msg.actor;
            if (this.hasActor(actor)) {
                if (!this.removeActor(actor)) {
                    const bName = this.getBattle().getName();
                    let msg = 'Battle: ' + bName;
                    msg += "Couldn't remove the actor " + actor.getName();
                    RG.err('Game.Army', 'notify', msg);
                }
                else {
                    ++_casualties;
                    const bName = this.getBattle().getName();
                    let msg = `Battle: ${bName}, Army ${_name}`;
                    msg += ` Actor: ${actor.getID()}`;
                    debug(`\tCasualties: ${_casualties} ${msg}`);
                    const armyObj = {
                        type: 'Actor killed', army: this
                    };
                    debug(`${_name} emit EVT_ARMY_EVENT`);
                    RG.POOL.emitEvent(RG.EVT_ARMY_EVENT, armyObj);
                    if (_actors.length === 0) {
                        debug('<>Army<> ' + _name + ' decimated');
                        debug(`\tCasualties: ${_casualties}`);
                        RG.POOL.removeListener(this);
                    }
                }
            }
        }
    };
    RG.POOL.listenEvent(RG.EVT_ACTOR_KILLED, this);

    this.toJSON = function() {
        return {
            name: _name,
            actors: _actors.map(actor => actor.getID()),
            defeatThreshold: _defeatThreshold
        };
    };
};

/* Battle is "mini-game" which uses its own scheduling and engine.*/
const Battle = function(name) {

    const _name = name;
    let _armies = [];
    let _level = null;
    this.finished = false;

    this.getType = () => 'battle';

    // Keeps track of battles statistics
    let _stats = {
        duration: 0,
        casualties: 0,
        survivors: 0
    };
    this.getArmies = () => _armies.slice();
    this.setArmies = armies => {
        _armies = armies;
        _armies.forEach(army => {
            army.setBattle(this);
        });
    };

    this.getName = () => _name;

    this.setLevel = level => {
        _level = level;
        _level.setParent(this);
    };
    this.getLevel = () => _level;

    this.getStats = () => _stats;
    this.setStats = stats => {_stats = stats;};

    /* Adds an army to given x,y location.*/
    this.addArmy = (army, x, y, conf = {}) => {
        const horizontal = conf.horizontal ? true : false;
        const numRows = conf.numRows > 0 ? conf.numRows : 1;

        if (!RG.isNullOrUndef([_level])) {
            _armies.push(army);
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
        const cell = _level.getMap().getCell(x, y);
        // TODO workaround for mountain level
        if (!cell.isPassable()) {
            cell.setBaseElem(RG.ELEM.FLOOR);
        }
        if (!_level.addActor(actor, x, y)) {
            RG.err('Game.Battle', 'addActor',
                `Cannot add ${actor} to ${x},${y}`);
        }
    };

    this.armyInThisBattle = army => {
        const index = _armies.indexOf(army);
        return index >= 0;
    };

    /* Returns true if the battle is over.*/
    this.isOver = () => {
        if (_armies.length > 1) {
            let numArmies = 0;
            _armies.forEach(army => {
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
            name: _name,
            level: _level.getID(),
            armies: _armies.map(army => army.toJSON()),
            stats: _stats,
            finished: this.finished
        };
    };

};

module.exports = {
    Army, Battle
};
