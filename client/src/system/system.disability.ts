
import RG from '../rg';
import {SystemBase} from './system.base';
import {EventPool} from '../eventpool';
import * as Component from '../component';

import {Cell} from '../map.cell';

// Messages emitted for each disability
const _msg = {
    Entrapped: {
        Attack: 'cannot attack while trapped',
        AttackRanged: 'cannot attack while trapped',
        Movement: 'cannot move while trapped',
        SpellCast: 'cannot cast spells while trapped'
    },
    Paralysis: {
        Attack: 'cannot attack under paralysis',
        AttackRanged: 'cannot attack while trapped',
        Movement: 'cannot move under paralysis',
        SpellCast: 'cannot cast spells under paralysis'
    },
    Stun: {
        Attack: 'is too stunned to attack',
        AttackRanged: 'cannot attack while trapped',
        Movement: 'is stunned, and stumbles',
        SpellCast: 'is too stunned to cast spells'
    }
};

interface FuncTable {
    [key: string]: (ent) => void;
}

function removeAttack(ent, msg): void {

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
            Entrapped: {
                Attack: ent => {
                    ent.remove('Attack');
                    this._emitMsg('Paralysis', 'Attack', ent);
                },
                AttackRanged: ent => {
                    ent.remove('AttackRanged');
                    this._emitMsg('Entrapped', 'AttackRanged', ent);
                },
                // Entrapped does not directly remove Movement
                Movement: ent => {
                    this._handleEntrapped(ent);
                },
                SpellCast: ent => {
                    ent.remove('SpellCast');
                    this._emitMsg('Entrapped', 'SpellCast', ent);
                },
                UseStairs: ent => {
                    ent.remove('UseStairs');
                    this._emitMsg('Entrapped', 'UseStairs', ent);
                }
            },
            Fear: {
                Attack: ent => {
                    this._handleFear(ent, 'Attack');
                },
                Movement: ent => {
                    this._handleFear(ent, 'Movement');
                }
            },
            Paralysis: {
                Attack: ent => {
                    ent.remove('Attack');
                    this._emitMsg('Paralysis', 'Attack', ent);
                },
                AttackRanged: ent => {
                    ent.remove('AttackRanged');
                    this._emitMsg('Paralysis', 'AttackRanged', ent);
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
                AttackRanged: ent => {
                    ent.remove('AttackRanged');
                    this._emitMsg('Stun', 'AttackRanged', ent);
                },
                // Stun moves actor to random direction if they try to attack
                Movement: ent => {
                    const dir = this.rng.getRandDir();
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
        this._compOrder = ['Paralysis', 'Entrapped', 'Stun'];
        this._actComp = ['Attack', 'AttackRanged', 'Movement', 'SpellCast', 'UseStairs'];
    }

    public updateEntity(ent) {
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

    public _emitMsg(comp, actionComp, ent) {
        const cell = ent.getCell();
        const entName = ent.getName();
        const msg = `${entName} ${_msg[comp][actionComp]}`;
        RG.gameMsg({cell, msg});
    }

    public _handleEntrapped(ent): void {
        const cell: Cell = ent.getCell();
        const elems = cell.getElements();

        // Entrapping element was removed somehow, so free the entity
        if (!elems) {
            ent.removeAll('Entrapped');
            return;
        }

        const traps = elems.filter(e => e.has('Entrapping'));
        let difficulty = 0;
        traps.forEach(elem => {
            difficulty += elem.get('Entrapping').getDifficulty();
        });

        const str = ent.getStrength();
        const agi = ent.getAgility();
        const freeProb = (str + agi) / (str + agi + difficulty);
        if (!RG.isSuccess(freeProb)) {
            ent.remove('Movement');
            const msg = `${ent.getName()} is trapped and cannot move!`;
            RG.gameMsg({cell, msg});
        }
        else {
            const level = ent.getLevel();
            // Entity is freed, destroy one-shot entraps
            traps.forEach(elem => {
                if (elem.get('Entrapping').getDestroyOnMove()) {
                    level.removeElement(elem, elem.getX(), elem.getY());
                }
            });
            ent.removeAll('Entrapped');
            const msg = `${ent.getName()} breaks free from traps!`;
            RG.gameMsg({cell, msg});
        }
    }

    /* Handles Fear component in an actor. */
    public _handleFear(ent, compType: string): void {
        const fearComps = ent.getList('Fear');
        const enemiesSeen = ent.getBrain().getSeenEnemies();

        // TODO add a generic fear with type ie undead
        let worstFearLevel = 0;
        let worstFearEnemy = null;

        // Determine the most feared enemy
        fearComps.forEach(fearComp => {
            const targetId = fearComp.getTarget();
            const fearLevel = fearComp.getFearLevel();
            const fearedEnemy = enemiesSeen.find(e => e.getID() === targetId);
            if (fearedEnemy) {
                if (worstFearLevel < fearLevel) {
                    worstFearLevel = fearLevel;
                    worstFearEnemy = fearedEnemy;
                }
            }
        });

        if (worstFearEnemy) {
            const willpower = ent.getWillpower();
            const fearSuccess = worstFearLevel / (willpower + worstFearLevel);
            if (RG.isSuccess(fearSuccess)) {
                ent.remove(compType);
                const fleedXdY = RG.dXdY(worstFearEnemy.getXY(), ent.getXY());
                const [nX, nY] = RG.newXYFromDir(fleedXdY, ent.getXY());
                if (ent.getLevel().getMap().isPassable()) {
                    const movComp = new Component.Movement(nX, nY, ent.getLevel());
                    ent.add(movComp);
                    const msg = `${ent.getName} panics, and runs away from ${worstFearEnemy.getName()}`;
                    RG.gameMsg({cell: ent.getCell(), msg});
                }
                else {
                    const msg = `${ent.getName} is paralysed by fear!`;
                    RG.gameMsg({cell: ent.getCell(), msg});
                }
            }
        }
    }

}
