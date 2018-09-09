
const RG = require('../rg');

const System = {};
System.Base = require('./system.base');

const {addSkillsExp} = System.Base;

const spellEffects = ['SpellRay', 'SpellCell', 'SpellMissile', 'SpellArea',
    'SpellSelf'];

/* SpellEffect system processes the actual effects of spells, and creates damage
 * dealing components etc. An example if FrostBolt which creates SpellRay
 * component for each cell it's travelling to. */
System.SpellEffect = function(compTypes) {
    System.Base.call(this, RG.SYS.SPELL_EFFECT, compTypes);
    this.compTypesAny = true; // Process with any relavant Spell comp

    // Defines which function is called to process that particular type of
    // spell effect component, each accepts (ent, spellComp)
    this._dtable = {
        SpellRay: this.processSpellRay.bind(this),
        SpellCell: this.processSpellCell.bind(this),
        SpellMissile: this.processSpellMissile.bind(this),
        SpellArea: this.processSpellArea.bind(this),
        SpellSelf: this.processSpellSelf.bind(this)
    };

};
RG.extend2(System.SpellEffect, System.Base);

/* For each different spell effect, grabs a list of components (if any
 * exist), then calls the corresponding function in dtable. */
System.SpellEffect.prototype.updateEntity = function(ent) {
    spellEffects.forEach(effName => {
        if (ent.has(effName)) {
            const effCompList = ent.getList(effName);
            effCompList.forEach(effComp => {
                // Call function in dtable matching the effect name
                this._dtable[effName](ent, effComp);
                ent.remove(effComp); // Don't call in processXXX functions
            });
        }
    });
};

System.SpellEffect.prototype.processSpellRay = function(ent, ray) {
    const args = ray.getArgs();
    const map = ent.getLevel().getMap();
    const spell = args.spell;
    const name = spell.getName();

    let [x, y] = args.from;
    const [dX, dY] = args.dir;
    let rangeLeft = spell.getRange();
    let rangeCrossed = 0;

    while (rangeLeft > 0) {
        x += dX;
        y += dY;
        if (map.hasXY(x, y)) {
            const cell = map.getCell(x, y);
            if (cell.hasActors()) {
                // Deal some damage etc
                const actor = cell.getActors()[0];
                const actorName = actor.getName();
                const stopSpell = actor.has('SpellStop');
                if (stopSpell || this.rayHitsActor(actor, rangeLeft)) {
                    this._addDamageToActor(actor, args);

                    if (stopSpell) {
                        rangeLeft = 0;
                        RG.gameMsg({cell: cell,
                            msg: `${name} is stopped by ${actorName}`});
                    }

                    // TODO add some evasion checks
                    // TODO add onHit callback for spell because
                    // not all spells cause damage
                    RG.gameMsg({cell: cell,
                        msg: `${name} hits ${actorName}`});
                }
                else {
                    RG.gameMsg({cell: cell,
                        msg: `${name} misses ${actorName}`});
                }
            }
            if (!cell.isSpellPassable()) {
                rangeLeft = 0;
            }
            else {
                ++rangeCrossed;
            }
            --rangeLeft;
        }
        else {
            rangeLeft = 0;
        }
    }
    const animArgs = {
        dir: args.dir,
        ray: true,
        from: args.from,
        range: rangeCrossed,
        style: args.damageType,
        level: ent.getLevel()
    };
    const animComp = new RG.Component.Animation(animArgs);
    ent.add('Animation', animComp);
};


System.SpellEffect.prototype.rayHitsActor = function(actor, rangeLeft) {
    if (!actor.has('Health')) {
        return false;
    }

    let evasion = actor.get('Stats').getAgility();
    if (actor.has('Skills')) {
        evasion += actor.get('Skills').getLevel('Dodge');
    }
    evasion -= rangeLeft;
    if (evasion < 0) {evasion = 0;}

    const hitChance = (100 - evasion) / 100;
    if (RG.isSuccess(hitChance)) {
        if (actor.has('RangedEvasion')) {
            return RG.isSuccess(0.5);
        }
        return true;
    }
    else {
        addSkillsExp(actor, 'Dodge', 1);
        return false;
    }
};

System.SpellEffect.prototype.processSpellCell = function(ent, spellComp) {
    const args = spellComp.getArgs();
    const map = ent.getLevel().getMap();
    const spell = args.spell;
    const name = spell.getName();

    const dX = args.dir[0];
    const dY = args.dir[1];
    const x = args.from[0] + dX;
    const y = args.from[1] + dY;

    if (map.hasXY(x, y)) {
        const targetCell = map.getCell(x, y);

        if (args.preCallback) {
            args.preCallback(targetCell);
        }

        // Callback given for the spell
        if (args.callback) {
            args.callback(targetCell);
        }
        else if (targetCell.hasActors()) {
            const actor = targetCell.getActors()[0];

            // Spell targeting specific component, for example stat boost
            if (args.targetComp) {
                const setFunc = args.set;
                const getFunc = args.get;
                if (actor.has(args.targetComp)) {
                    const comp = actor.get(args.targetComp);
                    const actorName = actor.getName();
                    if (getFunc) {
                        comp[setFunc](comp[getFunc()] + args.value);
                    }
                    else {
                        comp[setFunc](args.value);
                    }
                    RG.gameMsg({cell: targetCell,
                        msg: `Spell ${name} is cast on ${actorName}`});
                }
            }
            else if (args.addComp) { // Spell adding comp to entity (ie Stun)
                const comp = args.addComp.comp;

                if (comp) {
                    if (args.addComp.duration) { // Transient component
                        const dur = args.addComp.duration;
                        if (actor.has('Expiration')) {
                            actor.get('Expiration').addEffect(comp, dur);
                        }
                        else {
                            const expComp = new RG.Component.Expiration();
                            expComp.addEffect(comp, dur);
                            actor.add('Expiration', expComp);
                        }
                        actor.add(comp);
                    }
                    else { // Permanent component, no duration given
                        actor.add(comp);
                    }
                }
                else {
                    const json = JSON.stringify(args);
                    RG.err('System.SpellEffect', 'processSpellCell',
                        `args.addComp.comp must be defined. Args: ${json}`);
                }

                const compType = comp.getType();
                const msg = `${actor.getName()} seems to have ${compType}`;
                RG.gameMsg({cell: actor.getCell(), msg});
            }
            else if (args.removeComp) {
                args.removeComp.forEach(compName => {
                    if (actor.has(compName)) {
                        actor.removeAll(compName);
                    }
                });
            }
            else {
                // Deal some damage etc
                this._addDamageToActor(actor, args);
                // TODO add some evasion checks
                // TODO add onHit callback for spell because not all spells
                // cause damage
                RG.gameMsg({cell: targetCell,
                    msg: `${name} hits ${actor.getName()}`});
            }
        }

        if (args.postCallback) {
            args.postCallback(targetCell);
        }

        const animArgs = {
            cell: true,
            coord: [[x, y]],
            style: args.damageType || '',
            level: ent.getLevel()
        };
        const animComp = new RG.Component.Animation(animArgs);
        ent.add('Animation', animComp);
    }
};

System.SpellEffect.prototype.processSpellMissile = function(ent, spellComp) {
    const args = spellComp.getArgs();
    const spell = args.spell;
    const parser = RG.ObjectShell.getParser();

    const spellArrow = parser.createItem(spell.getAmmoName());
    const mComp = new RG.Component.Missile(args.src);
    mComp.setTargetXY(args.to[0], args.to[1]);
    mComp.destroyItem = true;
    if (args.hasOwnProperty('destroyItem')) {
        mComp.destroyItem = args.destroyItem;
    }
    mComp.setDamage(args.damage);
    mComp.setAttack(60);
    mComp.setRange(spell.getRange());

    spellArrow.add(mComp);
};

/* Processes area-affecting spell effects. */
System.SpellEffect.prototype.processSpellArea = function(ent, spellComp) {
    // const spellComp = ent.get('SpellArea');
    const args = spellComp.getArgs();
    const spell = args.spell;
    const range = spell.getRange();
    const [x0, y0] = [args.src.getX(), args.src.getY()];
    const map = args.src.getLevel().getMap();
    const coord = RG.Geometry.getBoxAround(x0, y0, range);

    coord.forEach(xy => {
        if (map.hasXY(xy[0], xy[1])) {
            const cell = map.getCell(xy[0], xy[1]);
            if (cell.hasActors()) {
                const actors = cell.getActors();
                for (let i = 0; i < actors.length; i++) {
                    this._addDamageToActor(actors[i], args);
                    const name = actors[i].getName();
                    RG.gameMsg({cell: actors[i].getCell(),
                        msg: `${name} is hit by ${spell.getName()}`});
                }

            }
        }
    });

    // Create animation
    const animArgs = {
        cell: true,
        coord: coord,
        style: args.damageType || '',
        level: ent.getLevel()
    };
    const animComp = new RG.Component.Animation(animArgs);
    ent.add(animComp);
};

    /* Used for spell cast on self (or spells not requiring any targets). */
System.SpellEffect.prototype.processSpellSelf = function(ent, spellComp) {
    const args = spellComp.getArgs();
    if (typeof args.callback === 'function') {
        args.callback();
    }
    else {
        let msg = 'args.callback must be a function. ';
        msg += 'Got args: ' + JSON.stringify(args);
        RG.err('System.SpellEffect', 'processSpellSelf', msg);
    }
};

System.SpellEffect.prototype._addDamageToActor = (actor, args) => {
    const dmg = new RG.Component.Damage();
    dmg.setSource(args.src);
    dmg.setDamageType(args.damageType);
    dmg.setDamage(args.damage);
    dmg.setDamageCateg(RG.DMG.MAGIC);
    dmg.setWeapon(args.spell);
    actor.add(dmg);
};


module.exports = System.SpellEffect;
