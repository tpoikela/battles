
/* File contains spell definitions for the game.
 * Each spell should contain at least:
 *   1. cast()
 *   2. getSelectionObject()
 *   3. aiShouldCastSpell (optional)
 *     - Return true if spell should be cast
 *     - Set also args for the spell (dir, target etc)
 *
 * where 3 is used with spellcaster AI. Without this, the spell cannot be
 * used by the AI.
 */
const RG = require('./rg');
const Keys = require('./keymap');

const {KeyMap} = Keys;

// const NO_SELECTION_NEEDED = () => {};

RG.Spell = {};

/* Used for sorting the spells by spell power. */
/* function compareSpells(s1, s2) {
    if (s1.getPower() < s2.getPower()) {
        return -1;
    }
    if (s2.getPower() > s1.getPower()) {
        return 1;
    }
    return 0;
}
*/

/* Called at the end of AI querying if spell should be cast. */
const aiSpellCellDone = (actor, target, cb) => {
    const dir = [actor.getX() - target.getX(),
        actor.getY() - target.getY()
    ];
    const newArgs = {dir, src: actor};
    cb(actor, newArgs);
};

const aiSpellCellEnemy = (args, cb) => {
    const {actor, actorCellsAround} = args;
    let strongest = null;
    actorCellsAround.forEach(cell => {
        const actors = cell.getActors();
        actors.forEach(otherActor => {
            if (actor.isEnemy(otherActor)) {
                const health = otherActor.get('Health');
                if (!strongest) {
                    strongest = otherActor;
                }
                else if (args.compFunc) {
                    if (args.compFunc(strongest, otherActor)) {
                        strongest = otherActor;
                    }
                }
                else {
                    const maxHP = health.getMaxHP();
                    const strHP = strongest.get('Health').getMaxHP();
                    if (maxHP > strHP) {strongest = otherActor;}
                }
            }
        });
    });

    if (strongest) {
        aiSpellCellDone(actor, strongest, cb);
        return true;
    }
    return false;
};

/* Can be used to determine if AI should cast a close proximity spell to a
 * friendly target. Custom "intelligence" can be provided by giving
 * args.compFunc which will filter the friend actors.
 */
const aiSpellCellFriend = (args, cb) => {
    const {actor, actorCellsAround} = args;
    let suitable = null;
    actorCellsAround.forEach(cell => {
        const actors = cell.getActors();
        actors.forEach(otherActor => {
            if (actor.isFriend(otherActor)) {
                if (!suitable) {
                    suitable = otherActor;
                }
                else if (args.compFunc) {
                    if (args.compFunc(suitable, otherActor)) {
                        suitable = otherActor;
                    }
                }
                else { // If compFunc not given, use default logic
                    const h1 = suitable.get('Health');
                    const h2 = otherActor.get('Health');
                    if (h2.hpLost() > h1.hpLost()) {
                        suitable = otherActor;
                    }
                }
            }
        });
    });

    if (suitable) {
        aiSpellCellDone(actor, suitable, cb);
        return true;
    }
    return false;
};

/* Used to determine if AI caster should cast a spell on itself. */
const aiSpellCellSelf = (args, cb) => {
    const {actor} = args;
    let shouldCast = true;
    if (args.compFunc) {
        if (args.compFunc(actor)) {
            shouldCast = true;
        }
        else {
            shouldCast = false;
        }
    }

    if (shouldCast) {
        aiSpellCellDone(actor, actor, cb);
    }
    return shouldCast;
};

/* Returns selection object for spell which is cast on self. */
RG.Spell.getSelectionObjectSelf = (spell, actor) => {
    const func = () => {
        const spellCast = new RG.Component.SpellCast();
        spellCast.setSource(actor);
        spellCast.setSpell(spell);
        spellCast.setArgs({src: actor});
        actor.add(spellCast);
    };
    return func;
};

RG.Spell.getSelectionObjectDir = (spell, actor, msg) => {
    RG.gameMsg(msg);
    return {
        // showMsg: () => RG.gameMsg(msg),
        select: (code) => {
            const args = {};
            args.dir = KeyMap.getDir(code);
            if (args.dir) {
                args.src = actor;
                return () => {
                    const spellCast = new RG.Component.SpellCast();
                    spellCast.setSource(actor);
                    spellCast.setSpell(spell);
                    spellCast.setArgs(args);
                    actor.add('SpellCast', spellCast);
                };
            }
            return null;
        },
        showMenu: () => false
    };
};

const getDirSpellArgs = (spell, args) => {
    const src = args.src;
    const dir = args.dir;
    const x = src.getX();
    const y = src.getY();
    const obj = {
        from: [x, y],
        dir,
        spell: spell,
        src: args.src
    };
    return obj;
};

/* A list of spells known by a single actor. */
RG.Spell.SpellBook = function(actor) {
    const _actor = actor;
    const _spells = [];
    if (RG.isNullOrUndef([_actor])) {
        RG.err('Spell.SpellBook', 'new',
            'actor must be given.');
    }

    this.getActor = () => _actor;

    this.addSpell = spell => {
        _spells.push(spell);
        spell.setCaster(this.getActor());
    };

    this.getSpells = () => _spells;

    /* Returns the object which is used in Brain.Player to make the player
     * selection of spell casting. */
    this.getSelectionObject = () => {
        const powerSorted = _spells;
        return {
            select: function(code) {
                const selection = Keys.codeToIndex(code);
                if (selection < powerSorted.length) {
                    return powerSorted[selection].getSelectionObject(actor);
                }
                return null;
            },
            getMenu: function() {
                RG.gameMsg('Please select a spell to cast:');
                const indices = Keys.menuIndices.slice(0, _spells.length);
                const obj = {};
                powerSorted.forEach((spell, index) => {
                    obj[indices[index]] = spell.toString();
                });
                obj.pre = ['You know the following spells:'];
                return obj;
            },
            showMenu: () => true
        };
    };

    this.toJSON = () => ({
        spells: _spells.map(spell => spell.toJSON())
    });
};

/* Base object for all spells. */
RG.Spell.Base = function(name, power) {
    this._name = name;
    this._power = power || 5;
    this._caster = null;

    this.setCaster = caster => {this._caster = caster;};
    this.getCaster = () => this._caster;

    this.setName = name => {
        const nameSplit = name.split(/\s+/);
        const capNames = [];
        nameSplit.forEach(name => {
            capNames.push(name.capitalize());
        });
        this._new = capNames.join('');

    };
    this.setName(name);

    this.getName = () => this._name;

    this.getPower = () => this._power;
    this.setPower = power => {this._power = power;};

    this.getCastFunc = function(actor, args) {
        if (args.dir || args.target) {
            args.src = actor;
            return () => {
                const spellCast = new RG.Component.SpellCast();
                spellCast.setSource(actor);
                spellCast.setSpell(this);
                spellCast.setArgs(args);
                actor.add('SpellCast', spellCast);
            };
        }
        return null;
    };

};

RG.Spell.Base.prototype.toString = function() {
    let str = `${this.getName()} - ${this.getPower()}PP`;
    if (this._duration) {
        str += ` Dur: ${this._duration.toString()}`;
    }
    return str;
};

RG.Spell.Base.prototype.toJSON = function() {
    return {
        name: this.getName(),
        new: this._new,
        power: this.getPower()
    };
};

/* Base class for spells which add components to entities. */
RG.Spell.AddComponent = function(name, power) {
    RG.Spell.Base.call(this, name, power);

    let _compName = '';
    this._duration = RG.FACT.createDie('1d6 + 3');

    this.setDuration = die => {this._duration = die;};
    this.setCompName = name => {_compName = name;};
    this.getCompName = () => _compName;

    this.cast = function(args) {
        const obj = getDirSpellArgs(this, args);
        const dur = this._duration.roll();

        const compToAdd = new RG.Component[_compName]();
        if (compToAdd.setSource) {
            compToAdd.setSource(args.src);
        }
        obj.addComp = {comp: compToAdd, duration: dur};

        const spellComp = new RG.Component.SpellCell();
        spellComp.setArgs(obj);
        args.src.add('SpellCell', spellComp);
    };

    this.getSelectionObject = function(actor) {
        const msg = 'Select a direction for the spell:';
        return RG.Spell.getSelectionObjectDir(this, actor, msg);
    };

};
RG.extend2(RG.Spell.AddComponent, RG.Spell.Base);

RG.Spell.Flying = function() {
    RG.Spell.AddComponent.call(this, 'Flying', 5);
    this.setCompName('Flying');
    this._duration = RG.FACT.createDie('10d5 + 5');

    this.aiShouldCastSpell = (args, cb) => {
        return aiSpellCellFriend(args, cb);
    };
};
RG.extend2(RG.Spell.Flying, RG.Spell.AddComponent);

RG.Spell.Paralysis = function() {
    RG.Spell.AddComponent.call(this, 'Paralysis', 7);
    this.setCompName('Paralysis');
    this.setDuration(RG.FACT.createDie('1d6 + 2'));

    this.aiShouldCastSpell = (args, cb) => {
        return aiSpellCellEnemy(args, cb);
    };
};
RG.extend2(RG.Spell.Paralysis, RG.Spell.AddComponent);

RG.Spell.SpiritForm = function() {
    RG.Spell.AddComponent.call(this, 'SpiritForm', 10);
    this.setCompName('Ethereal');
    this.setDuration(RG.FACT.createDie('1d6 + 4'));

    this.aiShouldCastSpell = (args, cb) => {
        return aiSpellCellFriend(args, cb);
    };
};
RG.extend2(RG.Spell.SpiritForm, RG.Spell.AddComponent);

//------------------------------------------------------
/* Base class for spells removing other components. */
//------------------------------------------------------
RG.Spell.RemoveComponent = function(name, power) {
    RG.Spell.Base.call(this, name, power);

    let _compNames = [];

    this.setCompNames = comps => {
        if (typeof comps === 'string') {
            _compNames = [comps];
        }
        else {
            _compNames = comps;
        }
    };
    this.getCompNames = () => _compNames;

    this.cast = function(args) {
        const obj = getDirSpellArgs(this, args);
        // const dur = this._duration.roll();

        obj.removeComp = _compNames;

        const spellComp = new RG.Component.SpellCell();
        spellComp.setArgs(obj);
        args.src.add('SpellCell', spellComp);
    };

    this.getSelectionObject = function(actor) {
        const msg = 'Select a direction for the spell:';
        return RG.Spell.getSelectionObjectDir(this, actor, msg);
    };

};
RG.extend2(RG.Spell.RemoveComponent, RG.Spell.Base);

RG.Spell.DispelMagic = function() {
    RG.Spell.RemoveComponent.call(this, 'DispelMagic', 8);
    this.setCompNames('Duration');

};
RG.extend2(RG.Spell.DispelMagic, RG.Spell.RemoveComponent);

//------------------------------------------------------
/* Base class for ranged spells. */
//------------------------------------------------------
RG.Spell.Ranged = function(name, power) {
    RG.Spell.Base.call(this, name, power);
    this._damageDie = RG.FACT.createDie('4d4 + 4');
    this._range = 5;

    this.getRange = () => this._range;
    this.setRange = range => {this._range = range;};
    this.setDice = dice => {
        this._damageDie = dice[0];
    };
    this.getDice = () => [this._damageDie];

};
RG.extend2(RG.Spell.Ranged, RG.Spell.Base);

RG.Spell.Ranged.prototype.toString = function() {
    let str = RG.Spell.Base.prototype.toString.call(this);
    str += ` D: ${this.getDice()[0].toString()} R: ${this.getRange()}`;
    return str;
};

RG.Spell.Ranged.prototype.toJSON = function() {
    const json = RG.Spell.Base.prototype.toJSON.call(this);
    json.range = this.getRange();
    json.dice = [this.getDice()[0].toJSON()];
    return json;
};

/* A spell for melee combat using grasp of winter. */
RG.Spell.GraspOfWinter = function() {
    RG.Spell.Base.call(this, 'Grasp of winter');
    this._damageDie = RG.FACT.createDie('4d4 + 4');

    this.cast = function(args) {
        const obj = getDirSpellArgs(this, args);
        obj.damageType = RG.DMG.ICE;
        obj.damage = this._damageDie.roll();
        const spellComp = new RG.Component.SpellCell();
        spellComp.setArgs(obj);
        args.src.add('SpellCell', spellComp);
    };

    this.getSelectionObject = function(actor) {
        const msg = 'Select a direction for grasping:';
        return RG.Spell.getSelectionObjectDir(this, actor, msg);
    };

    this.aiShouldCastSpell = (args, cb) => {
        return aiSpellCellEnemy(args, cb);
    };
};
RG.extend2(RG.Spell.GraspOfWinter, RG.Spell.Base);

RG.Spell.GraspOfWinter.prototype.toString = function() {
    let str = RG.Spell.Base.prototype.toString.call(this);
    str += ` D: ${this._damageDie.toString()}`;
    return str;
};

RG.Spell.BoltBase = function(name, power) {
    RG.Spell.Ranged.call(this, name, power);

    this.cast = function(args) {
        const obj = getDirSpellArgs(this, args);
        obj.damageType = this.damageType;
        obj.damage = this.getDice()[0].roll();
        const rayComp = new RG.Component.SpellRay();
        rayComp.setArgs(obj);
        args.src.add('SpellRay', rayComp);
    };

    this.getSelectionObject = function(actor) {
        RG.gameMsg('Select a direction for firing:');
        return {
            select: (code) => {
                const dir = KeyMap.getDir(code);
                return this.getCastFunc(actor, {dir});
            },
            showMenu: () => false
        };
    };

    this.aiShouldCastSpell = (args, cb) => {
        const {actor, enemy} = args;
        const [x0, y0] = [actor.getX(), actor.getY()];
        const [x1, y1] = [enemy.getX(), enemy.getY()];
        const lineXY = RG.Geometry.getStraightLine(x0, y0, x1, y1);
        if (lineXY.length > 1) {
            const dX = lineXY[1][0] - lineXY[0][0];
            const dY = lineXY[1][1] - lineXY[0][1];
            const args = {dir: [dX, dY]};
            if (typeof cb === 'function') {
                cb(actor, args);
            }
            else {
                RG.err('Spell.BoltBase', 'aiShouldCastSpell',
                    'No callback function given!');
            }
            return true;
        }
        return false;
    };
};
RG.extend2(RG.Spell.BoltBase, RG.Spell.Ranged);

/* Class Frost bolt which shoots a ray to one direction from the caster. */
RG.Spell.FrostBolt = function() {
    RG.Spell.BoltBase.call(this, 'Frost bolt', 5);
    this.damageType = RG.DMG.ICE;
};
RG.extend2(RG.Spell.FrostBolt, RG.Spell.BoltBase);

/* Class Frost bolt which shoots a ray to one direction from the caster. */
RG.Spell.LightningBolt = function() {
    RG.Spell.BoltBase.call(this, 'Lightning bolt', 8);
    this.damageType = RG.DMG.LIGHTNING;
    this.setRange(6);
    this.setDice([RG.FACT.createDie('6d3 + 3')]);
};
RG.extend2(RG.Spell.LightningBolt, RG.Spell.BoltBase);

/* Ice shield increase the defense of the caster temporarily. */
RG.Spell.IceShield = function() {
    RG.Spell.Base.call(this, 'Ice shield', 7);

    this._duration = RG.FACT.createDie('5d5 + 5');
    this._defenseDie = RG.FACT.createDie('1d6 + 1');

    this.cast = args => {
        const actor = args.src;
        const dur = this._duration.roll();
        const combatMods = new RG.Component.CombatMods();
        combatMods.setDefense(this._defenseDie.roll());
        RG.Component.addToExpirationComp(actor, combatMods, dur);
        RG.gameMsg('You feel a boost to your defense.');
    };

    this.getSelectionObject = function(actor) {
        return RG.Spell.getSelectionObjectSelf(this, actor);
    };

    this.aiShouldCastSpell = (args, cb) => {
        return aiSpellCellFriend(args, cb);
    };

};
RG.extend2(RG.Spell.IceShield, RG.Spell.Base);

RG.Spell.IceShield.prototype.toString = function() {
    let str = RG.Spell.Base.prototype.toString.call(this);
    str += ` Def: ${this._defenseDie.toString()}`;
    return str;
};

/* Magic armor increases the protection of the caster temporarily. */
RG.Spell.MagicArmor = function() {
    RG.Spell.Base.call(this, 'MagicArmor', 5);

    this._duration = RG.FACT.createDie('5d5 + 5');
    this._protDie = RG.FACT.createDie('2d6 + 1');

    this.cast = args => {
        const actor = args.src;
        const dur = this._duration.roll();
        const combatMods = new RG.Component.CombatMods();
        combatMods.setProtection(this._protDie.roll());
        RG.Component.addToExpirationComp(actor, combatMods, dur);
        RG.gameMsg('You feel a much more protected.');
    };

    this.getSelectionObject = function(actor) {
        return RG.Spell.getSelectionObjectSelf(this, actor);
    };

};
RG.extend2(RG.Spell.MagicArmor, RG.Spell.Base);

RG.Spell.MagicArmor.prototype.toString = function() {
    let str = RG.Spell.Base.prototype.toString.call(this);
    str += ` Pro: ${this._protDie.toString()}`;
    return str;
};


/* IcyPrison spell which paralyses actors for a certain duration. */
RG.Spell.IcyPrison = function() {
    RG.Spell.Base.call(this, 'Icy prison', 10);

    this._duration = RG.FACT.createDie('1d8 + 1');

    this.cast = function(args) {
        const obj = getDirSpellArgs(this, args);
        const dur = this._duration.roll();

        const paralysis = new RG.Component.Paralysis();
        paralysis.setSource(args.src);
        obj.addComp = {comp: paralysis, duration: dur};

        const spellComp = new RG.Component.SpellCell();
        spellComp.setArgs(obj);
        args.src.add('SpellCell', spellComp);
    };

    this.getSelectionObject = function(actor) {
        const msg = 'Select a direction for casting:';
        return RG.Spell.getSelectionObjectDir(this, actor, msg);
    };

    this.aiShouldCastSpell = (args, cb) => {
        return aiSpellCellEnemy(args, cb);
    };

};
RG.extend2(RG.Spell.IcyPrison, RG.Spell.Base);

/* Base spell for summoning other actors for help. */
RG.Spell.SummonBase = function(name, power) {
    RG.Spell.Base.call(this, name, power);
    this.summonType = '';
    this.nActors = 1;

    this.setSummonType = type => {
        this.summonType = type;
    };

    this.cast = function(args) {
        const obj = getDirSpellArgs(this, args);

        // Will be called by System.SpellEffect
        obj.callback = cell => {
            if (this.nActors === 1) {
                if (cell.isFree()) {
                    this._createAndAddActor(cell, args);
                }
            }
            else {
                const caster = args.src;
                const map = caster.getLevel().getMap();
                const [cX, cY] = caster.getXY();
                const coord = RG.Geometry.getBoxAround(cX, cY, 2);
                let nPlaced = 0;
                let watchdog = 30;

                while (nPlaced < this.nActors) {
                    const [x, y] = RG.RAND.arrayGetRand(coord);
                    if (map.hasXY(x, y)) {
                        const cell = map.getCell(x, y);
                        if (cell.isFree()) {
                            this._createAndAddActor(cell, args);
                            ++nPlaced;
                        }
                    }
                    if (--watchdog === 0) {break;}
                }

                if (nPlaced < this.nActors) {
                    const msg = `${caster.getName()} has no space to summon`;
                    RG.gameMsg({cell: caster.getCell(), msg});
                }
            }
        };

        const spellComp = new RG.Component.SpellCell();
        spellComp.setArgs(obj);
        args.src.add('SpellCell', spellComp);
    };

    this.getSelectionObject = function(actor) {
        const msg = 'Select a free cell for summoning:';
        return RG.Spell.getSelectionObjectDir(this, actor, msg);
    };

    this.aiShouldCastSpell = (args, cb) => {
        const {actor, enemy} = args;
        const friends = RG.Brain.getFriendCellsAround(actor);
        if (friends.length === 0) {
            if (typeof cb === 'function') {
                const summonCell = actor.getBrain().getRandAdjacentFreeCell();
                if (summonCell) {
                    args.dir = RG.dXdY(summonCell, actor);
                    cb(actor, args);
                    return true;
                }
            }
            else {
                RG.err(`Spell.${this.getName()}`, 'aiShouldCastSpell',
                    `No callback function given! enemy: ${enemy}`);
            }
        }
        return false;
    };

    this._createAndAddActor = (cell, args) => {
        const [x, y] = [cell.getX(), cell.getY()];
        const caster = args.src;
        const level = caster.getLevel();

        // TODO create proper minion
        const parser = RG.ObjectShell.getParser();

        let minion = null;
        if (this.summonType !== '') {
            minion = parser.createActor(this.summonType);
        }
        else if (this.summonFunc) {
            minion = parser.createRandomActor({func: this.summonFunc});
        }

        level.addActor(minion, x, y);
        minion.addFriend(caster);
        caster.addFriend(minion);

        const name = caster.getName();
        const summonName = minion.getName();
        const msg = `${name} summons ${summonName}!`;
        RG.gameMsg({cell, msg});
    };

};
RG.extend2(RG.Spell.SummonBase, RG.Spell.Base);

/* A spell to summon an ice minion to fight for the caster. */
RG.Spell.SummonIceMinion = function() {
    RG.Spell.SummonBase.call(this, 'SummonIceMinion', 14);
    this.summonType = 'Ice minion';

};
RG.extend2(RG.Spell.SummonIceMinion, RG.Spell.SummonBase);

/* A spell to summon an ice minion to fight for the caster. */
RG.Spell.SummonAirElemental = function() {
    RG.Spell.SummonBase.call(this, 'SummonAirElemental', 20);
    this.summonFunc = actor => {
        return actor.name === 'air elemental';
    };
};
RG.extend2(RG.Spell.SummonAirElemental, RG.Spell.SummonBase);

/* A spell to summon an animal to fight for the caster. */
RG.Spell.SummonAnimal = function() {
    RG.Spell.SummonBase.call(this, 'SummonAnimal', 10);

    this.summonFunc = actor => {
        const casterLevel = this.getCaster().get('Experience').getExpLevel();
        const minDanger = Math.round(casterLevel / 3) || 1;
        const maxDanger = Math.round(casterLevel / 2);
        return (actor.type === 'animal' &&
            (actor.danger >= minDanger && actor.danger <= maxDanger)
        );
    };

};
RG.extend2(RG.Spell.SummonAnimal, RG.Spell.SummonBase);

/* A spell to summon an ice minion to fight for the caster. */
RG.Spell.SummonDead = function() {
    RG.Spell.SummonBase.call(this, 'SummonDead', 15);
    this.nActors = 4;
    this.summonFunc = actor => {
        return (actor.type === 'undead' &&
            actor.name !== this.getCaster().getName());
    };
};
RG.extend2(RG.Spell.SummonDead, RG.Spell.SummonBase);

/* PowerDrain spell which cancels enemy spell and gives power to the caster of
* this spell. */
RG.Spell.PowerDrain = function() {
    RG.Spell.Base.call(this, 'PowerDrain', 15);
    this._duration = RG.FACT.createDie('20d5 + 10');

    this.cast = args => {
        const actor = args.src;
        const dur = this._duration.roll();
        const drainComp = new RG.Component.PowerDrain();
        RG.Component.addToExpirationComp(actor, drainComp, dur);
        RG.gameMsg('You feel protected against magic.');
    };

    this.getSelectionObject = function(actor) {
        return RG.Spell.getSelectionObjectSelf(this, actor);
    };

    this.aiShouldCastSpell = (args, cb) => {
        this.compFuncArgs = {enemy: args.enemy};
        args.compFunc = this.aiCompFunc.bind(this); // Used by aiSpellCellSelf
        return aiSpellCellSelf(args, cb);
    };

    this.aiCompFunc = actor => {
        const {enemy} = this.compFuncArgs;
        if (!actor.has('PowerDrain')) {
            if (enemy.has('SpellPower')) {
                return true;
            }
        }
        return false;

    };

};
RG.extend2(RG.Spell.PowerDrain, RG.Spell.Base);

/* Base class for Spell missiles. */
RG.Spell.Missile = function(name, power) {
    RG.Spell.Ranged.call(this, name, power);
    this.ammoName = '';

    this.getAmmoName = () => this.ammoName;

    this.cast = function(args) {
        const [x, y] = [args.src.getX(), args.src.getY()];
        const obj = {
            from: [x, y],
            target: args.target,
            spell: this,
            src: args.src,
            to: [args.target.getX(), args.target.getY()]
        };
        obj.damageType = this.damageType;
        obj.damage = this.getDice()[0].roll();
        const missComp = new RG.Component.SpellMissile();
        missComp.setArgs(obj);
        args.src.add(missComp);
    };

    this.getSelectionObject = function(actor) {
        const msg = 'Press [n/p] for next/prev target. [t] to fire.';
        RG.gameMsg(msg);
        actor.getBrain().nextTarget();
        const spell = this;
        return {
            // showMsg: () => RG.gameMsg(msg),
            select: function(code) {
                switch (code) {
                    case Keys.KEY.NEXT: {
                        actor.getBrain().nextTarget();
                        return this;
                    }
                    case Keys.KEY.PREV: {
                        actor.getBrain().prevTarget();
                        return this;
                    }
                    case Keys.KEY.TARGET: return () => {
                        const target = actor.getBrain().getTarget();
                        if (target) {
                            const spellCast = new RG.Component.SpellCast();
                            spellCast.setSource(actor);
                            spellCast.setSpell(spell);
                            spellCast.setArgs({src: actor, target});
                            actor.add(spellCast);
                            actor.getBrain().cancelTargeting();
                        }
                    };
                    default: {
                        return null;
                    }
                }
            },
            showMenu: () => false
        };
    };

    this.aiShouldCastSpell = (args, cb) => {
        const {actor, enemy} = args;
        const [eX, eY] = enemy.getXY();
        const [aX, aY] = actor.getXY();
        const getDist = RG.Path.shortestDist(eX, eY, aX, aY);
        if (getDist <= this.getRange()) {
            const spellArgs = {target: enemy, src: actor};
            cb(actor, spellArgs);
            return true;
        }
        return false;
    };

};
RG.extend2(RG.Spell.Missile, RG.Spell.Ranged);

/* IceArrow spell fires a missile to specified square. */
RG.Spell.IceArrow = function() {
    RG.Spell.Missile.call(this, 'IceArrow', 20);
    this.setRange(9);
    this.damageType = RG.DMG.ICE;
    this.ammoName = 'Lightning arrow';
};
RG.extend2(RG.Spell.IceArrow, RG.Spell.Missile);

/* Lighting arrow spell fires a missile to specified cell. */
RG.Spell.LightningArrow = function() {
    RG.Spell.Missile.call(this, 'LightningArrow', 17);
    this.setRange(8);
    this.damageType = RG.DMG.LIGHTNING;
    this.ammoName = 'Lightning arrow';
};
RG.extend2(RG.Spell.LightningArrow, RG.Spell.Missile);

/* Energy arrow spell fires a missile to specified cell. */
RG.Spell.EnergyArrow = function() {
    RG.Spell.Missile.call(this, 'EnergyArrow', 2);
    this.setRange(5);
    this.setDice([RG.FACT.createDie('1d4 + 1')]);
    this.damageType = RG.DMG.ENERGY;
    this.ammoName = 'Energy arrow';
};
RG.extend2(RG.Spell.EnergyArrow, RG.Spell.Missile);

/* MindControl spell takes over an enemy for a certain number of turns. */
RG.Spell.MindControl = function() {
    RG.Spell.Base.call(this, 'MindControl', 25);
    this._duration = RG.FACT.createDie('1d6 + 3');

    this.cast = function(args) {
        const obj = getDirSpellArgs(this, args);
        const dur = this._duration.roll();

        const mindControl = new RG.Component.MindControl();
        mindControl.setSource(args.src);
        obj.addComp = {comp: mindControl, duration: dur};

        const spellComp = new RG.Component.SpellCell();
        spellComp.setArgs(obj);
        args.src.add('SpellCell', spellComp);
    };

    this.getSelectionObject = function(actor) {
        const msg = 'Select an actor to control:';
        return RG.Spell.getSelectionObjectDir(this, actor, msg);
    };

};
RG.extend2(RG.Spell.MindControl, RG.Spell.Base);

/* Blizzard spell produce damaging effect over certain area. */
RG.Spell.Blizzard = function() {
    RG.Spell.Ranged.call(this, 'Blizzard', 35);

    this.cast = function(args) {
        const obj = {src: args.src, range: this.getRange()};
        obj.damageType = RG.DMG.ICE;
        obj.damage = this.getDice()[0].roll();
        obj.spell = this;
        const spellComp = new RG.Component.SpellArea();
        spellComp.setArgs(obj);
        args.src.add(spellComp);

        const name = args.src.getName();
        const msg = `Huge blizzard emanates from ${name}`;
        RG.gameMsg({msg, cell: args.src.getCell()});
    };

    this.getSelectionObject = function(actor) {
        return RG.Spell.getSelectionObjectSelf(this, actor);
    };
};
RG.extend2(RG.Spell.Blizzard, RG.Spell.Ranged);

/* Healing spell, duh. */
RG.Spell.Heal = function() {
    RG.Spell.Base.call(this, 'Heal', 6);
    this._healingDie = RG.FACT.createDie('2d4');

    this.cast = function(args) {
        const obj = getDirSpellArgs(this, args);
        obj.targetComp = 'Health';
        obj.set = 'addHP';
        obj.value = this._healingDie.roll();
        const spellComp = new RG.Component.SpellCell();
        spellComp.setArgs(obj);
        args.src.add('SpellCell', spellComp);
    };

    this.getSelectionObject = function(actor) {
        const msg = 'Select a direction for healing:';
        return RG.Spell.getSelectionObjectDir(this, actor, msg);
    };

    this.aiShouldCastSpell = (args, cb) => {
        return aiSpellCellFriend(args, cb);
    };

};
RG.extend2(RG.Spell.Heal, RG.Spell.Base);

RG.Spell.RingOfFire = function() {
    RG.Spell.Base.call(this, 'RingOfFire', 10);
    this._durationDie = RG.FACT.createDie('10d10');
    this._range = 2;

    this.cast = function(args) {
        const obj = getDirSpellArgs(this, args);
        obj.callback = this.castCallback.bind(this);

        const spellComp = new RG.Component.SpellSelf();
        spellComp.setArgs(obj);
        args.src.add(spellComp);
    };

    this.getSelectionObject = function(actor) {
        return RG.Spell.getSelectionObjectSelf(this, actor);
    };

    this.castCallback = () => {
        const parser = RG.ObjectShell.getParser();
        const caster = this._caster;
        const level = caster.getLevel();

        const duration = this._durationDie.roll();
        const cells = RG.Brain.getCellsAroundActor(caster, this._range);
        cells.forEach(cell => {
            if (cell.isPassable() || cell.hasActors()) {
                const fire = parser.createActor('Fire');
                level.addActor(fire, cell.getX(), cell.getY());
                const fadingComp = new RG.Component.Fading();
                fadingComp.setDuration(duration);
            }
        });
    };
};
RG.extend2(RG.Spell.RingOfFire, RG.Spell.Base);

/* Used for testing the spells. Adds all spells to given SpellBook. */
RG.Spell.addAllSpells = book => {
    book.addSpell(new RG.Spell.Blizzard());
    book.addSpell(new RG.Spell.DispelMagic());
    book.addSpell(new RG.Spell.EnergyArrow());
    book.addSpell(new RG.Spell.Flying());
    book.addSpell(new RG.Spell.FrostBolt());
    book.addSpell(new RG.Spell.GraspOfWinter());
    book.addSpell(new RG.Spell.Heal());
    book.addSpell(new RG.Spell.IceArrow());
    book.addSpell(new RG.Spell.IceShield());
    book.addSpell(new RG.Spell.IcyPrison());
    book.addSpell(new RG.Spell.LightningArrow());
    book.addSpell(new RG.Spell.LightningBolt());
    book.addSpell(new RG.Spell.MindControl());
    book.addSpell(new RG.Spell.Paralysis());
    book.addSpell(new RG.Spell.PowerDrain());
    book.addSpell(new RG.Spell.RingOfFire());
    book.addSpell(new RG.Spell.SpiritForm());
    book.addSpell(new RG.Spell.SummonAnimal());
    book.addSpell(new RG.Spell.SummonAirElemental());
    book.addSpell(new RG.Spell.SummonIceMinion());
    book.addSpell(new RG.Spell.SummonDead());
};

module.exports = RG.Spell;

