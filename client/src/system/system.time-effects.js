
const RG = require('../rg');

const System = {};
System.Base = require('./system.base');

/* System which handles time-based effects like poisoning etc. It also handles
 * expiration of effects. This is a special system because its updates are
 * scheduled by the scheduler to guarantee a specific execution interval. */
System.TimeEffects = function(compTypes) {
    System.Base.call(this, RG.SYS.TIME_EFFECTS, compTypes);
    this.compTypesAny = true;

    // Dispatch table used to call a handler function for each component
    const _dtable = {};
    let _expiredEffects = [];

    this.update = function() {
        for (const e in this.entities) {
            if (!e) {continue;}
            const ent = this.entities[e];

            // Process timed effects like poison etc.
            for (let i = 0; i < compTypes.length; i++) {
                if (compTypes[i] !== 'Expiration') {
                    if (ent.has(compTypes[i])) {
                        // Call dispatch table function
                        _dtable[compTypes[i]](ent);
                    }
                }
            }
            // Process expiration effects/duration of Expiration itself
            if (ent.has('Expiration')) {_decreaseDuration(ent);}
        }

        // Remove expired effects (mutates this.entities, so done outside for)
        // Removes Expiration, as well as comps like Poison/Stun/Disease etc.
        for (let j = 0; j < _expiredEffects.length; j++) {
            const compID = _expiredEffects[j][0];
            const entRem = _expiredEffects[j][1];
            entRem.remove(compID);
        }
        _expiredEffects = [];
    };

    /* Decreases the remaining duration in the component by one.*/
    const _decreaseDuration = ent => {
        const expirComps = ent.getList('Expiration');
        expirComps.forEach(tEff => {
            tEff.decrDuration();

            // Remove Expiration only if other components are removed
            if (!tEff.hasEffects()) {
                _expiredEffects.push([tEff.getID(), ent]);
            }
        });
    };


    /* Applies the poison effect to the entity.*/
    const _applyPoison = ent => {
        const poison = ent.get('Poison');

        if (ent.get('Health').isDead()) {
            _expiredEffects.push([poison.getID(), ent]);
            if (ent.has('Expiration')) {
                const te = ent.get('Expiration');
                if (te.hasEffect(poison)) {
                    te.removeEffect(poison);
                }
            }
        }
        else if (RG.isSuccess(poison.getProb())) {
            const poisonDmg = poison.rollDamage();
            const dmgComp = new RG.Component.Damage(poisonDmg, RG.DMG.POISON);
            dmgComp.setSource(poison.getSource());
            ent.add(dmgComp);
        }
    };

    /* Decreases duration in Fading comp, then remove the entity if duration is
     * 0. */
    const _applyFading = ent => {
        const fadingComp = ent.get('Fading');
        fadingComp.decrDuration();
        if (fadingComp.getDuration() <= 0) {
            if (RG.isActor(ent)) {
                const cell = ent.getCell();
                const level = ent.getLevel();
                if (level.removeActor(ent)) {
                    RG.POOL.emitEvent(RG.EVT_ACTOR_KILLED, {actor: ent});
                    const msg = `${ent.getName()} disappears.`;
                    RG.gameMsg({cell, msg});
                }
                else {
                    const json = JSON.stringify(ent);
                    RG.err('System.TimeEffects', '_applyFading',
                        `Could not remove actor from level: ${json}`);
                }
            }
            else {
                RG.err('System.TimeEffects', '_applyFading',
                    'Fading not handled for non-actors yet.');
            }
            ent.remove(fadingComp);
        }
    };

    const _applyHeat = ent => {
        if (ent.has('Coldness')) {
            const cell = ent.getCell();
            ent.removeAll('Coldness');
            const msg = `Thanks to heat, ${ent.getName()} stops shivering`;
            RG.gameMsg({cell, msg});
        }
        ent.removeAll('Heat');
    };

    // TODO
    const _applyColdness = ent => {
        if (ent.has('BodyTemp')) {
            const tempComp = ent.get('BodyTemp');
            tempComp.decr();
            if (tempComp.isFrozen()) {
                const dmgComp = new RG.Component.Damage(1, RG.DMG.COLD);
                ent.add(dmgComp);
            }
        }
    };

    _dtable.Poison = _applyPoison;
    _dtable.Fading = _applyFading;
    _dtable.Heat = _applyHeat;
    _dtable.Coldness = _applyColdness;

    /* Used for debug printing.*/
    this.printMatchedType = function(ent) {
        for (let i = 0; i < this.compTypes.length; i++) {
            if (ent.has(this.compTypes[i])) {
                RG.debug(this.compTypes[i], 'Has component');
            }
        }
    };

};
RG.extend2(System.TimeEffects, System.Base);

module.exports = System.TimeEffects;
