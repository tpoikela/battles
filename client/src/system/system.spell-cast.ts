
import RG from '../rg';
import {SystemBase} from './system.base';
// import * as Component from '../component';
import {Path} from '../path';
import {addRegenEffects} from './system.utils';

type EventPool = import('../eventpool').EventPool;

const {addSkillsExp} = SystemBase;

/* System which processes the spell casting components. This system checks if
 * the spell casting succeeds and then handles PP reduction, but it does not
 * execute the effects of the spell.*/
export class SystemSpellCast extends SystemBase {

    private _drainerName: string;

    constructor(compTypes: string[], pool: EventPool) {
        super(RG.SYS.SPELL_CAST, compTypes, pool);
        this.compTypesAny = true;
    }

    public updateEntity(ent) {
        const name = ent.getName();
        const cell = ent.getCell();

        // TODO add checks for impairment, counterspells etc

        if (ent.has('SpellPower') && ent.has('SpellCast')) {
            const spellcast = ent.get('SpellCast');
            const ppComp = ent.get('SpellPower');
            const spell = spellcast.getSpell();
            if (spell.getCastingPower() <= ppComp.getPP()) {
                const drainers = Object.values(this.entities).filter(e => (
                    e.has('PowerDrain')
                ));

                const args = spellcast.getArgs();
                ppComp.decrPP(spell.getCastingPower());

                // Add Comp to regenerate back the PP
                if (ent.has('Regeneration')) {
                    addRegenEffects(ent);
                }

                if (drainers.length === 0) {
                    spell.cast(args);
                    addSkillsExp(ent, 'SpellCasting', 1);
                }
                else if (this._checkPowerDrain(spell, args, drainers)) {
                    const sName = spell.getName();
                    let msg = `Spell ${sName} was canceled by power drain of`;
                    msg += ` ${this._drainerName}`; // set in checkPowerDrain()
                    RG.gameMsg({cell, msg});
                }
                else {
                    // Spell drain check succeeded, can cast
                    spell.cast(args);
                    addSkillsExp(ent, 'SpellCasting', 1);
                }
            }
            else {
                const msg = `${name} has no enough power to cast spell`;
                RG.gameMsg({cell, msg});
            }
            ent.remove('SpellCast');
        }
    }

    /* Checks if any power drainer managers to cancel the spell. */
    public _checkPowerDrain(spell, args, drainers) {
        let isDrained = false;
        const srcX = args.src.getX();
        const srcY = args.src.getY();
        this._drainerName = '';
        drainers.forEach(ent => {
            if (ent.getLevel().getID() === args.src.getLevel().getID()) {
                const drainX = ent.getX();
                const drainY = ent.getY();
                const dist = Path.shortestDist(srcX, srcY, drainX, drainY);
                if (ent.getID() !== args.src.getID()) {
                    if (dist <= ent.get('PowerDrain').drainDist) {
                        ent.remove('PowerDrain');
                        isDrained = true;
                        this._drainerName = ent.getName();

                        if (ent.has('SpellPower')) {
                            const castPower = spell.getCastingPower();
                            ent.get('SpellPower').addPP(castPower);
                        }
                        return; // from forEach loop
                    }
                }
            }
        });
        return isDrained;
    }
}
