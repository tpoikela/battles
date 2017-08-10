
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
RG.Spell.Catalog = function(actor) {
    const _actor = actor;
    const _spells = [];

    this.getActor = function() {return _actor;};

    this.addSpell = function(spell) {
        _spells.push(spell);
    };

    this.getSpells = function() {
        return _spells;
    };

    this.getSelectionObject = function() {
        const powerSorted = _spells.sort(compareSpells);
        return {
            select: function(code) {
                RG.gameMsg('Please select a spell to cast:');
                const selection = RG.codeToIndex(code);
                return powerSorted[selection].getSelectionObject(actor);
            },
            getMenu: function() {
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

};

RG.Spell.FrostBolt = function() {
    RG.Spell.Base.call(this, 'Frost bolt');

    const _damageDie = RG.FACT.createDie('4d4 + 4');
    const _range = 5;

    this.cast = function(args) {
        console.log('Casting frost bolt now');
        const src = args.src;
        const map = src.getLevel().getMap();
        const dir = args.dir;
        const dX = dir[0];
        const dY = dir[1];

        let x = src.getX();
        let y = src.getY();
        let rangeLeft = _range;

        while (rangeLeft > 0) {
            x += dX;
            y += dY;
            console.log('FrostBolt at x, y ' + x + ',' + y);
            const cell = map.getCell(x, y);
            if (cell.hasActors()) {
                // Deal some damage etc
                const dmg = new RG.Component.Damage();
                dmg.setSource(src);
                dmg.setDamageType('ice');
                dmg.setDamage(_damageDie.roll());
                const actor = cell.getActors()[0];
                actor.add('Damage', dmg);
                console.log('FrostBolt hit actor ' + actor.getName());
                RG.gameMsg({cell: cell, msg: 'Frost bolt hits '
                    + actor.getName()});
            }
            if (!cell.isSpellPassable()) {
                rangeLeft = 0;
            }
            --rangeLeft;
        }

    };

    this.toString = function() {
        let str = `${this.getName()} - ${this.getPower()}pp`;
        str = `D: ${_damageDie.toString()} R: ${_range}`;
        return str;
    };

    this.getSelectionObject = function(actor) {
        RG.gameMsg('Select a direction for firing:');
        return {
            select: (code) => {
                const args = {};
                args.dir = [1, 0];
                args.src = actor;
                return this.cast.bind(this, args);
            },
            showMenu: () => false
        };
    };

};
RG.extend2(RG.Spell.FrostBolt, RG.Spell.Base);

module.exports = RG.Spell;
