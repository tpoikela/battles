
const RG = require('../rg');

const System = {};
System.Base = require('./system.base');

const {addSkillsExp} = System.Base;

/* System which processes the spell casting components. This system checks if
 * the spell casting succeeds and then handles PP reduction, but it does not
 * execute the effects of the spell.*/
System.SpellCast = function(compTypes) {
    System.Base.call(this, RG.SYS.SPELL_CAST, compTypes);
    this.compTypesAny = true;

    this.updateEntity = function(ent) {
        const name = ent.getName();
        const cell = ent.getCell();

        // TODO add checks for impairment, counterspells etc

        if (ent.has('SpellPower') && ent.has('SpellCast')) {
            const spellcast = ent.get('SpellCast');
            const ppComp = ent.get('SpellPower');
            const spell = spellcast.getSpell();
            if (spell.getPower() <= ppComp.getPP()) {
                const drainers = Object.values(this.entities).filter(ent => (
                    ent.has('PowerDrain')
                ));

                const args = spellcast.getArgs();
                ppComp.decrPP(spell.getPower());

                if (drainers.length === 0) {
                    spell.cast(args);
                    addSkillsExp(ent, 'SpellCasting', 1);
                }
                else if (this._checkPowerDrain(spell, args, drainers)) {
                    const msg = 'Spell was canceled by power drain.';
                    RG.gameMsg({cell: cell, msg: msg});
                }
                else {
                    // Spell drain check succeeded, can cast
                    spell.cast(args);
                    addSkillsExp(ent, 'SpellCasting', 1);
                }
            }
            else {
                const msg = `${name} has no enough power to cast spell`;
                RG.gameMsg({cell: cell, msg: msg});
            }
            ent.remove('SpellCast');
        }
    };

    /* Checks if any power drainer managers to cancel the spell. */
    this._checkPowerDrain = (spell, args, drainers) => {
        let isDrained = false;
        const srcX = args.src.getX();
        const srcY = args.src.getY();
        drainers.forEach(ent => {
            if (ent.getLevel().getID() === args.src.getLevel().getID()) {
                const drainX = ent.getX();
                const drainY = ent.getY();
                const dist = RG.Path.shortestDist(srcX, srcY, drainX, drainY);
                if (dist <= ent.get('PowerDrain').drainDist) {
                    ent.remove('PowerDrain');
                    isDrained = true;
                    if (ent.has('SpellPower')) {
                        ent.get('SpellPower').addPP(spell.getPower());
                    }
                    return;
                }
            }
        });
        return isDrained;

    };

};
RG.extend2(System.SpellCast, System.Base);

module.exports = System.SpellCast;
