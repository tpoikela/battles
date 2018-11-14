
import RG from '../rg';
import {SystemBase} from './system.base';
import {Random} from '../random';
import {EventPool} from '../eventpool';
import * as Component from '../component';

const RNG = Random.getRNG();

// Messages emitted for each disability
const _msg = {
    Paralysis: {
        Attack: 'cannot attack under paralysis',
        Movement: 'cannot move under paralysis',
        SpellCast: 'cannot cast spells under paralysis'
    },
    Stun: {
        Attack: 'is too stunned to attack',
        Movement: 'is stunned, and stumbles',
        SpellCast: 'is too stunned to cast spells'
    }
};

interface FuncTable {
    [key: string]: (ent) => void;
}

/* Stun system removes Movement/Attack components from actors to prevent. */
export class SystemDisability extends SystemBase {

    private _compOrder: string[];
    private _actComp: string[];
    private _dispatchTable: {[key: string]: FuncTable};

    constructor(compTypes, pool?) {
        super(RG.SYS.DISABILITY, compTypes, pool);
        this.compTypesAny = true; // Triggered on at least one component

        // Callbacks to execute for each disability
        this._dispatchTable = {
            Paralysis: {
                Attack: ent => {
                    ent.remove('Attack');
                    this._emitMsg('Paralysis', 'Attack', ent);
                },
                Movement: ent => {
                    ent.remove('Movement');
                    this._emitMsg('Paralysis', 'Movement', ent);
                },
                SpellCast: ent => {
                    ent.remove('SpellCast');
                    this._emitMsg('Paralysis', 'SpellCast', ent);
                },
                UseStairs: ent => {
                    ent.remove('UseStairs');
                    this._emitMsg('Paralysis', 'Movement', ent);
                }
            },
            Stun: {
                Attack: ent => {
                    ent.remove('Attack');
                    this._emitMsg('Stun', 'Attack', ent);
                },
                // Stun moves actor to random direction if they try to attack
                Movement: ent => {
                    const dir = RNG.getRandDir();
                    const [x, y] = RG.newXYFromDir(dir, ent);
                    ent.remove('Movement');
                    const map = ent.getLevel().getMap();
                    if (map.hasXY(x, y)) {
                        const movComp = new Component.Movement(x, y,
                            ent.getLevel());
                        ent.add(movComp);
                    }
                    this._emitMsg('Stun', 'Movement', ent);
                },
                SpellCast: ent => {
                    ent.remove('SpellCast');
                    this._emitMsg('Stun', 'SpellCast', ent);
                },
                UseStairs: ent => {
                    if (RG.isSuccess(0.5)) {
                        ent.remove('UseStairs');
                        this._emitMsg('Stun', 'Movement', ent);

                    }
                }
            }
        };

        // Processing order of the components
        this._compOrder = ['Paralysis', 'Stun'];
        this._actComp = ['Attack', 'Movement', 'SpellCast'];
    }

    updateEntity(ent) {
        this._compOrder.forEach(compName => {
            if (ent.has(compName)) {
                this._actComp.forEach(actCompName => {
                    if (ent.has(actCompName)) {
                        this._dispatchTable[compName][actCompName](ent);
                    }
                });
            }
        });
    }

    _emitMsg(comp, actionComp, ent) {
        const cell = ent.getCell();
        const entName = ent.getName();
        const msg = `${entName} ${_msg[comp][actionComp]}`;
        RG.gameMsg({cell, msg});
    }
}
