
const RG = require('./rg');
const Menu = require('./menu');

const RNG = RG.Random.getRNG();

/* This file contains usable actor ability definitions. */
const Ability = {};

const Abilities = function(actor) {
    this.actor = actor;
    this.abilities = {};
};
Ability.Abilities = Abilities;

Abilities.prototype.getMenu = function() {
    const menuArgs = Object.values(this.abilities).map(abil => (
        abil.getMenuItem()
    ));
    const menu = new Menu.WithQuit(menuArgs);
    return menu;
};

Abilities.prototype.addAbility = function(ability) {
    this.abilities[ability.getName()] = ability;
    ability.actor = this.actor;
};

Abilities.prototype.toJSON = function() {
    return Object.keys(this.abilities);
};

Ability.Base = function(name) {
    this.name = name;
};

Ability.Base.prototype.getName = function() {
    return this.name;
};

Ability.Base.prototype.activate = function() {
    const name = this.getName();
    RG.err('Ability.Base', 'activate',
        `${name} should implement activate()`);

};

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

Ability.Direction = function() {

};

Ability.Area = function() {

};

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

module.exports = Ability;
