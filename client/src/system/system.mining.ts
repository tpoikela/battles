/* Contains code for the mining system in the game. */

import RG from '../rg';
import {SystemBase} from './system.base';
import * as ObjectShell from '../objectshellparser';
import * as Element from '../element';
import * as Component from '../component';
import {Constraints} from '../constraints';
import {IEffArgs} from '../interfaces';
import {Dice} from '../dice';

import {MineItemEntry, Elem2Items, Elem2Floor} from '../../data/mining';

type EventPool = import('../eventpool').EventPool;
type Entity = import('../entity').Entity;
type Cell = import('../map.cell').Cell;
type Level = import('../level').Level;
type SentientActor = import('../actor').SentientActor;


export class SystemMining extends SystemBase {

    public parser: ObjectShell.Parser;

    constructor(compTypes: string[], pool: EventPool) {
        super(RG.SYS.MINING, compTypes, pool);
        this.parser = ObjectShell.getParser();
        this.compTypesAny = true;
    }


    public updateEntity(ent: Entity): void {
        const explCompList = ent.getList('Explosion');
        explCompList.forEach((explComp) => {
            this.processExplosionComp(ent, explComp);
            ent.remove(explComp);
        });
        const mineCompList =  ent.getList('Mining');
        mineCompList.forEach((miningComp) => {
            this.processMiningComp(ent, miningComp);
            ent.remove(miningComp);
        });
    }

    protected processExplosionComp(ent: Entity, explComp): void {
        const force = explComp.getForce();
        console.log('processExplosionComp for ent', RG.getName(ent));

        if (ent.has('Health')) {
            const dmgStr = explComp.getDamage();
            const dmgVal = Dice.getValue(dmgStr);
            const dmgComp = new Component.Damage(dmgVal, RG.DMG.EXPLOSION);
            dmgComp.setSource(explComp.getSource());
            ent.add(dmgComp);
            const cell = ent.get('Location').getCell();
            const srcName = RG.getName(explComp.getSource());
            const msg = `Explosion caused by ${srcName} hits ${RG.getName(ent)}!`;
            console.log(msg);
            RG.gameMsg({cell, msg});
        }
        else if (ent.has('Physical')) {
            const physComp = ent.get('Physical');
            const hardness = RG.getMaterialHardness(ent);

            // Workaround for handling bombs. They should not be destroyed here,
            // since their callbacks will remove them automatically
            if (ent.has('Callbacks')) {
                const cbs = ent.get('Callbacks');
                if (cbs.hasCb('onAddExplosion')) {
                    const cb = cbs.cb('onAddExplosion');
                    if (cb.removeEntity) {
                        if (cb.removeEntity.target === 'self') {
                            return;
                        }
                    }
                }
            }

            if (hardness <= force) {
                if (ent.has('Location')) {
                    const level = ent.get('Location').getLevel();
                    const [x, y] = ent.get('Location').getXY();
                    const cell =  ent.get('Location').getCell();
                    if (level.removeEntity(ent, x, y)) {
                        const entName = RG.getName(ent);
                        const msg = `${entName} is destroyed by explosion!`;
                        RG.gameMsg({cell, msg});
                    }
                }
            }
        }
        else if (ent.has('Breakable')) {
            const hardness = ent.get('Breakable').getHardness();
            if (hardness <= force) {
                const level = ent.get('Location').getLevel();
                const [x, y] = ent.get('Location').getXY();
                const cell =  ent.get('Location').getCell();
                if (level.removeEntity(ent, x, y)) {
                    const entName = RG.getName(ent);
                    const msg = `${entName} is destroyed by explosion!`;
                    RG.gameMsg({cell, msg});
                }
            }
        }
    }

    protected processMiningComp(ent: Entity, miningComp): void {
        const level: Level = ent.get('Location').getLevel();
        const placeComp = level.get('Place');
        const depth = placeComp.getDepth();
        const danger = placeComp.getDanger();

        const cell: Cell = miningComp.getTarget();
        const source = miningComp.getItem();
        const srcName = source.getName();

        const baseElem = cell.getBaseElem();
        const baseName = baseElem.getName();
        const elems = cell.getElements();
        let baseType = baseElem.getType();
        const toElem = Elem2Floor[baseType];
        const srcHard: number = RG.getMaterialHardness(source);
        const mineSkill = RG.getSkillLevel(ent, RG.SKILLS.MINING);

        // We need to replace Breakable with something, or reduce the durability
        // 1. There is only element, and floor base element
        //   a. Check if it breaks
        //   b. If not, then reduce durability
        // 2. There is Breakable base element, add floor base element + element
        // 3. Breakable element + breakable base, process element first
        let elemDestroyed = false;
        let elemBreak = null;
        if (elems && elems.length > 0) {
            elems.forEach(elem => {
                if (!elemBreak && elem.has('Breakable')) {
                    elemBreak = elem;
                    // not valid toElem = Elem2Floor[elem.getType()];
                }
            });

            const breakComp = elemBreak.get('Breakable');
            const elemBreakName = elemBreak.getName();
            const elemHard = breakComp.getHardness();

            if (Math.round(elemHard/2) <= (srcHard + mineSkill)) {
                let reduceDur = RG.getItemDamage(source);
                const att = ent as SentientActor;
                reduceDur += RG.strengthToDamage(att.getStatVal('Strength'));
                const newDur: number = breakComp.getDurability() - reduceDur;
                if (newDur <= 0) {
                    elemDestroyed = true;
                    level.removeElement(elemBreak, elemBreak.getX(), elemBreak.getY());
                    baseType = elemBreak.getType();
                    RG.gameMsg(`${att.getName()} breaks ${elemBreakName} with ${srcName}!`);
                    if (elemHard > mineSkill) {
                        SystemBase.addSkillsExp(att, RG.SKILLS.MINING, 1);
                    }

                    if (elemBreak.has('Callbacks')) {
                        this._execCallbacks(elemBreak, level);
                    }
                }
                else {
                    breakComp.setDurability(newDur);
                    let msg = `${att.getName()} damages ${elemBreakName} with ${srcName}!`;
                    msg += `(${newDur})`;
                    RG.gameMsg({cell, msg});
                }
            }
            else {
                const msg = `${srcName} cannot be used to break ${elemBreak.getName()}`;
                RG.gameMsg({cell, msg});
            }
        }
        else {
            // Base element case
            if (baseElem.has('Breakable')) {
                const baseBreakComp = baseElem.get('Breakable')
                const baseElemHard = baseBreakComp.getHardness();

                if (Math.round(baseElemHard/2) <= (srcHard + mineSkill)) {
                    if (toElem) {
                        cell.setBaseElem(toElem);
                    }

                    let reduceDur = RG.getItemDamage(source);
                    const att = ent as SentientActor;
                    reduceDur += RG.strengthToDamage(att.getStatVal('Strength'));
                    const newDur: number = baseBreakComp.getDurability() - reduceDur;

                    if (newDur > 0) {
                        const newElem = new Element.ElementXY('Damaged ' + baseType);
                        newElem.setType(baseType);
                        const breakComp = new Component.Breakable();
                        breakComp.setHardness(baseElemHard);
                        breakComp.setDurability(newDur);
                        newElem.add(breakComp);

                        // TODO copy all components from base element
                        if (baseElem.has('Impassable')) {
                            const compImpass = new Component.Impassable();
                            compImpass.setAllImpassable();
                            newElem.add(compImpass);
                        }
                        if (baseElem.has('Opaque')) {
                            newElem.add(new Component.Opaque());
                        }
                        level.addElement(newElem, cell.getX(), cell.getY());

                        let msg = `${att.getName()} damages ${baseName} with ${srcName}!`;
                        msg += `(${newDur})`;
                        RG.gameMsg({cell, msg});
                    }
                    else {
                        elemDestroyed = true;
                        if (baseElemHard > mineSkill) {
                            SystemBase.addSkillsExp(att, RG.SKILLS.MINING, 1);
                        }
                        RG.gameMsg(`${att.getName()} breaks ${baseName} with ${srcName}!`);
                        if (baseElem.has('Callbacks')) {
                            this._execCallbacks(baseElem, level);
                        }
                    }
                }
                else {
                    RG.gameMsg(`${srcName} cannot be used to break ${baseName}`);
                }
            }
        }

        // Early return since no elem was destroyed, and no item must be
        // generated
        if (!elemDestroyed) {return;}

        const itemEntry: MineItemEntry = Elem2Items[baseType];
        if (!itemEntry) {return;}
        const itemsAlways = itemEntry.always;

        itemsAlways.forEach((itemName: string) => {
            const item = this.parser.createItem(itemName);
            if (item) {
                level.addItem(item, cell.getX(), cell.getY());
            }
        });

        let entry = '';
        if (itemEntry.rand) {
            const itemsRand: {[key: string]: number} = {};
            // Add depth to randweights. Idea is that since valuable items have
            // smaller weights, their relative weight increases.
            Object.keys(itemEntry.rand).forEach(key => {
                itemsRand[key] = itemEntry.rand[key] + depth;
            });

            entry = this.rng.getWeighted(itemsRand);
            if (entry !== '' && entry !== 'nothing') {
                const itemFound = this.parser.createItem(entry);
                if (itemFound) {
                    level.addItem(itemFound, cell.getX(), cell.getY());
                    let msg = `${RG.getName(ent)} discovers ${itemFound.getName()}`;
                    msg += ' while digging';
                    RG.gameMsg({cell, msg});
                }
            }
        }
        // We can call func-based item generation if defined
        if (entry === '' || entry === 'nothing') {
            if (itemEntry.constraint) {
                const func = new Constraints().getConstraints(itemEntry.constraint);
            }
        }

    }


    protected _execCallbacks(elem, level): void {
        const cbsComp = elem.get('Callbacks');
        if (cbsComp.has('OnDestroy')) {
            const destroyCb = cbsComp.cb('OnDestroy');
            const effComp = new Component.Effects();
            const effArgs: IEffArgs = Object.create({level}, destroyCb);
            effComp.setArgs(effArgs);
            elem.add(effComp);
        }
    }

}
