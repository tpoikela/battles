
import RG from './rg';
import {Random} from './random';
import {Geometry} from './geometry';
import * as Menu from './menu';
import * as Component from './component/component';

type ItemBase = import('./item').ItemBase;
type SentientActor = import('./actor').SentientActor;
type Cell = import('./map.cell').Cell;

const RNG = Random.getRNG();

/* This file contains usable actor ability definitions. */
export const Ability: any = {};

// type MenuItem = [string, (any?) => void] | [string, Menu.MenuBase];
type MenuItem = Menu.MenuItem;

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
            `${name} should implement activate(), given obj ${obj}`);
    }

}
Ability.Base = AbilityBase;

//---------------------------------------------------------------------------
// Abilities usable on actor itself
//---------------------------------------------------------------------------

export class Camouflage extends AbilityBase {

    constructor(name: string) {
        super('Camouflage');
    }

    public activate(): void {
        const actor = this.actor;
        actor.add(new Component.Camouflage());
    }

}

Ability.Camouflage = Camouflage;

/* Abilities affecting specific direction, where player must choose
 * a direction for using the ability. */
export class Direction extends AbilityBase {

    constructor(name: string) {
        super(name);
    }

    public getMenuItem(): MenuItem {
        return [
            this.getName(),
            new Menu.MenuSelectDir([])
        ];
    }
}

/* Abilities affecting specific area, where the area must be chosen by
 * the player. */
export class Area extends AbilityBase {

    public range: number;

    constructor(name: string) {
        super(name);
        this.range = 1;
    }

    public activate(cells: Cell[]): void {
    }

    public getCells(): Cell[] {
        const [x0, y0] = this.actor.getXY();
        return Geometry.getBoxAround(x0, y0, this.range);
    }

    public getMenuItem(): MenuItem {
        const cells = this.getCells();
        return [
            this.getName(),
            this.activate.bind(this, cells)
        ];
    }
}
Ability.Area = Area;

/* Base class for abilities targeting items. Each derived class must provide
 * activate(item) function for the actual ability functionality. */
export class Item extends AbilityBase {

    constructor(name: string) {
        super(name);
    }

    public activate(item: ItemBase) {
        const json = JSON.stringify(item);
        RG.err('Ability.Item', 'activate',
            'Not impl. in base class. Called with: ' + json);
    }

    /* Constructs a table of items to select from. */
    public getMenuItem(): MenuItem {
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

    public activate(item: ItemBase): void {
        const name = item.getName();
        if (!item.has('Sharpened')) {
            if ((item as any).getDamageDie) {
                item.add(new Component.Sharpened());
                const dmgBonus = RNG.getUniformInt(1, 3);
                const dmgDie = (item as any).getDamageDie();
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


/* Ability to bribe other actors.
 * When used, do the following:
 * If activated:
 * 1. Ask direction from player.
 * 2. Check the cost of bribing for that direction (y/n)
 * 3. If y, then attempt the bribery.
 * */
export class Bribery extends Direction {

    constructor() {
        super('Bribery');
    }

    public getMenuItem(): MenuItem {
        const nameMenuDir = super.getMenuItem();
        const menuConfirm =  new Menu.MenuConfirm([]);
        nameMenuDir[1].returnMenu = menuConfirm;
        menuConfirm.onSelectCallback = (dir) => {
            const actor = getActorInDir(dir, this.actor);
            menuConfirm.callback = () => {
                if (actor) {
                    this.bribeActor(actor);
                }
            };
            const nGold = 1;
            const costMsg = `Bribing ${actor.getName()} will cost ${nGold}.`;
            const menuMsg = costMsg + ' ' + menuConfirm.msg;
            RG.gameMsg(menuMsg);
            menuConfirm.setMsg(menuMsg);
        };
        RG.gameMsg('Select a direction for bribing an actor:');
        return nameMenuDir;
    }

    protected bribeActor(actor): void {
        const name = this.actor.getName();
        let msg = `${actor.getName()} seems to be friendly towards ${name}.`;
        if (actor.isEnemy(this.actor)) {
            msg = `${actor.getName()} seems not to be hostile anymore towards ${name}.`;
            actor.removeEnemyType('player'); // TODO make more generic
            actor.removeEnemy(this.actor);
        }
        else {
            actor.addFriend(this.actor);
        }

        const cell = this.actor.getCell();
        RG.gameMsg({cell, msg});
    }

}
Ability.Bribery = Bribery;

/* Collection class for managing all abilities inside actor. */
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

/* Returns actor in given direction, if any. */
function getActorInDir(dir, srcActor) {
    const [x, y] = RG.newXYFromDir(dir, srcActor);
    const cell = srcActor.getLevel().getMap().getCell(x, y);
    if (cell.hasActors()) {
        return cell.getFirstActor();
    }
    return null;
}

const abilList = [
    'Bribery', 'Camouflage', 'Sharpener'
];

export function addAllAbilities(actor) {
    const abilComp = actor.get('Abilities');
    if (abilComp) {
        abilList.forEach(name => {
            const newAbil = new Ability[name]();
            abilComp.addAbility(newAbil);
        });
    }
}

Ability.addAllAbilities = addAllAbilities;
