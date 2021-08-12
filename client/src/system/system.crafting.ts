/*
 * Crafting system handles transforming materials (Items) into other
 * materials and items. System itself is rather dumb, and requires the materials
 * and recipe as inputs, then produces the output (or fails to produce it).
 *
 * An example of recipe:
 * {
 *     inputs: [{count: 5, name: 'Steel ingot'}],
 *     outputs: [{count: 1, name: 'Steel sword'}]
 * }
 *
 * Inputs are extracted from the performing Entity, and outputs placed into
 * Entitys inventory (if possible) or to the same cell that the Entity occupies.
 *
 * Component: Crafting
 */

import RG from '../rg';
import {SystemBase} from './system.base';
import {EventPool} from '../eventpool';
import {IRecipe, IRecipeEntry} from '../interfaces';
import {ObjectShell, Parser} from '../objectshellparser';
import {IShell} from '../interfaces';
import {SentientActor} from '../actor';

type Entity = import('../entity').Entity;


export class SystemCrafting extends SystemBase {

    protected parser: Parser;

    constructor(compTypes: string[], pool: EventPool) {
        super(RG.SYS.CRAFTING, compTypes, pool);
        this.parser = ObjectShell.getParser();
    }

    public updateEntity(ent: Entity): void {
        const compList = ent.getList('Crafting');
        compList.forEach(comp => {
            this.processComp(ent, comp);
            ent.remove(comp);
        });
    }

    protected processComp(ent: Entity, comp): void {
        const actor = ent as SentientActor;
        const entName = actor.getName();
        const itemName = comp.getItem();
        const itemCount = comp.getCount();
        // const {inputs, outputs} = recipe;
        const outputs = [{count: itemCount, name: itemName}];
        const objArgs = comp.getArgs();

        const shell: IShell = this.parser.get(RG.TYPE_ITEM, itemName);
        const recipe = shell.recipe;
        if (!recipe) {
            RG.err('SystemCrafting', 'processComp',
                `No recipe found for ${itemName}`);
        }
        const inputs = recipe;

        // If entity has inputs, remove them, and create outputs
        if (this.extractInputsFromEntity(ent, inputs)) {
            outputs.forEach((recipeOutput: IRecipeEntry) => {
                const {count, name} = recipeOutput;
                this.addOutputsToEntity(ent, count, name);
                if (objArgs.hasOwnProperty('callback')) {
                    const msg = `${entName} succesfully crafted ${itemName}`;
                    objArgs.callback({msg, result: true});
                }
            });
        }
        else {
            // No valid materials
            if (objArgs.hasOwnProperty('callback')) {
                const msg = `${entName} does not have materials to craft ${itemName}`;
                objArgs.callback({msg, result: false});
            }
        }

    }

    protected extractInputsFromEntity(ent: Entity, inputs: IRecipeEntry[]): boolean {
        let inputsOk = true;
        inputs.forEach((input: IRecipeEntry) => {
            const {count, name} = input;
            if (!this.entityHasInput(ent, count, name)) {
                inputsOk = false;
            }
        });
        if (inputsOk) {
            // Remove all inputs from Entity
            inputs.forEach((input: IRecipeEntry) => {
                const {count, name} = input;
                this.removeInputsFromEntity(ent, count, name);
            });
        }
        return inputsOk;
    }

    protected entityHasInput(ent, count, name): boolean {
        const actor = ent as SentientActor;
        const invEq = actor.getInvEq();
        const items = invEq.getItemsNamed(name);
        const countSum = items.reduce((acc, item) => acc + item.getCount(), 0);
        if (countSum >= count) {return true;}
        return false;
    }

    protected removeInputsFromEntity(ent, count, name): boolean {
        const actor = ent as SentientActor;
        const invEq = actor.getInvEq();
        const items = invEq.getItemsNamed(name);
        if (items.length > 0) {
            const ok = invEq.removeNItems(items[0], count);
            return ok;
        }
        return false;
    }

    protected addOutputsToEntity(ent, count, name): void {
        const actor = ent as SentientActor;
        const invEq = actor.getInvEq();
        const item = this.parser.createItem(name);
        item.setCount(count);
        invEq.addItem(item);
    }

}
