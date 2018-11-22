
import RG from './rg';
import {Random} from './random';
import * as Menu from './menu';
import * as Component from './component/component';

type SentientActor = import('./actor').SentientActor;

const RNG = Random.getRNG();

/* This file contains usable actor ability definitions. */
export const Ability: any = {};

type MenuItem = [string, (any?) => void] | [string, Menu.MenuBase];

export class AbilityBase {
    public name: string;
    public actor: SentientActor;

    constructor(name: string) {
        this.name = name;
    }

    public getName(): string {
        return this.name;
    }

    public getMenuItem(): MenuItem {
        return [
            this.getName(),
            this.activate.bind(this)
        ];
    }

    public activate(obj: any): void {
        const name = this.getName();
        RG.err('Ability.Base', 'activate',
            `${name} should implement activate()`);
    }

}
Ability.Base = AbilityBase;

//---------------------------------------------------------------------------
// Abilities usable on actor itself
//---------------------------------------------------------------------------

export class Self extends AbilityBase {

    constructor(name) {
        super('Self');
    }

    getMenuItem(): MenuItem {
        return [
            this.getName(),
            this.activate.bind(this)
        ];
    }
}
Ability.Self = Self;

export class Camouflage extends AbilityBase {

    constructor(name) {
        super('Camouflage');
    }

    activate() {
        const actor = this.actor;
        actor.add(new Component.Camouflage());
    }

}

Ability.Camouflage = Camouflage;

/* Abilities affecting specific direction, where player must choose
 * a direction for using the ability. */
export const Direction = function() {
    Ability.Base.call(this, name);
};
RG.extend2(Direction, Ability.Base);

/* Abilities affecting specific area, where the area must be chosen by
 * the player. */
export const Area = function() {
    Ability.Base.call(this, name);

};
RG.extend2(Area, Ability.Base);

/* Base class for abilities targeting items. Each derived class must provide
 * activate(item) function for the actual ability functionality. */
export class Item extends AbilityBase {

    constructor(name) {
        super(name);
    }

    activate(item) {
        const json = JSON.stringify(item);
        RG.err('Ability.Item', 'activate',
            'Not impl. in base class. Called with: ' + json);
    };

    /* Constructs a table of items to select from. */
    getMenuItem(): MenuItem {
        const items = this.actor.getInvEq().getInventory().getItems();
        const itemMenuItems = items.map(item => (
            [
                item.toString(),
                this.activate.bind(this, item)
            ]
        ));
        const itemMenu = new Menu.MenuWithQuit(itemMenuItems);
        itemMenu.addPre('Select an item to sharpen:');
        return [
            this.getName(),
            itemMenu
        ];
    }

}
Ability.Item = Item;



/* This ability can be used to sharpen weapons. */
export class Sharpener extends Ability.Item {

    constructor() {
        super('Sharpener');
    }

    activate(item) {
        const name = item.getName();
        if (!item.has('Sharpened')) {
            if (item.getDamageDie) {
                item.add(new Component.Sharpened());
                const dmgBonus = RNG.getUniformInt(1, 3);
                const dmgDie = item.getDamageDie();
                dmgDie.setMod(dmgDie.getMod() + dmgBonus);
                item.setValue(item.getValue() + dmgBonus * 10);
                RG.gameMsg(`You sharpen ${name}`);
            }
            else {
                RG.gameMsg(`It's useless to sharpen ${name}`);
            }
        }
        else {
            RG.gameMsg(`${name} has already been sharpened`);
        }
    }

}
Ability.Sharpener = Sharpener;


export class Abilities {

    public abilities: {[key: string]: AbilityBase};
    public actor: SentientActor;

    constructor(actor) {
        this.actor = actor;
        this.abilities = {};
    }

    public getMenu() {
        const menuArgs = Object.values(this.abilities).map(abil => (
            abil.getMenuItem()
        ));
        const menu = new Menu.MenuWithQuit(menuArgs);
        menu.setName('MenuAbilities');
        menu.addPre('Select an ability to use:');
        return menu;
    }

    public addAbility(ability: AbilityBase) {
        this.abilities[ability.getName()] = ability;
        ability.actor = this.actor;
    }

    public toJSON() {
        return Object.keys(this.abilities);
    }

}
Ability.Abilities = Abilities;
