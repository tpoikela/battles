
/* File contains spell definitions for the game.
 * Each spell should contain at least:
 *   1. cast()
 *   2. getSelectionObject()
 *   3. aiShouldCastSpell (optional)
 *   4. getCastFunc (optional)
 *
 * where 3&4 are used with spellcaster AI. Without these, the spell cannot be
 * used by AI.
 *
 */
const RG = require('./rg');
// const Mixin = require('./mixin');

RG.Spell = {};

// Defaults (starting values) for spells
/*const defaults = {
    FrostBolt: {
        power: 5,
        damage: '4d4 + 4',
        range: 5
    }
};*/

/* Used for sorting the spells by spell power. */
const compareSpells = function(s1, s2) {
    if (s1.getPower() < s2.getPower()) {
        return -1;
    }
    if (s2.getPower() > s1.getPower()) {
        return 1;
    }
    return 0;
};

const addToExpirationComp = function(actor, comp, dur) {
    if (actor.has('Expiration')) {
        actor.get('Expiration').addEffect(comp, dur);
    }
    else {
        const expComp = new RG.Component.Expiration();
        expComp.addEffect(comp, dur);
        actor.add(expComp);
    }
    actor.add(comp);
};

RG.Spell.getSelectionObjectSelf = function(spell, actor) {
    const func = () => {
        const spellCast = new RG.Component.SpellCast();
        spellCast.setSource(actor);
        spellCast.setSpell(spell);
        spellCast.setArgs({src: actor});
        actor.add(spellCast);
    };
    return func;
};

RG.Spell.getSelectionObjectDir = function(spell, actor, msg) {
    RG.gameMsg(msg);
    return {
        select: (code) => {
            const args = {};
            args.dir = RG.KeyMap.getDir(code);
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

const getDirSpellArgs = function(spell, args) {
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

    this.getActor = function() {return _actor;};

    this.addSpell = function(spell) {
        _spells.push(spell);
    };

    this.getSpells = function() {
        return _spells;
    };

    /* Returns the object which is used in Brain.Player to make the player
     * selection of spell casting. */
    this.getSelectionObject = function() {
        const powerSorted = _spells.sort(compareSpells);
        return {
            select: function(code) {
                const selection = RG.codeToIndex(code);
                if (selection < powerSorted.length) {
                    return powerSorted[selection].getSelectionObject(actor);
                }
                return null;
            },
            getMenu: function() {
                RG.gameMsg('Please select a spell to cast:');
                const indices = RG.menuIndices.slice(0, _spells.length);
                const obj = {};
                powerSorted.forEach((spell, index) => {
                    obj[indices[index]] = spell.toString();
                });
                return obj;
            },
            showMenu: () => true
        };
    };

    this.toJSON = function() {
        return {
            spells: _spells.map(spell => spell.toJSON())
        };
    };
};

/* Base object for all spells. */
RG.Spell.Base = function(name, power) {
    const _name = name;
    let _power = power || 5;

    this.getName = function() {return _name;};

    this.getPower = function() {return _power;};
    this.setPower = function(power) {_power = power;};


};

RG.Spell.Base.prototype.toString = function() {
    const str = `${this.getName()} - ${this.getPower()}PP`;
    return str;
};

RG.Spell.Base.prototype.toJSON = function() {
    return {
        power: this.getPower()
    };
};

/* Base class for ranged spells. */
RG.Spell.Ranged = function(name, power) {
    RG.Spell.Base.call(this, name, power);

    let _damageDie = RG.FACT.createDie('4d4 + 4');
    let _range = 5;

    this.getRange = function() {return _range;};
    this.setRange = function(range) {_range = range;};
    this.setDice = function(dice) {
        _damageDie = dice[0];
    };
    this.getDice = function() {return [_damageDie];};


};
RG.extend2(RG.Spell.Ranged, RG.Spell.Base);

RG.Spell.Ranged.prototype.toString = function() {
    let str = `${this.getName()} - ${this.getPower()} pp`;
    str += ` D: ${this.getDice()[0].toString()} R: ${this.getRange()}`;
    return str;
};

RG.Spell.Ranged.prototype.toJSON = function() {
    return {
        name: this.getName(),
        power: this.getPower(),
        range: this.getRange(),
        dice: [this.getDice()[0].toJSON()]
        // new: should be added by child classes
    };
};

/* A spell for melee combat using grasp of winter. */
RG.Spell.GraspOfWinter = function() {
    RG.Spell.Base.call(this, 'Grasp of winter');
    const _damageDie = RG.FACT.createDie('4d4 + 4');

    this.cast = function(args) {
        const obj = getDirSpellArgs(this, args);
        obj.damageType = RG.DMG.ICE;
        obj.damage = _damageDie.roll();
        const spellComp = new RG.Component.SpellCell();
        spellComp.setArgs(obj);
        args.src.add('SpellCell', spellComp);
    };

    this.getSelectionObject = function(actor) {
        const msg = 'Select a direction for grasping:';
        return RG.Spell.getSelectionObjectDir(this, actor, msg);
    };
};
RG.extend2(RG.Spell.GraspOfWinter, RG.Spell.Base);

/* Class Frost bolt which shoots a ray to one direction from the caster. */
RG.Spell.FrostBolt = function() {
    RG.Spell.Ranged.call(this, 'Frost bolt', 5);

    this.cast = function(args) {
        const obj = getDirSpellArgs(this, args);
        obj.damageType = RG.DMG.ICE;
        obj.damage = this.getDice()[0].roll();
        const rayComp = new RG.Component.SpellRay();
        rayComp.setArgs(obj);
        args.src.add('SpellRay', rayComp);
    };


    this.getSelectionObject = function(actor) {
        RG.gameMsg('Select a direction for firing:');
        return {
            select: (code) => {
                const dir = RG.KeyMap.getDir(code);
                return this.getCastFunc(actor, {dir});
            },
            showMenu: () => false
        };
    };

    this.getCastFunc = function(actor, args) {
        if (args.dir) {
            args.src = actor;
            return () => {
                const spellCast = new RG.Component.SpellCast();
                spellCast.setSource(actor);
                spellCast.setSpell(this);
                spellCast.setArgs(args);
                actor.add('SpellCast', spellCast);
                console.log('Added SpellCast comp');
            };
        }
        return null;
    };

    this.toJSON = function() {
        return {
            name: this.getName(),
            power: this.getPower(),
            range: this.getRange(),
            dice: [this.getDice()[0].toJSON()],
            new: 'FrostBolt'
        };
    };

    this.aiShouldCastSpell = function(args) {
        const {actor, enemy} = args;
        const [x0, y0] = [actor.getX(), actor.getY()];
        const [x1, y1] = [enemy.getX(), enemy.getY()];
        const lineXY = RG.Geometry.getStraightLine(x0, y0, x1, y1);
        if (lineXY.length > 1) {
            const dX = lineXY[1][0] - lineXY[0][0];
            const dY = lineXY[1][1] - lineXY[0][1];
            actor.getBrain().setSpellArgs({dir: [dX, dY]});
            return true;
        }
        return false;
    };

};
RG.extend2(RG.Spell.FrostBolt, RG.Spell.Ranged);

/* Ice shield increase the defense of the caster temporarily. */
RG.Spell.IceShield = function() {
    RG.Spell.Base.call(this, 'Ice shield', 7);

    const _duration = RG.FACT.createDie('5d5 + 5');
    const _defenseDie = RG.FACT.createDie('1d6 + 1');

    this.cast = function(args) {
        const actor = args.src;
        const dur = _duration.roll();
        const combatMods = new RG.Component.CombatMods();
        combatMods.setDefense(_defenseDie.roll());
        addToExpirationComp(actor, combatMods, dur);
        RG.gameMsg('You feel a boost to your defense.');
    };

    this.getSelectionObject = function(actor) {
        return RG.Spell.getSelectionObjectSelf(this, actor);
    };

};
RG.extend2(RG.Spell.IceShield, RG.Spell.Base);


/* IcyPrison spell which paralyses actors for a certain duration. */
RG.Spell.IcyPrison = function() {
    RG.Spell.Base.call(this, 'Icy prison', 10);

    const _duration = RG.FACT.createDie('1d6 + 1');

    this.cast = function(args) {
        const obj = getDirSpellArgs(this, args);
        const dur = _duration.roll();

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

};
RG.extend2(RG.Spell.IcyPrison, RG.Spell.Base);

/* A spell to summon an ice minion to fight for the caster. */
RG.Spell.SummonIceMinion = function() {
    RG.Spell.Base.call(this, 'Summon ice minion', 14);

    this.cast = function(args) {
        const obj = getDirSpellArgs(this, args);

        // Will be called by System.SpellEffect
        obj.callback = cell => {
            if (cell.isFree()) {
                const [x, y] = [cell.getX(), cell.getY()];
                const level = args.src.getLevel();

                // TODO create proper minion
                const minion = new RG.Actor.Rogue('Ice minion');
                level.addActor(minion, x, y);

                const name = args.src.getName();
                const msg = `${name} summons an ice minion!`;
                RG.gameMsg({cell, msg});
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

};
RG.extend2(RG.Spell.SummonIceMinion, RG.Spell.Base);

/* PowerDrain spell which cancels enemy spell and gives power to the caster of
* this spell. */
RG.Spell.PowerDrain = function() {
    RG.Spell.Base.call(this, 'PowerDrain', 15);
    const _duration = RG.FACT.createDie('20d5 + 10');

    this.cast = function(args) {
        const actor = args.src;
        const dur = _duration.roll();
        const drainComp = new RG.Component.PowerDrain();
        addToExpirationComp(actor, drainComp, dur);
        RG.gameMsg('You feel protected against magic.');
    };

    this.getSelectionObject = function(actor) {
        return RG.Spell.getSelectionObjectSelf(this, actor);
    };

};
RG.extend2(RG.Spell.PowerDrain, RG.Spell.Base);

/* IceArrow spell fires a missile to specified square. */
RG.Spell.IceArrow = function() {
    RG.Spell.Ranged.call(this, 'IceArrow', 20);
    this.setRange(9);

    this.cast = function(args) {
        const [x, y] = [args.src.getX(), args.src.getY()];
        const obj = {
            from: [x, y],
            target: args.target,
            spell: this,
            src: args.src,
            to: [args.target.getX(), args.target.getY()]
        };
        obj.damageType = RG.DMG.ICE;
        obj.damage = this.getDice()[0].roll();
        const missComp = new RG.Component.SpellMissile();
        missComp.setArgs(obj);
        args.src.add(missComp);
    };

    this.getSelectionObject = function(actor) {
        RG.gameMsg('Press [n] for next target. [t] to fire.');
        actor.getBrain().nextTarget();
        const spell = this;
        return {
            select: function(code) {
                switch (code) {
                    case RG.VK_n: {
                        actor.getBrain().nextTarget();
                        return this;
                    }
                    case RG.VK_t: return () => {
                        const target = actor.getBrain().getTarget();
                        const spellCast = new RG.Component.SpellCast();
                        spellCast.setSource(actor);
                        spellCast.setSpell(spell);
                        spellCast.setArgs({src: actor, target});
                        actor.add(spellCast);
                        actor.getBrain().cancelTargeting();
                    };
                    default: {
                        return null;
                    }
                }
            },
            showMenu: () => false
        };
    };
};
RG.extend2(RG.Spell.IceArrow, RG.Spell.Ranged);

/* MindControl spell takes over an enemy for a certain number of turns. */
RG.Spell.MindControl = function() {
    RG.Spell.Base.call(this, 'MindControl', 25);
    const _duration = RG.FACT.createDie('1d6 + 3');

    this.cast = function(args) {
        const obj = getDirSpellArgs(this, args);
        const dur = _duration.roll();

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

/* MindControl spell takes over an enemy for a certain number of turns. */
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
        RG.gameMsg('Your surroundings are engulfed in blizzard!');
    };

    this.getSelectionObject = function(actor) {
        console.log('Blizzard getSelectionObject');
        return RG.Spell.getSelectionObjectSelf(this, actor);
    };
};
RG.extend2(RG.Spell.Blizzard, RG.Spell.Ranged);

/* Healing spell, duh. */
RG.Spell.Heal = function() {
    RG.Spell.Base.call(this, 'Heal', 6);

    const _healingDie = RG.FACT.createDie('2d4');

    this.cast = function(args) {
        const obj = getDirSpellArgs(this, args);
        obj.targetComp = 'Health';
        obj.set = 'addHP';
        obj.value = _healingDie.roll();
        const spellComp = new RG.Component.SpellCell();
        spellComp.setArgs(obj);
        args.src.add('SpellCell', spellComp);
    };

    this.getSelectionObject = function(actor) {
        const msg = 'Select a direction for healing:';
        return RG.Spell.getSelectionObjectDir(this, actor, msg);
    };
};
RG.extend2(RG.Spell.Heal, RG.Spell.Base);

/* Used for testing the spells. Adds all spells to given SpellBook. */
RG.Spell.addAllSpells = function(book) {
    book.addSpell(new RG.Spell.FrostBolt());
    book.addSpell(new RG.Spell.IceShield());
    book.addSpell(new RG.Spell.GraspOfWinter());
    book.addSpell(new RG.Spell.IcyPrison());
    book.addSpell(new RG.Spell.SummonIceMinion());
    book.addSpell(new RG.Spell.PowerDrain());
    book.addSpell(new RG.Spell.IceArrow());
    book.addSpell(new RG.Spell.MindControl());
    book.addSpell(new RG.Spell.Blizzard());
    book.addSpell(new RG.Spell.Heal());
};

module.exports = RG.Spell;

