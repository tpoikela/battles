/* Contains implementations of battles-specific spells. */

import RG from '../src/rg';
import {Spell, SpellBase, SpellArgs} from '../src/spell';
import * as Component from '../src/component';
import {Dice} from '../src/dice';
import {ObjectShell} from '../src/objectshellparser';
import {Brain} from '../src/brain';
import {Random} from '../src/random';
import * as Element from '../src/element';
import {Corpse} from '../src/item';
import {TCoord} from '../src/interfaces';

type Cell = import('../src/map.cell').Cell;
type ItemBase = import('../src/item').ItemBase;

const RNG = Random.getRNG();

const {getDirSpellArgs, aiSpellCellEnemy, aiSpellCellFriend,
    aiSpellCellSelf, addPoisonEffect, addFadingActorToCell,
    aiSpellCellDone} = Spell;

/* Removes all duration components (which removes all attached
 * effects with duration). */
Spell.DispelMagic = function() {
    Spell.RemoveComponent.call(this, 'DispelMagic', 8);
    this.setCompNames('Duration');
};
RG.extend2(Spell.DispelMagic, Spell.RemoveComponent);

Spell.Charm = function() {
    SpellBase.call(this, 'Charm');
    this._dice.duration = Dice.create('10d6 + 5');
};
RG.extend2(Spell.Charm, SpellBase);

Spell.Charm.prototype.cast = function(args) {
    const obj: SpellArgs = getDirSpellArgs(this, args);
    const spellComp = new Component.SpellCell();
    obj.callback = this.charmCallback.bind(this);
    spellComp.setArgs(obj);
    args.src.add(spellComp);
};

Spell.Charm.prototype.charmCallback = function(cell: Cell): void {
    const actors = cell.getSentientActors();
    if (actors && actors.length > 0) {
        const targetActor = actors[0];
        let charmLevel = 1 + this.getCasterExpBonus(3);
        charmLevel += this.getCasterStatBonus('willpower', 3);

        const charmComp = new Component.Charm();
        charmComp.setTargetActor(targetActor.getID());
        charmComp.setLevel(charmLevel);

        const dur = this.getDuration();
        Component.addToExpirationComp(this.getCaster(), charmComp, dur);

        const caster = this.getCaster();
        const msg = `${caster.getName()} charms ${targetActor.getName()}`;
        RG.gameMsg({cell: caster.getCell(), msg});
    }
};

Spell.Charm.prototype.getSelectionObject = function(actor) {
    const msg = 'Select a direction for charming:';
    return Spell.getSelectionObjectDir(this, actor, msg);
};

Spell.Charm.prototype.aiShouldCastSpell = function(args, cb) {
    return aiSpellCellEnemy(args, cb);
};

/* A spell for melee combat using grasp of winter. */
Spell.GraspOfWinter = function() {
    SpellBase.call(this, 'Grasp of winter');
    this._dice.damage = Dice.create('4d4 + 4');
};
RG.extend2(Spell.GraspOfWinter, SpellBase);

Spell.GraspOfWinter.prototype.cast = function(args) {
    const obj: SpellArgs = getDirSpellArgs(this, args);
    obj.damageType = RG.DMG.ICE;
    obj.damage = this.getDamage();
    const spellComp = new Component.SpellCell();
    spellComp.setArgs(obj);
    args.src.add(spellComp);
};

Spell.GraspOfWinter.prototype.getSelectionObject = function(actor) {
    const msg = 'Select a direction for grasping:';
    return Spell.getSelectionObjectDir(this, actor, msg);
};

Spell.GraspOfWinter.prototype.aiShouldCastSpell = function(args, cb) {
    return aiSpellCellEnemy(args, cb);
};

//------------------------------------------------------
/* @class Spell.AnimateDead
 * Animates a dead actor from corpse */
//------------------------------------------------------
Spell.AnimateDead = function() {
    Spell.AddComponent.call(this, 'AnimateDead', 5);
    this.setCompName('Undead');
    delete this._dice.duration;

};
RG.extend2(Spell.AnimateDead, Spell.AddComponent);

Spell.AnimateDead.prototype.cast = function(args) {
    Spell.AddComponent.prototype.cast.call(this, args);
    const {src} = args;
    const spellCell = src.get('SpellCell');
    const spellArgs = spellCell.getArgs();
    // Add callback for resurrect
    spellArgs.callback = this.animateCallback.bind(this);
};

Spell.AnimateDead.prototype.animateCallback = function(cell: Cell) {
    const compTypes = ['Named', 'Stats', 'Combat', 'Experience'];
    const caster = this.getCaster();
    if (!cell.hasItems()) {return;}

    const items: ItemBase[] = cell.getItems();
    const corpseItem: ItemBase = items.find((i: ItemBase) => /corpse/.test(i.getName()));
    if (!corpseItem) {
        RG.warn('AnimateDead', 'animateCallback',
            `No corpses found. Should not have cast the spell at all`);
        return;
    }
    const corpse = corpseItem as Corpse;

    if (corpse.has('Undead')) {
        const msg = `${caster.getName()} fails to reanimate undead remains`;
        RG.gameMsg({cell: caster.getCell(), msg});
        return;
    }

    if (corpse) {
        const parser = ObjectShell.getParser();
        const actor = parser.createActor(corpse.getActorName());
        actor.add(new Component.Undead());
        compTypes.forEach(compType => {
            const comp = corpse.get(compType);
            actor.remove(compType);
            comp.changeEntity(actor);
        });

        // Update the rendering info to show undead actor differently
        actor.get('Named').prepend('undead ');
        RG.addCellStyle(RG.TYPE_ACTOR, actor.get('Named').getName(),
            'cell-actor-undead');

        const [x, y] = corpse.getXY();
        const level = caster.getLevel();
        const createdComp = new Component.Created();
        createdComp.setCreator(caster);
        actor.add(createdComp);
        actor.add(new Component.Undead());

        if (level.removeItem(corpse, x, y)) {
            level.addActor(actor, x, y);
            actor.addFriend(caster);
        }
    }
};

Spell.AnimateDead.prototype.aiShouldCastSpell = (args, cb) => {
    const caster = args.actor;
    const cells = Brain.getCellsAroundActor(caster);
    const corpseCells: Cell[] = cells.filter(c => (
        c.hasItems() && c.getItems().find(i => (
            i.getType() === 'corpse'
        ))
    ));

    if (corpseCells.length === 0) {return false;}
    const cell = RNG.arrayGetRand(corpseCells);
    aiSpellCellDone(caster, cell, cb);
    return true;
};

//------------------------------------------------------
/* @class Spell.Flying
 * Adds Component flying to the given entity. */
//------------------------------------------------------
Spell.Flying = function() {
    Spell.AddComponent.call(this, 'Flying', 5);
    this.setCompName('Flying');
    this._dice.duration = Dice.create('10d5 + 5');

    this.aiShouldCastSpell = (args, cb) => {
        return aiSpellCellFriend(args, cb);
    };
};
RG.extend2(Spell.Flying, Spell.AddComponent);

//------------------------------------------------------
/* @class Spell.Telepathy
 * Adds Component Telepathy to the given entity. */
//------------------------------------------------------
Spell.Telepathy = function() {
    Spell.AddComponent.call(this, 'Telepathy', 5);
    this.setCompName('Telepathy');
    this._dice.duration = Dice.create('10d10 + 10');

    this.aiShouldCastSpell = (args, cb) => {
        let res = aiSpellCellFriend(args, cb);
        if (!res) {
            res = aiSpellCellEnemy(args, cb);
        }
        return res;
    };
};
RG.extend2(Spell.Telepathy, Spell.AddComponent);

/* Cast-function for Telepathy. Creates 2nd comp for addComp because it needs
 * to be added to src (caster). Uses postCallback() and is overly complicated.
 */
Spell.Telepathy.prototype.cast = function(args) {
    Spell.AddComponent.prototype.cast.call(this, args);
    const {src} = args;
    if (src) {
        const spellCell = src.get('SpellCell');
        const spellArgs = spellCell.getArgs();
        const {addComp} = spellArgs;
        const telepCompTarget = addComp.comp;

        if (telepCompTarget.getType() === 'Telepathy') {
            const {duration} = addComp;
            const telepCompSrc = telepCompTarget.clone();

            let newArgs: SpellArgs = {
                dir: [0, 0], src: this._caster, spell: null
            };
            newArgs = getDirSpellArgs(this, newArgs);
            newArgs.addComp = {comp: telepCompSrc, duration};
            spellArgs.postCallback = cell => {
                telepCompTarget.setSource(src);
                telepCompTarget.setTarget(cell.getSentientActors()[0]);
            };
            newArgs.postCallback = () => {
                telepCompSrc.setSource(telepCompTarget.getSource());
                telepCompSrc.setTarget(telepCompTarget.getTarget());
            };

            const spellComp = new Component.SpellCell();
            spellComp.setArgs(newArgs);
            args.src.add(spellComp);
        }
    }
    else {
        const json = JSON.stringify(args);
        RG.err('Spell.Telepathy', 'cast',
            'No src found in args: ' + json);
    }
};

//------------------------------------------------------
/* @class Spell.Paralysis
 * Adds Component Paralysis to the given entity. */
//------------------------------------------------------
Spell.Paralysis = function() {
    Spell.AddComponent.call(this, 'Paralysis', 7);
    this.setCompName('Paralysis');
    this.setDuration(Dice.create('1d6 + 2'));

    this.aiShouldCastSpell = (args, cb) => {
        return aiSpellCellEnemy(args, cb);
    };
};
RG.extend2(Spell.Paralysis, Spell.AddComponent);

Spell.StunningTouch = function() {
    Spell.AddComponent.call(this, 'StunningTouch', 7);
    this.setCompName('Stun');
    this.setDuration(Dice.create('1d6 + 2'));

    this.aiShouldCastSpell = (args, cb) => {
        return aiSpellCellEnemy(args, cb);
    };
};
RG.extend2(Spell.StunningTouch, Spell.AddComponent);

//------------------------------------------------------
/* @class Spell.SpiritForm
 * Adds Component Ethereal to the given entity. */
//------------------------------------------------------
Spell.SpiritForm = function() {
    Spell.AddComponent.call(this, 'SpiritForm', 10);
    this.setCompName('Ethereal');
    this.setDuration(Dice.create('1d6 + 4'));

    this.aiShouldCastSpell = (args, cb) => {
        return aiSpellCellFriend(args, cb);
    };
};
RG.extend2(Spell.SpiritForm, Spell.AddComponent);

/* Class Frost bolt which shoots a ray to one direction from the caster. */
Spell.FrostBolt = function() {
    Spell.BoltBase.call(this, 'Frost bolt', 5);
    this.setDice('damage', Dice.create('4d4 + 4'));
    this.setRange(5);
    this.damageType = RG.DMG.ICE;
};
RG.extend2(Spell.FrostBolt, Spell.BoltBase);

/* Class Frost bolt which shoots a ray to one direction from the caster. */
Spell.LightningBolt = function() {
    Spell.BoltBase.call(this, 'Lightning bolt', 8);
    this.damageType = RG.DMG.LIGHTNING;
    this.setRange(6);
    this.setDice('damage', Dice.create('6d3 + 3'));
};
RG.extend2(Spell.LightningBolt, Spell.BoltBase);

/* Class Frost bolt which shoots a ray to one direction from the caster. */
Spell.ScorpionsTail = function() {
    Spell.BoltBase.call(this, 'Scorpions tail', 1);
    this.damageType = RG.DMG.MELEE;
    this.setRange(2);
    this.setDice('damage', Dice.create('2d4 + 2'));
};
RG.extend2(Spell.ScorpionsTail, Spell.BoltBase);

/* Create a poison hit. */
Spell.ScorpionsTail.prototype.onHit = function(actor, src) {
    addPoisonEffect(actor, src);
};

Spell.ShadowRay = function() {
    Spell.BoltBase.call(this, 'Shadow ray', 8);
    this.setDice('damage', Dice.create('6d4 + 4'));
    this.setRange(8);
    this.damageType = RG.DMG.NECRO;
};
RG.extend2(Spell.ShadowRay, Spell.BoltBase);

Spell.CrossBolt = function() {
    Spell.BoltBase.call(this, 'Cross bolt', 20);
    this.damageType = RG.DMG.LIGHTNING;
    this.setRange(6);
    this.setDice('damage', Dice.create('6d3 + 3'));

    this.cast = function(args) {
        const chosenDir = args.dir;
        let dirs = RG.DIR_NSEW;
        if (chosenDir[0] !== 0 && chosenDir[1] !== 0) {
            dirs = RG.DIR_DIAG;
        }
        dirs.forEach(dXdY => {
            const newArgs = Object.assign({}, args);
            newArgs.dir = dXdY;
            const obj: SpellArgs = getDirSpellArgs(this, newArgs);
            obj.damageType = this.damageType;
            obj.damage = this.rollDice('damage');
            const rayComp = new Component.SpellRay();
            rayComp.setArgs(obj);
            args.src.add(rayComp);
        });
    };

};
RG.extend2(Spell.CrossBolt, Spell.BoltBase);


Spell.PoisonBreath = function() {
    Spell.BoltBase.call(this, 'PoisonBreath', 8);
    this.setDice('damage', Dice.create('6d4 + 4'));
    this.setRange(8);
    this.damageType = RG.DMG.POISON;
    this.nActors = 2;
    this.stopOnHit = true;
    this._createdActor = 'Poison gas';
    this._dice.duration = Dice.create('5d5 + 5');
};
RG.extend2(Spell.PoisonBreath, Spell.BoltBase);

Spell.PoisonBreath.prototype.onHit = function(actor, src) {
    addPoisonEffect(actor, src);
    const parser = ObjectShell.getParser();
    const cells: Cell[] = Brain.getCellsAroundActor(actor, 1);

    for (let i = 0; i < this.nActors; i++) {
        const cell = RNG.arrayGetRand(cells);
        if (cell.isPassable() || cell.hasActors()) {
            const cloud = parser.createActor(this._createdActor);
            addFadingActorToCell(cloud, cell, this);
        }
    }
    const msg = `Poison clouds spread from poison breath of ${src.getName()}`;
    RG.gameSuccess({cell: actor.getCell(), msg});
};

Spell.WaterBolt = function() {
    Spell.BoltBase.call(this, 'WaterBolt', 10);
    this.setDice('damage', Dice.create('4d4 + 4'));
    this.setRange(5);
    this.damageType = RG.DMG.WATER;
};
RG.extend2(Spell.WaterBolt, Spell.BoltBase);


Spell.SlimeBolt = function() {
    Spell.BoltBase.call(this, 'SlimeBolt', 10);
    this.setDice('damage', Dice.create('4d4 + 4'));
    this.setRange(5);
    this.damageType = RG.DMG.SLIME;
    this.stopOnHit = true;
};
RG.extend2(Spell.SlimeBolt, Spell.BoltBase);

Spell.SlimeBolt.prototype.onHit = function(actor, src) {
    const level = actor.getLevel();
    const cells = Brain.getCellsAroundActor(actor, 1);
    cells.forEach(cell => {
        if (cell.isPassable() || cell.hasActors()) {
            const slime = new Element.ElementSlime();
            level.addElement(slime, cell.getX(), cell.getY());
        }
    });
    actor.add(new Component.Entrapped());
    const msg = `Slime is spread around by ${src.getName()}`;
    RG.gameSuccess({cell: actor.getCell(), msg});
};

/* Ice shield increase the defense of the caster temporarily. */
Spell.IceShield = function() {
    SpellBase.call(this, 'Ice shield', 6);

    this._dice.duration = Dice.create('5d5 + 15');
    this._dice.defense = Dice.create('1d6 + 3');

    this.cast = args => {
        const actor = args.src;
        const dur = this.getDuration();
        const combatMods = new Component.CombatMods();
        combatMods.setDefense(this.rollDice('defense'));
        Component.addToExpirationComp(actor, combatMods, dur);
        RG.gameMsg({cell: actor.getCell(),
            msg: `${actor.getName()} is surrounded by defensive aura`});
    };

    this.getSelectionObject = function(actor) {
        return Spell.getSelectionObjectSelf(this, actor);
    };

    this.aiShouldCastSpell = (args, cb) => {
        return aiSpellCellFriend(args, cb);
    };

};
RG.extend2(Spell.IceShield, SpellBase);

Spell.IceShield.prototype.toString = function() {
    let str = SpellBase.prototype.toString.call(this);
    str += ` Def: ${this._dice.defense.toString()}`;
    return str;
};

/* Magic armor increases the protection of the caster temporarily. */
Spell.MagicArmor = function() {
    SpellBase.call(this, 'MagicArmor', 5);

    this._dice.duration = Dice.create('6d5 + 15');
    this._dice.protection = Dice.create('2d6 + 2');

    this.cast = args => {
        const actor = args.src;
        const name = actor.getName();
        const effArgs = {
            target: actor,
            name: 'CombatMods',
            setters: {
                setProtection: this.rollDice('protection')
            },
            duration: this._dice.duration,
            startMsg: `${name} is surrounded by a protective aura`,
            expireMsg: `Protective aura disappears from ${name}`
        };
        const effComp = new Component.Effects(effArgs);
        effComp.setEffectType('AddComp');
        actor.add(effComp);
    };

    this.getSelectionObject = function(actor) {
        return Spell.getSelectionObjectSelf(this, actor);
    };

    this.aiShouldCastSpell = (args, cb) => {
        return aiSpellCellFriend(args, cb);
    };

};
RG.extend2(Spell.MagicArmor, SpellBase);

Spell.MagicArmor.prototype.toString = function() {
    let str = SpellBase.prototype.toString.call(this);
    str += ` Pro: ${this._dice.protection.toString()}`;
    return str;
};

/* IcyPrison spell which paralyses actors for a certain duration. */
Spell.IcyPrison = function() {
    SpellBase.call(this, 'Icy prison', 10);
    this._dice.duration = Dice.create('1d8 + 1');

    this.cast = function(args) {
        const obj: SpellArgs = getDirSpellArgs(this, args);
        const dur = this.getDuration();

        const paralysis = new Component.Paralysis();
        paralysis.setSource(args.src);
        obj.addComp = {comp: paralysis, duration: dur};

        const spellComp = new Component.SpellCell();
        spellComp.setArgs(obj);
        args.src.add(spellComp);
    };

    this.getSelectionObject = function(actor) {
        const msg = 'Select a direction for casting:';
        return Spell.getSelectionObjectDir(this, actor, msg);
    };

    this.aiShouldCastSpell = (args, cb) => {
        return aiSpellCellEnemy(args, cb);
    };

};
RG.extend2(Spell.IcyPrison, SpellBase);

/* A spell to summon an ice minion to fight for the caster. */
Spell.SummonIceMinion = function() {
    Spell.SummonBase.call(this, 'SummonIceMinion', 14);
    this.summonType = 'Ice minion';

};
RG.extend2(Spell.SummonIceMinion, Spell.SummonBase);

/* A spell to summon an ice minion to fight for the caster. */
Spell.SummonAirElemental = function() {
    Spell.SummonBase.call(this, 'SummonAirElemental', 20);
    this.summonFunc = actor => {
        return actor.name === 'air elemental';
    };
};
RG.extend2(Spell.SummonAirElemental, Spell.SummonBase);

Spell.SummonUndeadUnicorns = function() {
    Spell.SummonBase.call(this, 'SummonUndeadUnicorns', 15);
    this.nActors = '1d4 + 1';
    this.summonFunc = actor => {
        return actor.name === 'undead unicorn';
    };
};
RG.extend2(Spell.SummonUndeadUnicorns, Spell.SummonBase);

/* A spell to summon an animal to fight for the caster. */
Spell.SummonAnimal = function() {
    Spell.SummonBase.call(this, 'SummonAnimal', 10);

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
RG.extend2(Spell.SummonAnimal, Spell.SummonBase);

/* A spell to summon an ice minion to fight for the caster. */
Spell.SummonDead = function() {
    Spell.SummonBase.call(this, 'SummonDead', 15);
    this.nActors = 4;
    this.summonFunc = actor => {
        return (actor.type === 'undead' &&
            actor.name !== this.getCaster().getName());
    };
};
RG.extend2(Spell.SummonDead, Spell.SummonBase);

/* Summon some spiders. */
Spell.SummonSpiders = function() {
    Spell.SummonBase.call(this, 'SummonSpiders', 10);
    this.nActors = '1d4 + 1';

    this.summonFunc = actor => {
        const expComp = this.getCaster().get('Experience');
        const danger = expComp.getDanger();
        const expLevel = expComp.getExpLevel();
        const totalDanger = danger + Math.round(expLevel / 2);
        const casterName = this.getCaster().getName();
        return (/spider/.test(actor.name) &&
            actor.danger <= totalDanger &&
               casterName !== actor.name);
    };

};
RG.extend2(Spell.SummonSpiders, Spell.SummonBase);

/* Based on caster's type, summons actors for help. */
Spell.SummonKin = function() {
    Spell.SummonBase.call(this, 'SummonKin', 10);

    this.summonFunc = actor => {
        const casterType = this.getCaster().getType();
        const expComp = this.getCaster().get('Experience');
        const danger = expComp.getDanger();
        const expLevel = expComp.getExpLevel();
        const totalDanger = danger + Math.round(expLevel / 2);
        return (actor.type === casterType &&
            actor.danger <= totalDanger);
    };
};
RG.extend2(Spell.SummonKin, Spell.SummonBase);


Spell.SummonFlyingEyes = function() {
    Spell.SummonBase.call(this, 'SummonFlyingEyes', 4);
    this.summonType = 'flying eye';
    this.nActors = '1d6 + 1';
    this._dice.duration = Dice.create('10d5 + 10');

    this.postSummonCallback = (cell, args, minion) => {
        // Each minion fades out after a period
        const fadingComp = new Component.Fading();
        const duration = this.getDuration();
        fadingComp.setDuration(duration);
        minion.add(fadingComp);

        // Link caster and minion with telepathy
        const teleCompTarget = new Component.Telepathy();
        teleCompTarget.setTarget(minion);
        teleCompTarget.setSource(this._caster);
        const teleCompSrc = teleCompTarget.clone();
        Component.addToExpirationComp(minion, teleCompTarget, duration);
        Component.addToExpirationComp(this._caster, teleCompSrc, duration);
    };

    /* Cast only when no telepathic connections. */
    this.aiShouldCastSpell = (args, cb) => {
        const {actor} = args;
        if (!actor.has('Telepathy')) {
            args.dir = [0, 0];
            cb(actor, args);
            return true;
        }
        return false;
    };

};
RG.extend2(Spell.SummonFlyingEyes, Spell.SummonBase);

/* PowerDrain spell which cancels enemy spell and gives power to the caster of
* this spell. */
Spell.PowerDrain = function() {
    SpellBase.call(this, 'PowerDrain', 15);
    this._dice.duration = Dice.create('20d5 + 10');

    this.cast = args => {
        const actor = args.src;
        const dur = this.getDuration();
        const drainComp = new Component.PowerDrain();
        Component.addToExpirationComp(actor, drainComp, dur);
        RG.gameMsg({cell: actor.getCell(),
          msg: `${actor.getName()} is surrounded by purple aura`});
    };

    this.getSelectionObject = function(actor) {
        return Spell.getSelectionObjectSelf(this, actor);
    };

    this.aiShouldCastSpell = (args, cb) => {
        this.compFuncArgs = {enemy: args.enemy};
        args.compFunc = this.aiCompFunc.bind(this); // Used by aiSpellCellSelf
        return aiSpellCellSelf(args, cb);
    };

    this.aiCompFunc = actor => {
        const {enemy} = this.compFuncArgs;
        if (!enemy) {return false;}

        if (!actor.has('PowerDrain')) {
            if (enemy.has('SpellPower')) {
                return true;
            }
        }
        return false;

    };

};
RG.extend2(Spell.PowerDrain, SpellBase);

//------------------------------------------------------
/* IceArrow spell fires a missile to specified square. */
//------------------------------------------------------
Spell.IceArrow = function() {
    Spell.Missile.call(this, 'IceArrow', 16);
    this.setRange(9);
    this.damageType = RG.DMG.ICE;
    this.ammoName = 'Ice arrow';
};
RG.extend2(Spell.IceArrow, Spell.Missile);

//------------------------------------------------------
/* Lighting arrow spell fires a missile to specified cell. */
//------------------------------------------------------
Spell.LightningArrow = function() {
    Spell.Missile.call(this, 'LightningArrow', 14);
    this.setRange(8);
    this.damageType = RG.DMG.LIGHTNING;
    this.ammoName = 'Lightning arrow';
};
RG.extend2(Spell.LightningArrow, Spell.Missile);

//------------------------------------------------------
/* Energy arrow spell fires a missile to specified cell. */
//------------------------------------------------------
Spell.EnergyArrow = function() {
    Spell.Missile.call(this, 'EnergyArrow', 2);
    this.setRange(5);
    this.setDice('damage', Dice.create('1d4 + 1'));
    this.damageType = RG.DMG.ENERGY;
    this.ammoName = 'Energy arrow';
};
RG.extend2(Spell.EnergyArrow, Spell.Missile);

Spell.Kindle = function() {
    Spell.Missile.call(this, 'Kindle', 2);
    this.setRange(5);
    this.setDice('damage', Dice.create('1d4 + 2'));
    this.damageType = RG.DMG.FIRE;
    this.ammoName = 'Fire bolt';
};
RG.extend2(Spell.Kindle, Spell.Missile);

//------------------------------------------------------
/* Poison arrow fires a missile to specified cell. Adds
 * poison to target on hit. */
//------------------------------------------------------
Spell.PoisonArrow = function() {
    Spell.Missile.call(this, 'PoisonArrow', 20);
    this.setRange(10);
    this.setDice('damage', Dice.create('1d6 + 2'));
    this.damageType = RG.DMG.POISON;
    this.ammoName = 'Poison arrow';
};
RG.extend2(Spell.PoisonArrow, Spell.Missile);

Spell.PoisonArrow.prototype.cast = function(args) {
    Spell.Missile.prototype.cast.call(this, args);
    const missComp = args.src.get('SpellMissile');
    missComp.onHit = this.onHit.bind(this);
};

Spell.PoisonArrow.prototype.onHit = function(actor) {
    const src = this._caster;
    addPoisonEffect(actor, src);
};

/* A magic arrow which entangles the target in webs. */
Spell.ArrowOfWebs = function() {
    Spell.Missile.call(this, 'ArrowOfWebs', 10);
    this.setRange(7);
    this.setDice('damage', Dice.create('1d6 + 2'));
    this.damageType = RG.DMG.PIERCE;
    this.ammoName = 'Arrow of webs';
};
RG.extend2(Spell.ArrowOfWebs, Spell.Missile);

Spell.ArrowOfWebs.prototype.cast = function(args) {
    Spell.Missile.prototype.cast.call(this, args);
    const missComp = args.src.get('SpellMissile');
    missComp.onHit = this.onHit.bind(this);
};

Spell.ArrowOfWebs.prototype.onHit = function(actor) {
    const src = this._caster;
    // TODO create a web effect, add more webs for
    // powerful casters
    const effArgs = {
        target: {target: actor.getCell()},
        targetType: ['cell'],
        elementName: 'Web', effectType: 'AddElement',
        numAllowed: 1
    };
    const effComp = new Component.Effects(effArgs);
    // effComp.setEffectType('AddElement');
    src.add(effComp);
};

//------------------------------------------------------
/* Rock storm shoots a missile to all directions. */
//------------------------------------------------------
Spell.RockStorm = function() {
    Spell.Missile.call(this, 'RockStorm', 35);
    this.setRange(4);
    this.setDice('damage', Dice.create('5d4 + 1'));
    this.damageType = RG.DMG.MELEE;
    this.ammoName = 'Huge rock';

    this.cast = function(args) {
        const [x, y] = [args.src.getX(), args.src.getY()];
        Object.values(RG.DIR).forEach(dXdY => {
            const tX = x + this.getRange() * dXdY[0];
            const tY = y + this.getRange() * dXdY[1];
            const obj: SpellArgs = {
                from: [x, y],
                spell: this,
                src: args.src,
                to: [tX, tY]
            };
            obj.damageType = this.damageType;
            obj.damage = this.getDamage();
            obj.destroyItem = false; // Keep rocks after firing
            const missComp = new Component.SpellMissile();
            missComp.setArgs(obj);
            args.src.add(missComp);
        });
    };

    this.getSelectionObject = function(actor) {
        return Spell.getSelectionObjectSelf(this, actor);
    };
};
RG.extend2(Spell.RockStorm, Spell.Missile);

/* MindControl spell takes over an enemy for a certain number of turns. */
Spell.MindControl = function() {
    SpellBase.call(this, 'MindControl', 25);
    this._dice.duration = Dice.create('1d6 + 3');

    this.cast = function(args) {
        const obj: SpellArgs = getDirSpellArgs(this, args);
        const dur = this.getDuration();

        const mindControl = new Component.MindControl();
        mindControl.setSource(args.src);
        obj.addComp = {comp: mindControl, duration: dur};

        const spellComp = new Component.SpellCell();
        spellComp.setArgs(obj);
        args.src.add(spellComp);
    };

    this.getSelectionObject = function(actor) {
        const msg = 'Select an actor to control:';
        return Spell.getSelectionObjectDir(this, actor, msg);
    };

    this.aiShouldCastSpell = (args, cb) => {
        return aiSpellCellEnemy(args, cb);
    };

};
RG.extend2(Spell.MindControl, SpellBase);

/* Blizzard spell produce damaging effect over certain area. */
Spell.Blizzard = function() {
    Spell.AreaBase.call(this, 'Blizzard', 35);
    this.setDice('damage', Dice.create('5d5 + 5'));
    this.damageType = RG.DMG.ICE;
    this.setRange(6);
};
RG.extend2(Spell.Blizzard, Spell.AreaBase);

Spell.Blizzard.prototype.onHit = function(actor /* , src*/) {
    actor.add(new Component.Coldness());
};

Spell.EnergyStorm = function() {
    Spell.AreaBase.call(this, 'EnergyStorm', 20);
    this.setDice('damage', Dice.create('3d4 + 3'));
    this.damageType = RG.DMG.ENERGY;
};
RG.extend2(Spell.EnergyStorm, Spell.AreaBase);

/* Healing spell, duh. */
Spell.Heal = function() {
    SpellBase.call(this, 'Heal', 6);
    this._dice.healing = Dice.create('2d4');

    this.cast = function(args) {
        const obj: SpellArgs = getDirSpellArgs(this, args);
        obj.targetComp = 'Health';
        obj.set = 'addHP';
        obj.value = this._dice.healing.roll();
        const spellComp = new Component.SpellCell();
        spellComp.setArgs(obj);
        args.src.add(spellComp);
    };

    this.getSelectionObject = function(actor) {
        const msg = 'Select a direction for healing:';
        return Spell.getSelectionObjectDir(this, actor, msg);
    };

    this.aiShouldCastSpell = (args, cb) => {
        return aiSpellCellFriend(args, cb);
    };

};
RG.extend2(Spell.Heal, SpellBase);

Spell.RingOfFire = function() {
    Spell.RingBase.call(this, 'RingOfFire', 10);
    this._dice.duration = Dice.create('10d10');
    this._range = 2;
    this._createdActor = 'Fire';
};
RG.extend2(Spell.RingOfFire, Spell.RingBase);

Spell.RingOfFrost = function() {
    Spell.RingBase.call(this, 'RingOfFrost', 10);
    this._dice.duration = Dice.create('10d10');
    this._range = 2;
    this._createdActor = 'Ice flame';
};
RG.extend2(Spell.RingOfFrost, Spell.RingBase);

Spell.RingOfEnergy = function() {
    Spell.RingBase.call(this, 'RingOfEnergy', 10);
    this._dice.duration = Dice.create('10d10');
    this._range = 3;
    this._createdActor = 'Forcefield';
};
RG.extend2(Spell.RingOfEnergy, Spell.RingBase);

Spell.PoisonCloud = function() {
    Spell.RingBase.call(this, 'PoisonCloud', 15);
    this._dice.duration = Dice.create('10d10');
    this._range = 1;
    this._createdActor = 'Poison gas';
};
RG.extend2(Spell.PoisonCloud, Spell.RingBase);

Spell.ForceField = function() {
    SpellBase.call(this, 'ForceField', 5);
    this._dice.duration = Dice.create('10d10');

    this.cast = function(args) {
        const obj: SpellArgs = getDirSpellArgs(this, args);
        obj.callback = this.castCallback.bind(this, args);

        const spellComp = new Component.SpellSelf();
        spellComp.setArgs(obj);
        args.src.add(spellComp);
    };

    this.getSelectionObject = function(actor) {
        const msg = 'Select a direction for the forcefield:';
        return Spell.getSelectionObjectDir(this, actor, msg);
    };

    this.castCallback = (args) => {
        const parser = ObjectShell.getParser();
        const caster = this._caster;
        const level = caster.getLevel();
        const {dir} = args;
        const [pX, pY] = this._caster.getXY();
        const [tX, tY] = [pX + dir[0], pY + dir[1]];

        const cells = getThreeCells(level.getMap(), dir, tX, tY);
        cells.forEach(cell => {
            if (cell.isPassable() || !cell.hasActors()) {
                const forcefield = parser.createActor('Forcefield');
                level.addActor(forcefield, cell.getX(), cell.getY());
                const fadingComp = new Component.Fading();
                const duration = this.getDuration();
                fadingComp.setDuration(duration);
                forcefield.add(fadingComp);
            }
        });
    };

};
RG.extend2(Spell.ForceField, SpellBase);

class IcyTouch extends Spell.MultiSpell {

    constructor() {
        super('IcyTouch', 5);
        this._spells.push(new Spell.GraspOfWinter());
        this._spells.push(new Spell.RingOfFrost());
    }

    public getSelectionObject(actor) {
        const msg = 'Select a direction for touching:';
        return Spell.getSelectionObjectDir(this, actor, msg);
    }

}
Spell.IcyTouch = IcyTouch;

Spell.addAllSpells = book => {
    book.addSpell(new Spell.AnimateDead());
    book.addSpell(new Spell.ArrowOfWebs());
    book.addSpell(new Spell.Blizzard());
    book.addSpell(new Spell.Charm());
    book.addSpell(new Spell.CrossBolt());
    book.addSpell(new Spell.DispelMagic());
    book.addSpell(new Spell.EnergyArrow());
    book.addSpell(new Spell.Flying());
    book.addSpell(new Spell.ForceField());
    book.addSpell(new Spell.FrostBolt());
    book.addSpell(new Spell.GraspOfWinter());
    book.addSpell(new Spell.Heal());
    book.addSpell(new Spell.IceArrow());
    book.addSpell(new Spell.IceShield());
    book.addSpell(new Spell.IcyPrison());
    book.addSpell(new Spell.IcyTouch());
    book.addSpell(new Spell.Kindle());
    book.addSpell(new Spell.LightningArrow());
    book.addSpell(new Spell.LightningBolt());
    book.addSpell(new Spell.MagicArmor());
    book.addSpell(new Spell.MindControl());
    book.addSpell(new Spell.Paralysis());
    book.addSpell(new Spell.PoisonArrow());
    book.addSpell(new Spell.PoisonBreath());
    book.addSpell(new Spell.PoisonCloud());
    book.addSpell(new Spell.PowerDrain());
    book.addSpell(new Spell.RingOfEnergy());
    book.addSpell(new Spell.RingOfFire());
    book.addSpell(new Spell.RingOfFrost());
    book.addSpell(new Spell.RockStorm());
    book.addSpell(new Spell.SlimeBolt());
    book.addSpell(new Spell.SpiritForm());
    book.addSpell(new Spell.SummonAirElemental());
    book.addSpell(new Spell.SummonAnimal());
    book.addSpell(new Spell.SummonDead());
    book.addSpell(new Spell.SummonFlyingEyes());
    book.addSpell(new Spell.SummonIceMinion());
    book.addSpell(new Spell.SummonKin());
    book.addSpell(new Spell.SummonUndeadUnicorns());
    book.addSpell(new Spell.Telepathy());
};

export {Spell};

/* Returns three adjacent cells based on direction. */
function getThreeCells(
    map, dir: TCoord, tX: number, tY: number): Cell[]
{
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
}
