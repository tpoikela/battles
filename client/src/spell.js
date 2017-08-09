
/* File contains spell definitions for the game. */

const RG = require('./rg');

RG.Spell = {};

RG.Spell.Base = function(name) {
    const _name = name;
    this.getName = function() {return _name;};

};

RG.Spell.FrostBolt = function() {
    RG.Spell.Base.call(this, 'Frost bolt');

    const _damageDie = RG.FACT.createDie('4d4 + 4');
    const _range = 5;
    const _power = 5;

    this.getPower = function() {return _power;};

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
            }
            if (!cell.isSpellPassable()) {
                rangeLeft = 0;
            }
            --rangeLeft;
        }

    };

};
RG.extend2(RG.Spell.FrostBolt, RG.Spell.Base);

module.exports = RG.Spell;
