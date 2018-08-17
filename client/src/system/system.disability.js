
const RG = require('../rg');

const System = {};
System.Base = require('./system.base');

/* Stun system removes Movement/Attack components from actors to prevent. */
System.Disability = function(compTypes) {
    System.Base.call(this, RG.SYS.DISABILITY, compTypes);
    this.compTypesAny = true; // Triggered on at least one component

    // Messages emitted for each disability
    const _msg = {
        Paralysis: {
            Attack: 'cannot attack under paralysis',
            Movement: 'cannot move under paralysis',
            SpellCast: 'cannot cast spells under paralysis'
        },
        Stun: {
            Attack: 'is too stunned to attack',
            Movement: 'is too stunned to move',
            SpellCast: 'is too stunned to cast spells'
        }
    };

    // Callbacks to execute for each disability
    const _dispatchTable = {
        Paralysis: {
            Attack: ent => {
                ent.remove('Attack');
                _emitMsg('Paralysis', 'Attack', ent);
            },
            Movement: ent => {
                ent.remove('Movement');
                _emitMsg('Paralysis', 'Movement', ent);
            },
            SpellCast: ent => {
                ent.remove('SpellCast');
                _emitMsg('Paralysis', 'SpellCast', ent);
            }
        },
        Stun: {
            Attack: ent => {
                ent.remove('Attack');
                _emitMsg('Stun', 'Attack', ent);
            },
            Movement: ent => {
                ent.remove('Movement');
                _emitMsg('Stun', 'Movement', ent);
            },
            SpellCast: ent => {
                ent.remove('SpellCast');
                _emitMsg('Stun', 'SpellCast', ent);
            }
        }
    };

    // Processing order of the components
    const _compOrder = ['Paralysis', 'Stun'];
    const _actComp = ['Attack', 'Movement', 'SpellCast'];

    this.updateEntity = ent => {
        _compOrder.forEach(compName => {
            if (ent.has(compName)) {
                _actComp.forEach(actCompName => {
                    if (ent.has(actCompName)) {
                        _dispatchTable[compName][actCompName](ent);
                    }
                });
            }
        });
    };

    const _emitMsg = (comp, actionComp, ent) => {
        const cell = ent.getCell();
        const entName = ent.getName();
        const msg = `${entName} ${_msg[comp][actionComp]}`;
        RG.gameMsg({cell, msg});
    };

};
RG.extend2(System.Disability, System.Base);

module.exports = System.Disability;
