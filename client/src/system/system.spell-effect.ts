
import RG from '../rg';
import {SystemBase} from './system.base';
import * as Component from '../component';
import {ObjectShell} from '../objectshellparser';
import {Geometry} from '../geometry';

import {SpellArgs} from '../spell';
import {TCoord, TCoord3D, IAnimArgs} from '../interfaces';

type BaseActor = import('../actor').BaseActor;
type Entity = import('../entity').Entity;
type EventPool = import('../eventpool').EventPool;

const {addSkillsExp} = SystemBase;

const spellEffects = ['SpellRay', 'SpellCell', 'SpellMissile', 'SpellArea',
    'SpellSelf', 'SpellWave'];

/* SpellEffect system processes the actual effects of spells, and creates damage
 * dealing components etc. An example if FrostBolt which creates SpellRay
 * component for each cell it's travelling to. */
export class SystemSpellEffect extends SystemBase {
    private _dtable: {[key: string]: (ent: Entity, comp: object) => void};

    constructor(compTypes: string[], pool: EventPool) {
        super(RG.SYS.SPELL_EFFECT, compTypes, pool);
        this.compTypesAny = true; // Process with any relavant Spell comp

        // Defines which function is called to process that particular type of
        // spell effect component, each accepts (ent, spellComp)
        this._dtable = {
            SpellRay: this.processSpellRay.bind(this),
            SpellCell: this.processSpellCell.bind(this),
            SpellMissile: this.processSpellMissile.bind(this),
            SpellArea: this.processSpellArea.bind(this),
            SpellSelf: this.processSpellSelf.bind(this),
            SpellWave: this.processSpellWave.bind(this),
        };

        if (spellEffects.length !== Object.keys(this._dtable).length) {
            RG.err('SystemSpellEffect', 'constructor',
                'spellEffects and dtable keys length does not match');
        }

    }

    /* For each different spell effect, grabs a list of components (if any
     * exist), then calls the corresponding function in dtable. */
    public updateEntity(ent: Entity): void {
        spellEffects.forEach((effName: string) => {
            if (ent.has(effName)) {
                const effCompList = ent.getList(effName);
                effCompList.forEach(effComp => {
                    // Call function in dtable matching the effect name
                    this._dtable[effName](ent, effComp);
                    ent.remove(effComp); // Don't call in processXXX functions
                });
            }
        });
    }

    public processSpellRay(ent: Entity, ray): void {
        const args: SpellArgs = ray.getArgs();
        let actor: null | BaseActor = null;
        if (RG.isActor(ent)) {
            actor = ent as BaseActor;
        }
        else {
            const msg = JSON.stringify(ent);
            RG.err('SystemSpellEffect', 'processSpellRay',
                `RayComps only supported on actors. Got: ${msg}`);
            return;
        }
        const map = actor.getLevel().getMap();
        const spell = args.spell;
        const name = spell.getName();

        if (!args.from || !args.dir) {
            RG.err('SystemSpellEffect', 'processSpellRay',
                `Args must have from and dir. Got ${JSON.stringify(args)}`);
            return;
        }

        let [x, y] = args.from;
        const [dX, dY] = args.dir;
        let rangeLeft = spell.getRange();
        let rangeCrossed = 0;

        while (rangeLeft > 0) {
            x += dX;
            y += dY;
            if (map.hasXY(x, y)) {
                const cell = map.getCell(x, y);
                if (spell.onCellCallback) {
                    spell.onCellCallback(cell);
                }

                if (cell.hasActors()) {
                    // Deal some damage etc
                    const tActor = cell.getActors()[0];
                    const actorName = tActor.getName();
                    const stopSpell = tActor.has('SpellStop');
                    if (stopSpell || this.rayHitsActor(tActor, rangeLeft)) {
                        this._addDamageToActor(tActor, args);

                        if (stopSpell) {
                            rangeLeft = 0;
                            RG.gameMsg({cell,
                                msg: `${name} is stopped by ${actorName}`});
                        }
                        else if (spell.stopOnHit) {
                            rangeLeft = 0;
                        }

                        // TODO add some evasion checks
                        // TODO add onHit callback for spell because
                        // not all spells cause damage
                        RG.gameMsg({cell,
                            msg: `${name} hits ${actorName}`});
                    }
                    else {
                        RG.gameMsg({cell,
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
            className: RG.getDmgClassName(args.damageType),
            level: actor.getLevel()
        };
        const animComp = new Component.Animation(animArgs);
        ent.add(animComp);
    }

    /* Returns true if the spell ray hits the given actor. */
    public rayHitsActor(actor: Entity, rangeLeft: number): boolean {
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
    }

    public processSpellCell(ent: Entity, spellComp) {
        const args = spellComp.getArgs();
        const actor = RG.toActor(ent);
        const map = actor.getLevel().getMap();
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
                const tActor = targetCell.getActors()[0];

                // Spell targeting specific component, for example stat boost
                if (args.targetComp) {
                    const setFunc = args.set;
                    const getFunc = args.get;
                    if (tActor.has(args.targetComp)) {
                        const comp = tActor.get(args.targetComp);
                        const actorName = tActor.getName();
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
                            if (tActor.has('Expiration')) {
                                tActor.get('Expiration').addEffect(comp, dur);
                            }
                            else {
                                const expComp = new Component.Expiration();
                                expComp.addEffect(comp, dur);
                                tActor.add(expComp);
                            }
                            tActor.add(comp);
                        }
                        else { // Permanent component, no duration given
                            tActor.add(comp);
                        }
                    }
                    else {
                        const json = JSON.stringify(args);
                        RG.err('SystemSpellEffect', 'processSpellCell',
                            `args.addComp.comp must be defined. Args: ${json}`);
                    }

                    const compType = comp.getType();
                    const msg = `${tActor.getName()} seems to have ${compType}`;
                    RG.gameMsg({cell: tActor.getCell(), msg});
                }
                else if (args.removeComp) {
                    args.removeComp.forEach((compName: string) => {
                        if (tActor.has(compName)) {
                            tActor.removeAll(compName);
                        }
                    });
                }
                else {
                    // Deal some damage etc
                    this._addDamageToActor(tActor, args);
                    // TODO add some evasion checks
                    // TODO add onHit callback for spell because not all spells
                    // cause damage
                    RG.gameMsg({cell: targetCell,
                        msg: `${name} hits ${tActor.getName()}`});
                }
            }

            if (args.postCallback) {
                args.postCallback(targetCell);
            }

            addSingleCellAnim(ent, args, [x, y]);
        }
    }

    public processSpellMissile(ent: Entity, spellComp) {
        const args = spellComp.getArgs();
        const spell = args.spell;
        const parser = ObjectShell.getParser();

        const ammoName = spell.getAmmoName();
        if (!ammoName) {
            RG.err('System.SpellEffect', 'processSpellMissile',
               `No |ammoName| set for spell ${spell.getName()}`);
        }

        const spellArrow = parser.createItem(ammoName);
        const mComp = new Component.Missile(args.src);
        mComp.setTargetXYZ(args.to[0], args.to[1], args.to[2]);
        mComp.destroyItem = true;
        if (args.hasOwnProperty('destroyItem')) {
            mComp.destroyItem = args.destroyItem;
        }
        mComp.setDamage(args.damage);
        mComp.setAttack(100);
        mComp.setRange(spell.getRange());

        // Check if onHit callback given, and pass it to Missile
        if (args.onHit && !spellComp.onHit) {
            mComp.onHit = args.onHit;
        }
        else if (spellComp.onHit && !args.onHit) {
            mComp.onHit = spellComp.onHit;
        }
        else if (spellComp.onHit && args.onHit) {
            RG.err('SystemSpellEffect', 'processSpellMissile',
                'onHit given in both SpellMissile and its args');
        }

        spellArrow.add(mComp);
    }

    /* Processes area-affecting spell effects. */
    public processSpellArea(ent: Entity, spellComp) {
        // const spellComp = ent.get('SpellArea');
        const args = spellComp.getArgs();
        const spell = args.spell;
        const range = spell.getRange();
        const [x0, y0] = [args.src.getX(), args.src.getY()];
        const map = args.src.getLevel().getMap();
        const coord = Geometry.getBoxAround(x0, y0, range);

        coord.forEach((xy: TCoord) => {
            if (map.hasXY(xy[0], xy[1])) {
                const cell = map.getCell(xy[0], xy[1]);
                if (cell.hasActors()) {
                    const actors = cell.getActors();
                    for (let i = 0; i < actors.length; i++) {
                        this._addDamageToActor(actors[i], args);
                        if (spell.onCellCallback) {
                            spell.onCellCallback(cell);
                        }
                        const name = actors[i].getName();
                        RG.gameMsg({cell: actors[i].getCell(),
                            msg: `${name} is hit by ${spell.getName()}`});
                    }

                }
            }
        });

        // Create animation
        const animArgs = {
            range, cX: x0, cY: y0,
            className: RG.getDmgClassName(args.damageType),
            level: RG.toActor(ent).getLevel()
        };
        const animComp = new Component.Animation(animArgs);
        ent.add(animComp);
    }

    /* Used for spell cast on self (or spells not requiring any targets). */
    public processSpellSelf(ent, spellComp) {
        const args = spellComp.getArgs();
        if (typeof args.callback === 'function') {
            args.callback();
        }
        else {
            let msg = 'args.callback must be a function. ';
            msg += 'Got args: ' + JSON.stringify(args);
            RG.err('SystemSpellEffect', 'processSpellSelf', msg);
        }
        addSingleCellAnim(ent, args, ent.getXY());
    }

    public processSpellWave(ent: Entity, spellComp) {
        const args = spellComp.getArgs();
        const spell = args.spell;
        const parser = ObjectShell.getParser();
        const waveActor = spell.getWaveActor();
        if (!waveActor) {
            RG.err('System.SpellEffect', 'processSpellWave',
               `No |waveActor| set for spell ${spell.getName()}`);
        }
        console.log('processSpellWave entered with args', args);

        const width = spell.getWaveWidth();
        const depth = spell.getWaveDepth();
        const waveSpeed = spell.getWaveSpeed();
        const [x0, y0, z0] = args.from;
        const [x1, y1, z1] = args.to;
        const level = ent.get('Location').getLevel();

        // Take bresenham from 0 -> 1, then calculate rest of the wavepaths
        // based on this bresenham line
        const line: TCoord3D[] = Geometry.lineFuncUnique3D(args.from, args.to);

        if (line.length === 0) {
            const msg = `${spell.getName()} fizzles and fails!`;
            const loc = ent.get('Location');
            RG.gameMsg({msg, cell: loc.getCell()});
            return;
        }
        const midW = Math.floor(width / 2);

        // const dX = x1 - x0;
        // const dY = y1 - x1;
        // 2 cases for wave start pos: k<=1 and k > 0
        const k = Math.abs((y1 - y0) / (x1 - x0));
        for (let w = 0; w < width; w++) {
            // Diff to middle wave
            const dW = w - midW;
            // How we modify original wave
            let modX = 0;
            let modY = 0;

            // Stack wave actors as vertical line
            if (k <= 1) {
                modY = dW;
            }
            // Stack wave actors as horizontal line
            else {
                modX = dW;
            }

            for (let d = 0; d < depth; d++) {
                const actorWave = parser.createActor(waveActor);
                if (actorWave) {
                    actorWave.get('Stats').setSpeed(waveSpeed);
                    actorWave.getBrain().line = line.slice(2).map((xyz: TCoord3D) => (
                        [xyz[0] + modX, xyz[1] + modY, xyz[2]]
                    ));
                    actorWave.getBrain().delay = d;
                    const [xs, ys, zs] = line[1];
                    level.addActor(actorWave, xs + modX, ys + modY);
                }
            }

        }
    }

    public _addDamageToActor(actor, args): void {
        const dmg = new Component.Damage();
        if (!RG.isEntity(args.src)) {
            RG.err('SystemSpellEffect', '_addDamageToActor',
                `src must be entity. Got args ${JSON.stringify(args)}`);
        }
        dmg.setSource(args.src);
        dmg.setDamageType(args.damageType);
        dmg.setDamage(args.damage);
        dmg.setDamageCateg(RG.DMG.MAGIC);
        dmg.setWeapon(args.spell);
        actor.add(dmg);
    }
}

function addSingleCellAnim(ent, args, xy) {
    let className = RG.getDmgClassName(args.damageType);
    if (!className) {className = RG.getDmgClassName(RG.DMG.MAGIC);}

    const animArgs: IAnimArgs = {
        cell: true,
        coord: [xy],
        className,
        level: ent.getLevel()
    };
    const animComp = new Component.Animation(animArgs);
    ent.add(animComp);
}
