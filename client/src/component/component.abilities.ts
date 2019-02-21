
import * as Ability from '../abilities';
import {ComponentBase, Component} from './component.base';

const UniqueDataComponent = Component.UniqueDataComponent;

/* Abilities which stores the separate (non-spell) abilities of actor. */
export const Abilities = UniqueDataComponent('Abilities', {});

Abilities.prototype._init = function() {
    const _addCb = () => {
        const abilities = new Ability.Abilities(this.getEntity());
        // This is mainly used if component is restored
        if (Array.isArray(this.abilities)) {
            this.abilities.forEach(name => {
                const abil = new Ability[name]();
                abilities.addAbility(abil);
            });
        }
        this.abilities = abilities;
        this.removeCallbacks('onAdd');
    };
    this.addCallback('onAdd', _addCb);
};

Abilities.prototype.setAbilities = function(abils: Ability.Abilities) {
    this.abilities = abils;
};

Abilities.prototype.createMenu = function() {
    return this.abilities.getMenu();
};

Abilities.prototype.addAbility = function(ability) {
    this.abilities.addAbility(ability);
};

Abilities.prototype.toJSON = function() {
    const json = ComponentBase.prototype.toJSON.call(this);
    json.setAbilities = this.abilities.toJSON();
    return json;
};
