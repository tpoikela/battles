
import RG from './rg';
import Random from './random';
import Menu from './menu';
import Actor from './actor';

const RNG = Random.getRNG();

/* This file contains usable actor ability definitions. */
const Ability: any = {};

type MenuItem = [string, () => void];

class AbilityBase {
    public name: string;
    public actor: Actor.Rogue;

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

    public activate(): void {
        const name = this.getName();
        RG.err('Ability.Base', 'activate',
            `${name} should implement activate()`);
    }

}
Ability.Base = AbilityBase;

//---------------------------------------------------------------------------
// Abilities usable on actor itself
//---------------------------------------------------------------------------

Ability.Self = function(name) {
    Ability.Base.call(this, name);
};
RG.extend2(Ability.Self, Ability.Base);

Ability.Self.prototype.getMenuItem = function() {
    return [
        this.getName(),
        this.activate.bind(this)
    ];
};

Ability.Camouflage = function() {
    Ability.Self.call(this, 'Camouflage');
};
RG.extend2(Ability.Camouflage, Ability.Self);

Ability.Camouflage.prototype.activate = function() {
    const actor = this.actor;
    actor.add(new RG.Component.Camouflage());
};

/* Abilities affecting specific direction, where player must choose
 * a direction for using the ability. */
Ability.Direction = function() {
    Ability.Base.call(this, name);
};
RG.extend2(Ability.Direction, Ability.Base);

/* Abilities affecting specific area, where the area must be chosen by
 * the player. */
Ability.Area = function() {
    Ability.Base.call(this, name);

};
RG.extend2(Ability.Area, Ability.Base);

/* Base class for abilities targeting items. Each derived class must provide
 * activate(item) function for the actual ability functionality. */
Ability.Item = function(name) {
    Ability.Base.call(this, name);
};
RG.extend2(Ability.Item, Ability.Base);

Ability.Item.prototype.activate = function(item) {
    const json = JSON.stringify(item);
    RG.err('Ability.Item', 'activate',
        'Not impl. in base class. Called with: ' + json);
};

Ability.Item.prototype.getMenuItem = function() {
    const items = this.actor.getInvEq().getInventory().getItems();
    const itemMenuItems = items.map(item => (
        [
            item.toString(),
            this.activate.bind(this, item)
        ]
    ));
    const itemMenu = new Menu.WithQuit(itemMenuItems);
    itemMenu.addPre('Select an item to sharpen:');
    return [
        this.getName(),
        itemMenu
    ];
};

/* This ability can be used to sharpen weapons. */
Ability.Sharpener = function() {
    Ability.Item.call(this, 'Sharpener');
};
RG.extend2(Ability.Sharpener, Ability.Item);

Ability.Sharpener.prototype.activate = function(item) {
    const name = item.getName();
    if (!item.has('Sharpened')) {
        if (item.getDamageDie) {
            item.add(new RG.Component.Sharpened());
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
};

class Abilities {

    public abilities: {[key: string]: AbilityBase};
    public actor: Actor.Rogue;

    constructor(actor) {
        this.actor = actor;
        this.abilities = {};
    }

    public getMenu() {
        const menuArgs = Object.values(this.abilities).map(abil => (
            abil.getMenuItem()
        ));
        const menu = new Menu.WithQuit(menuArgs);
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

export default Ability;
