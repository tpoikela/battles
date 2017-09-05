
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

const addToExpirationComp = function(actor, comp, dur) {
    if (actor.has('Expiration')) {
        actor.get('Expiration').addEffect(comp, dur);
    }
    else {
        const expComp = new RG.Component.Expiration();
        expComp.addEffect(comp, dur);
        actor.add('Expiration', expComp);
    }
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

    this.toString = function() {
        const str = `${_name} - ${_power}PP`;
        return str;
    };

    this.toJSON = function() {
        return {
            power: _power
        };
    };

};

RG.Spell.FrostBolt = function() {
    RG.Spell.Base.call(this, 'Frost bolt');

    let _damageDie = RG.FACT.createDie('4d4 + 4');
    let _range = 5;

    this.getRange = function() {return _range;};
    this.setRange = function(range) {_range = range;};
    this.setDice = function(dice) {
        _damageDie = dice[0];
    };
    this.getDice = function() {return [_damageDie];};

    this.cast = function(args) {
        const obj = getDirSpellArgs(this, args);
        obj.damageType = 'ice';
        obj.damage = _damageDie.roll();
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
            range: _range,
            dice: [_damageDie.toJSON()],
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
        addToExpirationComp(actor, combatMods, dur);
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
        const obj = getDirSpellArgs(this, args);
        obj.damageType = 'ice';
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


RG.Spell.addAllSpells = function(book) {
    book.addSpell(new RG.Spell.FrostBolt());
    book.addSpell(new RG.Spell.IceShield());
    book.addSpell(new RG.Spell.GraspOfWinter());
    book.addSpell(new RG.Spell.IcyPrison());
    book.addSpell(new RG.Spell.Heal());
};

module.exports = RG.Spell;
