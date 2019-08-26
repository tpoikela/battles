/* Contains code for handling actor equipment. */
import RG from './rg';

type ItemBase = import('./item').ItemBase;

type SlotContent = null | ItemBase;

export class EquipSlot {

    public _type: string;
    public _item: null | ItemBase;
    public _hasItem: boolean;
    public _unequipped: any;
    public _stacked: boolean;
    public _reduceFactor: number;

    constructor(type: string, stacked?: boolean) {
        this._type = type;
        this._item = null;
        this._hasItem = false;
        this._unequipped = null;
        this._stacked = false;
        this._reduceFactor = 0.5;
        if (!RG.isNullOrUndef([stacked])) {this._stacked = stacked!;}
    }

    public isStacked(): boolean {
        return this._stacked;
    }

    public getWeight(): number {
        if (!this._hasItem) {return 0;}
        let weight = this._item!.getWeight() * this._item!.getCount();
        if (this._type !== 'hand' && this._type !== 'missile') {
            weight *= this._reduceFactor;
        }
        return weight;
    }

    public getUnequipped(): SlotContent {return this._unequipped;}

    /* Returns the equipped item for this slot.*/
    public getItem(): SlotContent {
        if (this._hasItem) {return this._item;}
        return null;
    }

    public hasItem(): boolean {
        return this._hasItem;
    }

    /* Equips given item to first available place in slot.*/
    public equipItem(item): boolean {
        if (this.canEquip(item)) {
            if (!this._stacked || !this._hasItem) {
                item.setOwner(this);
                this._item = item;
                this._hasItem = true;
            }
            else if (RG.addStackedItems(this._item, item)) {
                this._hasItem = true;
            }
            return this._hasItem;
        }
        return false;
    }

    /* Unequips N items from the slot. */
    public unequipItem(n: number): boolean {
        if (this._hasItem) {
            if (!this._stacked) {
                this._hasItem = false;
                this._unequipped = this._item;
                return true;
            }
            else if (n > 0) {
                if (n === 1 && this._item!.getCount() === 1) {
                    this._hasItem = false;
                    this._unequipped = this._item;
                }
                else if (n === this._item!.getCount()) {
                    this._hasItem = false;
                    this._unequipped = this._item;
                }
                else {
                    this._unequipped = RG.removeStackedItems(this._item, n);
                }
                return true;
            }
        }
        return false;
    }

    public canEquip(item): boolean {
        if (!this._hasItem) {
            return true;
        }
        else if (this._stacked) {
            // Can only equip same items to the stack
            return item.equals(this._item);
        }
        return false;
    }
}

type EquipSlotOrArray = EquipSlot | EquipSlot[];

interface IEquipSlots {[key: string]: EquipSlotOrArray;}

const _equipMods: string[] = ['getDefense', 'getAttack', 'getProtection',
    'getSpeed'].concat(RG.GET_STATS);

/* Models equipment on an actor.*/
export class Equipment {

    public equipReduceWeightFactor: number;
    private _actor: any;
    private _slots: IEquipSlots;

    constructor(actor: any) {
        this._actor = actor;
        this.equipReduceWeightFactor = 1.0;

        this._slots = {
            chest: new EquipSlot('chest'),
            feet: new EquipSlot('feet'),
            hand: new EquipSlot('hand'),
            head: new EquipSlot('head'),
            missile: new EquipSlot('missile', true),
            missileweapon: new EquipSlot('missileweapon'),
            neck: new EquipSlot('neck'),
            shield: new EquipSlot('shield'),
            spiritgem: new EquipSlot('spiritgem')
        };


        /* Creates getters for stats and combat attributes. */
        for (let i = 0; i < _equipMods.length; i++) {
            /* eslint no-loop-func: 0 */
            // Use closure to fix the function name
            const getFunc = () => {
                return () => this.propertySum(_equipMods[i]);
            };
            this[_equipMods[i]] = getFunc();
        }

    }

    public addSlot(slotType: string, slotObj: EquipSlot): void {
        if (this._hasSlot(slotType)) {
            if (Array.isArray(this._slots[slotType])) {
                (this._slots[slotType] as EquipSlot[]).push(slotObj);
            }
            else {
                const slotArr: EquipSlot[] = [this._slots[slotType] as EquipSlot];
                slotArr.push(slotObj);
                this._slots[slotType] = slotArr;
            }
        }
        else {
            this._slots[slotType] = slotObj;
        }
    }


    /* Returns the total weight of the equipment. */
    public getWeight(): number {
        let total = 0;
        Object.values(this._slots).forEach((eqSlot: EquipSlot) => {
            total += eqSlot.getWeight();
        });
        /*const equipped: any[] = this.getEquippedItems();
        for (let i = 0; i < equipped.length; i++) {
            total += equipped[i].getWeight() * equipped[i].getCount();
        }*/
        total *= this.equipReduceWeightFactor;
        if (this._actor.has('MasterEquipper')) {
            total *= this._actor.get('MasterEquipper').getFactor();
        }
        return total;
    }

    /* Returns the number of slots for given type. */
    public getNumSlots(slotType: string): number {
        if (this._hasSlot(slotType)) {
            if (Array.isArray(this._slots[slotType])) {
                return (this._slots[slotType] as EquipSlot[]).length;
            }
            return 1;
        }
        return 0;
    }

    public getSlotTypes(): string[] {
        return Object.keys(this._slots);
    }

    public getItems(slotType?: string): EquipSlot[] | ItemBase[] {
        if (slotType && this._hasSlot(slotType)) {
            if (Array.isArray(this._slots[slotType])) {
                return (this._slots[slotType] as EquipSlot[]);
            }
            return [this._slots[slotType] as EquipSlot];
        }
        // RG.err('Equipment', 'getItems', `No slotType given!`);
        // return [];
        return this.getEquippedItems();
    }

    /* Returns last unequipped item for the slot.*/
    public getUnequipped(slotType: string, index?: number): SlotContent {
        if (this._hasSlot(slotType)) {
            const slot: EquipSlotOrArray = this._slots[slotType];
            if (Array.isArray(slot)) {
                if (typeof index === 'number') {
                    return slot[index].getUnequipped();
                }
                else {
                    RG.err('Equipment', 'getUnequipped',
                      `No slot index for slotType ${slotType} given!`);
                }
            }
            else {
                return (this._slots[slotType] as EquipSlot).getUnequipped();
            }
        }
        else {
            RG.err('Equipment', 'getUnequipped',
                'No slot type: ' + slotType);
        }
        return null;
    }

    /* Returns an item in the given slot.*/
    public getItem(slotType: string): SlotContent | SlotContent[] {
        if (this._hasSlot(slotType)) {
            const slot: EquipSlotOrArray = this._slots[slotType];
            if (Array.isArray(slot)) {
                // Note this can return [null, null] for example, which is fine
                return slot.map(itemSlot => itemSlot.getItem()!);
            }
            return (this._slots[slotType] as EquipSlot).getItem();
        }
        return null;
    }

    /* Equips given item. Slot is chosen automatically from suitable available
     * ones.*/
    public equipItem(item): boolean {
        if (item.getArmourType) {
            return this._equipToSlotType(item.getArmourType(), item);
        }
        // No equip property, can only equip to hand
        else if (/^(missile|ammo)$/.test(item.getType())) {
            const missileSlot = this._slots.missile as EquipSlot;
            if (missileSlot.equipItem(item)) {
                return true;
            }
        }
        else if (item.getType() === 'missileweapon') {
            return this._equipToSlotType('missileweapon', item);
        }
        else {
            return this._equipToSlotType('hand', item);
        }
        return false;
    }

    public _equipToSlotType(slotType, item) {
        const slot = this._slots[slotType];
        if (Array.isArray(slot)) {
            for (let i = 0; i < slot.length; i++) {
                if (slot[i].equipItem(item)) {
                    return true;
                }
            }
        }
        else if (slot.equipItem(item)) {
            return true;
        }
        return false;
    }

    /* Returns true if given item is equipped.*/
    public isEquipped(item) {
        const equipped = this.getItems();
        const index = equipped.indexOf(item);
        return index !== -1;
    }

    public getEquipped(slotType) {
        return this.getItem(slotType);
    }

    public getEquippedItems(): ItemBase[] {
        const items: ItemBase[] = [];
        Object.values(this._slots).forEach((slot) => {
            if (Array.isArray(slot)) {
                slot.forEach(subSlot => {
                    if (subSlot.hasItem()) {
                        items.push(subSlot.getItem()!);
                    }
                });
            }
            else if (slot.hasItem()) {
                items.push(slot.getItem()!);
            }
        });
        return items;
    }

    /* Unequips given slotType and index. */
    public unequipItem(slotType: string, n: number, index?: number) {
        if (this._hasSlot(slotType)) {
            const slot = this._slots[slotType];
            if (Array.isArray(slot)) {
                if (typeof index === 'number' && index >= 0) {
                    if (slot[index].unequipItem(n)) {
                        return true;
                    }
                }
                else {
                    for (let i = 0; i < slot.length; i++) {
                        if (slot[i].unequipItem(n)) {
                            return true;
                        }
                    }
                }
            }
            else {
                return (this._slots[slotType] as EquipSlot).unequipItem(n);
            }
        }
        else {
            const msg = 'Non-existing slot type ' + slotType;
            RG.err('Equipment', 'unequipItem', msg);
        }
        return false;
    }

    public toJSON() {
        const json: any = [];
        const equipped = this.getEquippedItems();
        for (let i = 0; i < equipped.length; i++) {
            json.push(equipped[i].toJSON());
        }
        return json;
    }

    /* Calls given funcname for each item in slot, and sums the results
     * of the function together. */
    private propertySum(funcname: string): number {
        let result = 0;
        const slotKeys = Object.keys(this._slots);
        slotKeys.forEach(slotName => {
            const slotObj = this._slots[slotName];
            let slots = slotObj;
            if (!Array.isArray(slots)) {
                slots = [slots];
            }

            slots.forEach(slot => {
                const item = slot.getItem();
                result += RG.getItemStat(funcname, item);
            });
        });
        return result;
    }


    private _hasSlot(slotType: string): boolean {
        return this._slots.hasOwnProperty(slotType);
    }
}

export interface Equipment {
    getAccuracy(): number;
    getAgility(): number;
    getAttack(): number;
    getDefense(): number;
    getMagic(): number;
    getPerception(): number;
    getProtection(): number;
    getSpeed(): number;
    getStrength(): number;
    getWillpower(): number;
}
