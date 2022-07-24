/* Contains code for the mining system in the game. */

import RG from '../rg';
import {SystemBase} from './system.base';
import * as ObjectShell from '../objectshellparser';
import * as Element from '../element';
import * as Component from '../component';
import {Constraints} from '../constraints';

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
    }


    public updateEntity(ent: Entity): void {
        const compList =  ent.getList('Mining');
        compList.forEach((miningComp) => {
            this.processComp(ent, miningComp);
            ent.remove(miningComp);
        });
    }


    public processComp(ent: Entity, miningComp): void {
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
            if (Math.round(elemHard/2) <= srcHard) {
                let reduceDur = RG.getItemDamage(source);
                const att = ent as SentientActor;
                reduceDur += RG.strengthToDamage(att.getStatVal('Strength'));
                const newDur: number = breakComp.getDurability() - reduceDur;
                if (newDur <= 0) {
                    elemDestroyed = true;
                    level.removeElement(elemBreak, elemBreak.getX(), elemBreak.getY());
                    baseType = elemBreak.getType();
                    RG.gameMsg(`${att.getName()} breaks ${elemBreakName} with ${srcName}!`);
                }
                else {
                    breakComp.setDurability(newDur);
                    RG.gameMsg(`${att.getName()} damages ${elemBreakName} with ${srcName}!`);
                }
            }
            else {
                RG.gameMsg(`${srcName} cannot be used to break ${elemBreak.getName()}`);
            }
        }
        else {
            // Base element case
            console.log('xyz000');
            if (baseElem.has('Breakable')) {
                console.log('xyz111');
                const baseBreakComp = baseElem.get('Breakable')
                const baseElemHard = baseBreakComp.getHardness();

                if (Math.round(baseElemHard/2) <= srcHard) {
                    console.log('xyz222');
                    if (toElem) {
                        cell.setBaseElem(toElem);
                    }

                    let reduceDur = RG.getItemDamage(source);
                    const att = ent as SentientActor;
                    reduceDur += RG.strengthToDamage(att.getStatVal('Strength'));
                    const newDur: number = baseBreakComp.getDurability() - reduceDur;

                    if (newDur > 0) {
                        // this.parser
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
                        RG.gameMsg(`${att.getName()} damages ${baseName} with ${srcName}`);
                    }
                    else {
                        elemDestroyed = true;
                        RG.gameMsg(`${att.getName()} breaks ${baseName} with ${srcName}!`);
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

}
