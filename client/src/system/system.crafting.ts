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

type Entity = import('../entity').Entity;

interface IRecipeEntry {
    count: number;
    name: string;
}

interface IRecipe {
    inputs: IRecipeEntry[];
    outputs: IRecipeEntry[];
}

export class SystemCrafting extends SystemBase {

    constructor(compTypes: string[], pool: EventPool) {
        super(RG.SYS.CRAFTING, compTypes, pool);
    }

    public updateEntity(ent: Entity): void {
        const compList = ent.get('Crafting');
        compList.forEach(comp => {
            this.processComp(ent, comp);
            ent.remove(comp);
        });
    }

    protected processComp(ent: Entity, comp): void {
        const recipe = comp.getRecipe() as IRecipe;
        const {inputs, outputs} = recipe;

        // If entity has inputs, remove them, and create outputs
        if (this.extractInputsFromEntity(ent, inputs)) {
            outputs.forEach((recipeOutput: IRecipeEntry) => {
                const {count, name} = recipeOutput;
            });
        }
        else {
            // No valid materials
        }

    }

    protected extractInputsFromEntity(ent: Entity, inputs: IRecipeEntry[]): boolean {
        let inputsOk = true;
        inputs.forEach((input: IRecipeEntry) => {
            const {count, name} = input;
        });
        return inputsOk;
    }

}
