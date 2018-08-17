
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
RG.Component = require('./component');
RG.Random = require('./random');

const RNG = RG.Random.getRNG();
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

const poisonActor = (actor, src, dur, dmgDie, prob) => {
    const poisonComp = new RG.Component.Poison();
    poisonComp.setDamageDie(dmgDie);

    const expiration = new RG.Component.Expiration();
    expiration.addEffect(poisonComp, dur);

    // Need owner to assign exp correctly
    poisonComp.setSource(src);

    poisonComp.setProb(prob);
    actor.add(poisonComp);
    actor.add(expiration);
};

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

/* Returns selection object for spell which required choosing a direction. */
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

/* Returns args object for directional spell. */
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

//------------------------------------------------------
/* @class SpellBook
 * A list of spells known by a single actor. */
//------------------------------------------------------
RG.Spell.SpellBook = function(actor) {
    this._actor = actor;
    this._spells = [];
    if (RG.isNullOrUndef([this._actor])) {
        RG.err('Spell.SpellBook', 'new',
            'actor must be given.');
    }
};

RG.Spell.SpellBook.prototype.getActor = function() {
    return this._actor;
};

RG.Spell.SpellBook.prototype.addSpell = function(spell) {
    this._spells.push(spell);
    spell.setCaster(this.getActor());
};

RG.Spell.SpellBook.prototype.getSpells = function() {
    return this._spells;
};

RG.Spell.SpellBook.prototype.equals = function(rhs) {
    const rhsSpells = rhs.getSpells();
    let equals = true;
    this._spells.forEach((spell, i) => {
        console.log(JSON.stringify(spell));
        console.log(JSON.stringify(rhsSpells[i]));
        equals = equals && spell.equals(rhsSpells[i]);
        if (!equals) {
            console.log('NOT EQUALS ANYMORE');

        }
    });
    return equals;
};

    /* Returns the object which is used in Brain.Player to make the player
     * selection of spell casting. */
RG.Spell.SpellBook.prototype.getSelectionObject = function() {
    const powerSorted = this._spells;
    return {
        select: code => {
            const selection = Keys.codeToIndex(code);
            if (selection < powerSorted.length) {
                return powerSorted[selection].getSelectionObject(this._actor);
            }
            return null;
        },
        getMenu: () => {
            RG.gameMsg('Please select a spell to cast:');
            const indices = Keys.menuIndices.slice(0, this._spells.length);
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

RG.Spell.SpellBook.prototype.toJSON = function() {
    return {
        spells: this._spells.map(spell => spell.toJSON())
    };
};

//------------------------------------------------------
/* @class RG.Spell.Base
 * Base object for all spells. */
//------------------------------------------------------
RG.Spell.Base = function(name, power) {
    this._name = name;
    this._power = power || 5;
    this._caster = null;
    this._dice = {};
    this._range = 0;
    this.setName(name);
};

RG.Spell.Base.prototype.setCaster = function(caster) {
   this._caster = caster;
};

RG.Spell.Base.prototype.getCaster = function() {
    return this._caster;
};

RG.Spell.Base.prototype.setName = function(name) {
    const nameSplit = name.split(/\s+/);
    const capNames = [];
    nameSplit.forEach(name => {
        capNames.push(name.capitalize());
    });
    this._new = capNames.join('');
};

RG.Spell.Base.prototype.getName = function() {
    return this._name;
};

RG.Spell.Base.prototype.getPower = function() {
    return this._power;
};

RG.Spell.Base.prototype.getRange = function() {
    return this._range;
};

RG.Spell.Base.prototype.setRange = function(range) {
    this._range = range;
};

RG.Spell.Base.prototype.getDamage = function(perLevel = 1) {
    let damage = 0;
    if (this._dice.damage) {
        damage = this._dice.damage.roll();
    }
    const expLevel = this._caster.get('Experience').getExpLevel();
    damage += Math.round(expLevel / perLevel);
    return damage;
};

RG.Spell.Base.prototype.setPower = function(power) {this._power = power;};

RG.Spell.Base.prototype.getCastFunc = function(actor, args) {
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

RG.Spell.Base.prototype.toString = function() {
    let str = `${this.getName()} - ${this.getPower()}PP`;
    if (this._dice.damage) {
        str += ` Dmg: ${this._dice.damage.toString()}`;
    }
    if (this._dice.duration) {
        str += ` Dur: ${this._dice.duration.toString()}`;
    }
    if (this._range > 0) {str += ` R: ${this.getRange()}`;}
    return str;
};

RG.Spell.Base.prototype.equals = function(rhs) {
    let equals = this.getName() === rhs.getName();
    equals = equals && this.getPower() === rhs.getPower();
    equals = equals && this.getRange() === rhs.getRange();
    Object.keys(this._dice).forEach(key => {
        if (rhs._dice[key]) {
            equals = equals && this._dice[key].equals(rhs._dice[key]);
        }
        else {
            equals = false;
        }
    });
    return equals;
};

RG.Spell.Base.prototype.setDice = function(name, dice) {
    if (typeof dice === 'string') {
        this._dice[name] = RG.FACT.createDie(dice);
    }
    else if (dice.roll) {
        this._dice[name] = dice;
    }
};

RG.Spell.Base.prototype.getDice = function(name) {
    return this._dice[name];
};

RG.Spell.Base.prototype.toJSON = function() {
    const dice = {};
    Object.keys(this._dice).forEach(key => {
        dice[key] = this._dice[key].toJSON();
    });
    return {
        name: this.getName(),
        new: this._new,
        power: this.getPower(),
        dice,
        range: this._range
    };
};

//------------------------------------------------------
/* @class RG.Spell.AddComponent
 * Base class for spells which add components to entities. */
//------------------------------------------------------
RG.Spell.AddComponent = function(name, power) {
    RG.Spell.Base.call(this, name, power);
    this._compName = '';
    this._dice.duration = RG.FACT.createDie('1d6 + 3');

};
RG.extend2(RG.Spell.AddComponent, RG.Spell.Base);

RG.Spell.AddComponent.prototype.setDuration = function(die) {
    this._dice.duration = die;
};

RG.Spell.AddComponent.prototype.setCompName = function(name) {
    this._compName = name;
};

RG.Spell.AddComponent.prototype.getCompName = function() {
    return this._compName;
};

RG.Spell.AddComponent.prototype.cast = function(args) {
    const obj = getDirSpellArgs(this, args);
    const dur = this._dice.duration.roll();

    const compToAdd = RG.Component.create(this._compName);
    if (compToAdd.setSource) {
        compToAdd.setSource(args.src);
    }
    obj.addComp = {comp: compToAdd, duration: dur};

    const spellComp = new RG.Component.SpellCell();
    spellComp.setArgs(obj);
    args.src.add('SpellCell', spellComp);
};

RG.Spell.AddComponent.prototype.getSelectionObject = function(actor) {
    const msg = 'Select a direction for the spell:';
    return RG.Spell.getSelectionObjectDir(this, actor, msg);
};

//------------------------------------------------------
/* @class RG.Spell.Flying
 * Adds Component flying to the given entity. */
//------------------------------------------------------
RG.Spell.Flying = function() {
    RG.Spell.AddComponent.call(this, 'Flying', 5);
    this.setCompName('Flying');
    this._dice.duration = RG.FACT.createDie('10d5 + 5');

    this.aiShouldCastSpell = (args, cb) => {
        return aiSpellCellFriend(args, cb);
    };
};
RG.extend2(RG.Spell.Flying, RG.Spell.AddComponent);

//------------------------------------------------------
/* @class RG.Spell.Paralysis
 * Adds Component Paralysis to the given entity. */
//------------------------------------------------------
RG.Spell.Paralysis = function() {
    RG.Spell.AddComponent.call(this, 'Paralysis', 7);
    this.setCompName('Paralysis');
    this.setDuration(RG.FACT.createDie('1d6 + 2'));

    this.aiShouldCastSpell = (args, cb) => {
        return aiSpellCellEnemy(args, cb);
    };
};
RG.extend2(RG.Spell.Paralysis, RG.Spell.AddComponent);

//------------------------------------------------------
/* @class RG.Spell.SpiritForm
 * Adds Component Ethereal to the given entity. */
//------------------------------------------------------
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
/* @class RG.Spell.RemoveComponent
 * Base object for spells removing other components. */
//------------------------------------------------------
RG.Spell.RemoveComponent = function(name, power) {
    RG.Spell.Base.call(this, name, power);
    this._compNames = [];

    this.setCompNames = comps => {
        if (typeof comps === 'string') {
            this._compNames = [comps];
        }
        else {
            this._compNames = comps;
        }
    };
    this.getCompNames = () => this._compNames;

    this.cast = function(args) {
        const obj = getDirSpellArgs(this, args);
        obj.removeComp = this._compNames;

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
    this._dice.damage = RG.FACT.createDie('4d4 + 4');
    this._range = 5;

};
RG.extend2(RG.Spell.Ranged, RG.Spell.Base);

/* A spell for melee combat using grasp of winter. */
RG.Spell.GraspOfWinter = function() {
    RG.Spell.Base.call(this, 'Grasp of winter');
    this._dice.damage = RG.FACT.createDie('4d4 + 4');

    this.cast = function(args) {
        const obj = getDirSpellArgs(this, args);
        obj.damageType = RG.DMG.ICE;
        obj.damage = this.getDamage();
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

RG.Spell.BoltBase = function(name, power) {
    RG.Spell.Ranged.call(this, name, power);

    this.cast = function(args) {
        const obj = getDirSpellArgs(this, args);
        obj.damageType = this.damageType;
        obj.damage = this.getDice('damage').roll();
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
    this.setDice('damage', RG.FACT.createDie('4d4 + 4'));
    this.setRange(5);
    this.damageType = RG.DMG.ICE;
};
RG.extend2(RG.Spell.FrostBolt, RG.Spell.BoltBase);

/* Class Frost bolt which shoots a ray to one direction from the caster. */
RG.Spell.LightningBolt = function() {
    RG.Spell.BoltBase.call(this, 'Lightning bolt', 8);
    this.damageType = RG.DMG.LIGHTNING;
    this.setRange(6);
    this.setDice('damage', RG.FACT.createDie('6d3 + 3'));
};
RG.extend2(RG.Spell.LightningBolt, RG.Spell.BoltBase);

/* Class Frost bolt which shoots a ray to one direction from the caster. */
RG.Spell.ScorpionsTail = function() {
    RG.Spell.BoltBase.call(this, 'Scorpions tail', 1);
    this.damageType = RG.DMG.MELEE;
    this.setRange(2);
    this.setDice('damage', RG.FACT.createDie('2d4 + 2'));
};
RG.extend2(RG.Spell.ScorpionsTail, RG.Spell.BoltBase);

/* Create a poison hit. */
RG.Spell.ScorpionsTail.prototype.onHit = function(actor, src) {
    const expLevel = src.get('Experience').getExpLevel();
    const dmgDie = new RG.Die(1, expLevel, Math.ceil(expLevel / 3));
    const prob = 0.05 * expLevel;
    const durDie = new RG.Die(2, expLevel, Math.ceil(expLevel / 2));
    const dur = durDie.roll();
    poisonActor(actor, src, dur, dmgDie, prob);
};

RG.Spell.CrossBolt = function() {
    RG.Spell.BoltBase.call(this, 'Cross bolt', 20);
    this.damageType = RG.DMG.LIGHTNING;
    this.setRange(6);
    this.setDice('damage', RG.FACT.createDie('6d3 + 3'));

    this.cast = function(args) {
        const chosenDir = args.dir;
        let dirs = RG.DIR_NSEW;
        if (chosenDir[0] !== 0 && chosenDir[1] !== 0) {
            dirs = RG.DIR_DIAG;
        }
        dirs.forEach(dXdY => {
            const newArgs = Object.assign({}, args);
            newArgs.dir = dXdY;
            const obj = getDirSpellArgs(this, newArgs);
            obj.damageType = this.damageType;
            obj.damage = this._dice.damage.roll();
            const rayComp = new RG.Component.SpellRay();
            rayComp.setArgs(obj);
            args.src.add('SpellRay', rayComp);
        });
    };

};
RG.extend2(RG.Spell.CrossBolt, RG.Spell.BoltBase);

/* Ice shield increase the defense of the caster temporarily. */
RG.Spell.IceShield = function() {
    RG.Spell.Base.call(this, 'Ice shield', 7);

    this._dice.duration = RG.FACT.createDie('5d5 + 5');
    this._dice.defense = RG.FACT.createDie('1d6 + 1');

    this.cast = args => {
        const actor = args.src;
        const dur = this._dice.duration.roll();
        const combatMods = new RG.Component.CombatMods();
        combatMods.setDefense(this._dice.defense.roll());
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
    str += ` Def: ${this._dice.defense.toString()}`;
    return str;
};

/* Magic armor increases the protection of the caster temporarily. */
RG.Spell.MagicArmor = function() {
    RG.Spell.Base.call(this, 'MagicArmor', 5);

    this._dice.duration = RG.FACT.createDie('5d5 + 5');
    this._dice.protection = RG.FACT.createDie('2d6 + 1');

    this.cast = args => {
        const actor = args.src;
        const name = actor.getName();
        const effArgs = {
            target: actor,
            name: 'CombatMods',
            setters: {
                setProtection: this._dice.protection.roll()
            },
            duration: this._dice.duration,
            startMsg: `${name} is surrounded by a protective aura`,
            endMsg: `Protective aura disappears from ${name}`
        };
        const effComp = new RG.Component.Effects(effArgs);
        effComp.setEffectType('AddComp');
        actor.add(effComp);
    };

    this.getSelectionObject = function(actor) {
        return RG.Spell.getSelectionObjectSelf(this, actor);
    };

    this.aiShouldCastSpell = (args, cb) => {
        return aiSpellCellFriend(args, cb);
    };

};
RG.extend2(RG.Spell.MagicArmor, RG.Spell.Base);

RG.Spell.MagicArmor.prototype.toString = function() {
    let str = RG.Spell.Base.prototype.toString.call(this);
    str += ` Pro: ${this._dice.protection.toString()}`;
    return str;
};

/* IcyPrison spell which paralyses actors for a certain duration. */
RG.Spell.IcyPrison = function() {
    RG.Spell.Base.call(this, 'Icy prison', 10);
    this._dice.duration = RG.FACT.createDie('1d8 + 1');

    this.cast = function(args) {
        const obj = getDirSpellArgs(this, args);
        const dur = this._dice.duration.roll();

        const paralysis = new RG.Component.Paralysis();
        paralysis.setSource(args.src);
        obj.addComp = {comp: paralysis, duration: dur};

        const spellComp = new RG.Component.SpellCell();
        spellComp.setArgs(obj);
        args.src.add(spellComp);
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
                    const [x, y] = RNG.arrayGetRand(coord);
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
        // At the moment is failing, when summoner becomes too high-level

        if (minion) {
            level.addActor(minion, x, y);
            minion.addFriend(caster);
            caster.addFriend(minion);

            const name = caster.getName();
            const summonName = minion.getName();
            const msg = `${name} summons ${summonName}!`;
            RG.gameMsg({cell, msg});
        }
        else {
            let msg = `Failed to create summon type |${this.summonType}|`;
            if (this.summonFunc) {
                const funcStr = this.summonFunc.toString();
                msg = `summonFunc ${funcStr} gave no actors`;
            }
            RG.warn('Spell.SummonBase', '_createAndActor', msg);
        }
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
        let minDanger = Math.round(casterLevel / 3) || 1;
        if (minDanger > 10) {minDanger = 10;}

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
    this._dice.duration = RG.FACT.createDie('20d5 + 10');

    this.cast = args => {
        const actor = args.src;
        const dur = this._dice.duration.roll();
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
        obj.damage = this._dice.damage.roll();
        const missComp = new RG.Component.SpellMissile();
        missComp.setArgs(obj);
        args.src.add(missComp);
    };

    this.getSelectionObject = function(actor) {
        const msg = 'Press [n/p] for next/prev target. [t] to fire.';
        RG.gameMsg(msg);
        actor.getBrain().startTargeting();
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

//------------------------------------------------------
/* IceArrow spell fires a missile to specified square. */
//------------------------------------------------------
RG.Spell.IceArrow = function() {
    RG.Spell.Missile.call(this, 'IceArrow', 20);
    this.setRange(9);
    this.damageType = RG.DMG.ICE;
    this.ammoName = 'Lightning arrow';
};
RG.extend2(RG.Spell.IceArrow, RG.Spell.Missile);

//------------------------------------------------------
/* Lighting arrow spell fires a missile to specified cell. */
//------------------------------------------------------
RG.Spell.LightningArrow = function() {
    RG.Spell.Missile.call(this, 'LightningArrow', 17);
    this.setRange(8);
    this.damageType = RG.DMG.LIGHTNING;
    this.ammoName = 'Lightning arrow';
};
RG.extend2(RG.Spell.LightningArrow, RG.Spell.Missile);

//------------------------------------------------------
/* Energy arrow spell fires a missile to specified cell. */
//------------------------------------------------------
RG.Spell.EnergyArrow = function() {
    RG.Spell.Missile.call(this, 'EnergyArrow', 2);
    this.setRange(5);
    this.setDice('damage', RG.FACT.createDie('1d4 + 1'));
    this.damageType = RG.DMG.ENERGY;
    this.ammoName = 'Energy arrow';
};
RG.extend2(RG.Spell.EnergyArrow, RG.Spell.Missile);

//------------------------------------------------------
/* Rock storm shoots a missile to all directions. */
//------------------------------------------------------
RG.Spell.RockStorm = function() {
    RG.Spell.Missile.call(this, 'RockStorm', 35);
    this.setRange(4);
    this.setDice('damage', RG.FACT.createDie('5d4 + 1'));
    this.damageType = RG.DMG.MELEE;
    this.ammoName = 'Huge rock';

    this.cast = function(args) {
        const [x, y] = [args.src.getX(), args.src.getY()];
        Object.values(RG.DIR).forEach(dXdY => {
            const tX = x + this.getRange() * dXdY[0];
            const tY = y + this.getRange() * dXdY[1];
            const obj = {
                from: [x, y],
                spell: this,
                src: args.src,
                to: [tX, tY]
            };
            obj.damageType = this.damageType;
            obj.damage = this._dice.damage.roll();
            obj.destroyItem = false; // Keep rocks after firing
            const missComp = new RG.Component.SpellMissile();
            missComp.setArgs(obj);
            args.src.add(missComp);
        });
    };

    this.getSelectionObject = function(actor) {
        return RG.Spell.getSelectionObjectSelf(this, actor);
    };
};
RG.extend2(RG.Spell.RockStorm, RG.Spell.Missile);

/* MindControl spell takes over an enemy for a certain number of turns. */
RG.Spell.MindControl = function() {
    RG.Spell.Base.call(this, 'MindControl', 25);
    this._dice.duration = RG.FACT.createDie('1d6 + 3');

    this.cast = function(args) {
        const obj = getDirSpellArgs(this, args);
        const dur = this._dice.duration.roll();

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

    this.aiShouldCastSpell = (args, cb) => {
        return aiSpellCellEnemy(args, cb);
    };

};
RG.extend2(RG.Spell.MindControl, RG.Spell.Base);

RG.Spell.AreaBase = function(name, power) {
    RG.Spell.Ranged.call(this, name, power);

    this.getSelectionObject = function(actor) {
        return RG.Spell.getSelectionObjectSelf(this, actor);
    };

    this.aiShouldCastSpell = (args, cb) => {
        return aiEnemyWithinDist(args, cb, this);
    };

    this.cast = function(args) {
        const obj = {src: args.src, range: this.getRange()};
        obj.damageType = this.damageType;
        obj.damage = this._dice.damage.roll();
        obj.spell = this;
        const spellComp = new RG.Component.SpellArea();
        spellComp.setArgs(obj);
        args.src.add(spellComp);

        const name = args.src.getName();
        const msg = `Huge ${this.getName()} emanates from ${name}`;
        RG.gameMsg({msg, cell: args.src.getCell()});
    };

};
RG.extend2(RG.Spell.AreaBase, RG.Spell.Ranged);

/* Blizzard spell produce damaging effect over certain area. */
RG.Spell.Blizzard = function() {
    RG.Spell.AreaBase.call(this, 'Blizzard', 35);
    this.setDice('damage', RG.FACT.createDie('5d5 + 5'));
    this.damageType = RG.DMG.ICE;
};
RG.extend2(RG.Spell.Blizzard, RG.Spell.AreaBase);

RG.Spell.EnergyStorm = function() {
    RG.Spell.AreaBase.call(this, 'EnergyStorm', 20);
    this.setDice('damage', RG.FACT.createDie('3d4 + 3'));
    this.damageType = RG.DMG.ENERGY;
};
RG.extend2(RG.Spell.EnergyStorm, RG.Spell.AreaBase);

function aiEnemyWithinDist(args, cb, spell) {
    const {actor, enemy} = args;
    const getDist = RG.Brain.distToActor(actor, enemy);
    if (getDist <= spell.getRange()) {
        const spellArgs = {target: enemy, src: actor};
        cb(actor, spellArgs);
        return true;
    }
    return false;
}

/* Healing spell, duh. */
RG.Spell.Heal = function() {
    RG.Spell.Base.call(this, 'Heal', 6);
    this._dice.healing = RG.FACT.createDie('2d4');

    this.cast = function(args) {
        const obj = getDirSpellArgs(this, args);
        obj.targetComp = 'Health';
        obj.set = 'addHP';
        obj.value = this._dice.healing.roll();
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

RG.Spell.RingBase = function(name, power) {
    RG.Spell.Base.call(this, name, power);
    this._dice.duration = RG.FACT.createDie('10d10');
    this._range = 2;
    this._createdActor = 'Fire';

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

        const cells = RG.Brain.getCellsAroundActor(caster, this._range);
        cells.forEach(cell => {
            if (cell.isPassable() || cell.hasActors()) {
                const fire = parser.createActor(this._createdActor);
                level.addActor(fire, cell.getX(), cell.getY());
                const fadingComp = new RG.Component.Fading();
                const duration = this._dice.duration.roll();
                fadingComp.setDuration(duration);
                fire.add(fadingComp);
            }
        });
    };

    this.aiShouldCastSpell = (args, cb) => {
        return aiEnemyWithinDist(args, cb, this);
    };
};
RG.extend2(RG.Spell.RingBase, RG.Spell.Base);

RG.Spell.RingOfFire = function() {
    RG.Spell.RingBase.call(this, 'RingOfFire', 10);
    this._dice.duration = RG.FACT.createDie('10d10');
    this._range = 2;
    this._createdActor = 'Fire';
};
RG.extend2(RG.Spell.RingOfFire, RG.Spell.RingBase);

RG.Spell.RingOfFrost = function() {
    RG.Spell.RingBase.call(this, 'RingOfFrost', 10);
    this._dice.duration = RG.FACT.createDie('10d10');
    this._range = 2;
    this._createdActor = 'Ice flame';
};
RG.extend2(RG.Spell.RingOfFrost, RG.Spell.RingBase);

RG.Spell.RingOfEnergy = function() {
    RG.Spell.RingBase.call(this, 'RingOfEnergy', 10);
    this._dice.duration = RG.FACT.createDie('10d10');
    this._range = 3;
    this._createdActor = 'Forcefield';
};
RG.extend2(RG.Spell.RingOfEnergy, RG.Spell.RingBase);

RG.Spell.ForceField = function() {
    RG.Spell.Base.call(this, 'ForceField', 5);
    this._dice.duration = RG.FACT.createDie('10d10');

    this.cast = function(args) {
        const obj = getDirSpellArgs(this, args);
        obj.callback = this.castCallback.bind(this, args);

        const spellComp = new RG.Component.SpellSelf();
        spellComp.setArgs(obj);
        args.src.add(spellComp);
    };

    this.getSelectionObject = function(actor) {
        const msg = 'Select a direction for the forcefield:';
        return RG.Spell.getSelectionObjectDir(this, actor, msg);
    };

    this.castCallback = (args) => {
        const parser = RG.ObjectShell.getParser();
        const caster = this._caster;
        const level = caster.getLevel();
        const {dir} = args;
        const [pX, pY] = this._caster.getXY();
        const [tX, tY] = [pX + dir[0], pY + dir[1]];

        const cells = this.getThreeCells(level.getMap(), dir, tX, tY);
        cells.forEach(cell => {
            if (cell.isPassable() || !cell.hasActors()) {
                const forcefield = parser.createActor('Forcefield');
                level.addActor(forcefield, cell.getX(), cell.getY());
                const fadingComp = new RG.Component.Fading();
                const duration = this._dice.duration.roll();
                fadingComp.setDuration(duration);
                forcefield.add(fadingComp);
            }
        });
    };

    this.getThreeCells = function(map, dir, tX, tY) {
        if (dir[0] === 0) { // up or down
            return [
                map.getCell(tX - 1, tY),
                map.getCell(tX, tY),
                map.getCell(tX + 1, tY)
            ];
        }
        else if (dir[1] === 0) { // left or right
            return [
                map.getCell(tX, tY - 1),
                map.getCell(tX, tY),
                map.getCell(tX, tY + 1)
            ];
        }
        else if (dir[0] === -1) {
            return [
                map.getCell(tX + 1, tY),
                map.getCell(tX, tY),
                map.getCell(tX, tY - dir[1])
            ];
        }
        else {
            return [
                map.getCell(tX - 1, tY),
                map.getCell(tX, tY),
                map.getCell(tX, tY - dir[1])
            ];
        }
    };
};
RG.extend2(RG.Spell.ForceField, RG.Spell.Base);


/* Used for testing the spells. Adds all spells to given SpellBook. */
RG.Spell.addAllSpells = book => {
    book.addSpell(new RG.Spell.Blizzard());
    book.addSpell(new RG.Spell.CrossBolt());
    book.addSpell(new RG.Spell.DispelMagic());
    book.addSpell(new RG.Spell.EnergyArrow());
    book.addSpell(new RG.Spell.Flying());
    book.addSpell(new RG.Spell.ForceField());
    book.addSpell(new RG.Spell.FrostBolt());
    book.addSpell(new RG.Spell.GraspOfWinter());
    book.addSpell(new RG.Spell.Heal());
    book.addSpell(new RG.Spell.IceArrow());
    book.addSpell(new RG.Spell.IceShield());
    book.addSpell(new RG.Spell.IcyPrison());
    book.addSpell(new RG.Spell.LightningArrow());
    book.addSpell(new RG.Spell.LightningBolt());
    book.addSpell(new RG.Spell.MagicArmor());
    book.addSpell(new RG.Spell.MindControl());
    book.addSpell(new RG.Spell.Paralysis());
    book.addSpell(new RG.Spell.PowerDrain());
    book.addSpell(new RG.Spell.RingOfEnergy());
    book.addSpell(new RG.Spell.RingOfFire());
    book.addSpell(new RG.Spell.RingOfFrost());
    book.addSpell(new RG.Spell.RockStorm());
    book.addSpell(new RG.Spell.SpiritForm());
    book.addSpell(new RG.Spell.SummonAnimal());
    book.addSpell(new RG.Spell.SummonAirElemental());
    book.addSpell(new RG.Spell.SummonIceMinion());
    book.addSpell(new RG.Spell.SummonDead());
};

module.exports = RG.Spell;

