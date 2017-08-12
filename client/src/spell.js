
/* File contains spell definitions for the game. */

const RG = require('./rg');
// const Mixin = require('./mixin');

RG.Spell = {};

const compareSpells = function(s1, s2) {
    if (s1.getPower() < s2.getPower()) {
        return -1;
    }
    if (s2.getPower() > s1.getPower()) {
        return 1;
    }
    return 0;
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

};

/* Base object for all spells. */
RG.Spell.Base = function(name, power) {
    const _name = name;
    let _power = power || 5;

    this.getName = function() {return _name;};

    this.getPower = function() {return _power;};
    this.setPower = function(power) {_power = power;};

    this.toString = function() {
        const str = `${_name} - ${_power}PP`;
        return str;
    };

};

RG.Spell.FrostBolt = function() {
    RG.Spell.Base.call(this, 'Frost bolt');

    const _damageDie = RG.FACT.createDie('4d4 + 4');
    const _range = 5;

    this.getRange = function() {return _range;};

    this.cast = function(args) {
        const src = args.src;
        const dir = args.dir;
        const x = src.getX();
        const y = src.getY();

        const obj = {
            from: [x, y],
            dir,
            spell: this,
            src: args.src,
            damageType: 'ice',
            damage: _damageDie.roll()
        };
        const rayComp = new RG.Component.SpellRay();
        rayComp.setArgs(obj);
        args.src.add('SpellRay', rayComp);
    };

    this.toString = function() {
        let str = `${this.getName()} - ${this.getPower()}pp`;
        str += `D: ${_damageDie.toString()} R: ${_range}`;
        return str;
    };

    this.getSelectionObject = function(actor) {
        RG.gameMsg('Select a direction for firing:');
        return {
            select: (code) => {
                const args = {};
                args.dir = RG.KeyMap.getDir(code);
                if (args.dir) {
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
            },
            showMenu: () => false
        };
    };

};
RG.extend2(RG.Spell.FrostBolt, RG.Spell.Base);

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
        if (actor.has('Expiration')) {
            actor.get('Expiration').addEffect(combatMods, dur);
        }
        else {
            const expComp = new RG.Component.Expiration();
            expComp.addEffect(combatMods, dur);
            actor.add('Expiration', expComp);
        }
        RG.gameMsg('You feel a boost to your defense.');
    };

    this.getSelectionObject = function(actor) {
        const func = () => {
            const spellCast = new RG.Component.SpellCast();
            spellCast.setSource(actor);
            spellCast.setSpell(this);
            spellCast.setArgs({src: actor});
            actor.add('SpellCast', spellCast);
        };
        return func;
    };

};
RG.extend2(RG.Spell.IceShield, RG.Spell.Base);

RG.Spell.GraspOfWinter = function() {
    RG.Spell.Base.call(this, 'Grasp of winter');
    const _damageDie = RG.FACT.createDie('4d4 + 4');

    this.cast = function(args) {
        console.log('Casting winters grasp');
        const src = args.src;
        const dir = args.dir;
        const x = src.getX();
        const y = src.getY();

        const obj = {
            from: [x, y],
            dir,
            spell: this,
            src: args.src,
            damageType: 'ice',
            damage: _damageDie.roll()
        };
        const spellComp = new RG.Component.SpellCell();
        spellComp.setArgs(obj);
        args.src.add('SpellCell', spellComp);
    };

    this.getSelectionObject = function(actor) {
        RG.gameMsg('Select a direction for grasping:');
        return {
            select: (code) => {
                const args = {};
                args.dir = RG.KeyMap.getDir(code);
                if (args.dir) {
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
            },
            showMenu: () => false
        };
    };
};
RG.extend2(RG.Spell.GraspOfWinter, RG.Spell.Base);

module.exports = RG.Spell;
