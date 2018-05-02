
// Note: All CmdXXX classes are used from Brain.Player. 'this' is bound to the
// Brain.Player object by using execute.call(this)

const RG = require('./rg');
const Path = require('./path');

const Cmd = {};

const ACTION_ALREADY_DONE = () => {};
const ACTION_ZERO_ENERGY = null;
Cmd.ACTION_ALREADY_DONE = ACTION_ALREADY_DONE;
Cmd.ACTION_ZERO_ENERGY = ACTION_ZERO_ENERGY;


/* Executes one attack against target actor/cell. */
class CmdAttack {

    execute(obj) {
      let actor = obj.target;
      if (actor.hasActors) { // We're dealing with cell
        if (obj.target.hasActors()) {
          actor = obj.target.getSentientActors()[0];
        }
      }
      if (actor) {
        const [pX, pY] = this._actor.getXY();
        const [tX, tY] = actor.getXY();
        const dist = Path.shortestDist(pX, pY, tX, tY);
        const attackRange = this._actor.get('Combat').getAttackRange();
        console.log('CmdAttack dist is ' + dist + ' range: ' + attackRange);
        if (dist <= attackRange) {
            const attackComp = new RG.Component.Attack({target: actor});
            this._actor.add('Attack', attackComp);
            return ACTION_ALREADY_DONE;
        }
        else {
          return this.cmdNotPossible('Target not within attack range');
        }
      }
      return this.cmdNotPossible('No valid targets for attack');
    }

}
Cmd.Attack = CmdAttack;

class CmdMissile {

    execute(obj) {
        const invEq = this._actor.getInvEq();
        let fireRate = 2;
        if (this._actor.has('DoubleShot')) {
            fireRate = 2;
        }

        // Fires one missile comp each firerate increment
        for (let i = 0; i < fireRate; i++) {

            // TODO changes to fire more than 1 missile
            const missile = invEq.unequipAndGetItem('missile', 1);
            if (!RG.isNullOrUndef([missile])) {

                // Check for missile weapon for ammunition
                if (missile.has('Ammo')) {
                    const missWeapon = invEq.getEquipment()
                        .getEquipped('missileweapon');
                    if (missWeapon === null) {
                        const msg = 'No missile weapon equipped.';
                        return this.cmdNotPossible(msg);
                    }
                    else { // Check ammo/weapon compatibility
                        const ammoType = missile.getAmmoType();
                        const weaponType = missWeapon.getWeaponType();
                        if (this._actor.has('MixedShot')) {
                            const re = /bow/;
                            if (!re.test(ammoType) || !re.test(weaponType)) {
                                if (ammoType !== weaponType) {
                                    const msg = 'Ammo/weapon not compatible.';
                                    return this.cmdNotPossible(msg);
                                }
                            }
                        }
                        else if (ammoType !== weaponType) {
                            const msg = 'Ammo/weapon not compatible.';
                            return this.cmdNotPossible(msg);
                        }
                    }
                }

                if (!RG.isNullOrUndef([obj.target])) {
                    const x = obj.target.getX();
                    const y = obj.target.getY();
                    const mComp = new RG.Component.Missile(this._actor);
                    mComp.setTargetXY(x, y);
                    mComp.setDamage(RG.getMissileDamage(this._actor, missile));
                    mComp.setAttack(RG.getMissileAttack(this._actor, missile));
                    mComp.setRange(RG.getMissileRange(this._actor, missile));
                    missile.add('Missile', mComp);
                    this.energy = RG.energy.MISSILE;
                }
                else {
                    RG.err('Brain.Player', 'handleCommand',
                        'No x,y given for missile.');
                }
            }
            else {
                return this.cmdNotPossible('No missile equipped.');
            }
        }

        return ACTION_ALREADY_DONE;
    }

}
Cmd.Missile = CmdMissile;

/* Executed when player uses an item. */
class CmdUseItem {

    execute(obj) {
        if (obj.hasOwnProperty('item')) {
            const item = obj.item;
            let result = false;
            let msg = `You failed to use ${item.getName()}.`;
            if (typeof item.useItem === 'function') {
                this.energy = RG.energy.USE;
                item.useItem({target: obj.target});
                result = true;
            }

            if (obj.hasOwnProperty('callback')) {
                if (result) {
                    msg = `You used ${item.getName()}!`;
                }
                obj.callback({msg: msg, result});
            }
            else if (!result) {
                return this.cmdNotPossible('You cannot use that item.');
            }
            else {
              RG.gameMsg(`You used ${item.getName()}!`);
            }
        }
        else {
            RG.err('Brain.Player', 'handleCommand', 'obj has no item');
        }
        return ACTION_ALREADY_DONE;
    }

}
Cmd.UseItem = CmdUseItem;

/* Command for using an element. */
class CmdUseElement {

    execute(obj) {
        const cell = obj.target;
        const elems = cell.getElements();
        const useComp = new RG.Component.UseElement();
        elems.forEach(elem => {
            if (elem.onUse) {
                console.log('Setting use element to ' + JSON.stringify(elem));
                useComp.setElement(elem);
            }
        });
        this._actor.add(useComp);
        return ACTION_ALREADY_DONE;
    }
}
Cmd.UseElement = CmdUseElement;

class CmdDropItem {

  execute(obj) {
      const invEq = this._actor.getInvEq();
      const actorCell = this._actor.getCell();
      let result = false;
      let msg = `Failed to drop ${obj.item.getName()}`;
      const dropCount = obj.count <= obj.item.count ? obj.count
        : obj.item.count;
      if (actorCell.hasShop()) {
          const shopElem = actorCell.getPropType('shop')[0];
          const price = shopElem.getItemPriceForSelling(obj.item);

          this._wantConfirm = true;
          this._confirmCallback = () => {
              // const sellOk = shopElem.sellItem(obj.item, this._actor);
              const trans = new RG.Component.Transaction();
              trans.setArgs({item: obj.item, seller: this._actor,
                  shop: shopElem, callback: obj.callback,
                  buyer: shopElem.getShopkeeper()});
              this._actor.add(trans);
          };

          msg = `Press y to sell item for ${price} gold coins.`;
          if (obj.hasOwnProperty('callback')) {
              obj.callback({msg: msg, result});
          }
      }
      else if (invEq.dropNItems(obj.item, dropCount)) {
          result = true;
          msg = 'Item dropped!';
      }
      if (obj.hasOwnProperty('callback')) {
          obj.callback({msg: msg, result});
      }
      return ACTION_ALREADY_DONE;
  }

}
Cmd.DropItem = CmdDropItem;

class CmdEquipItem {

    execute(obj) {
        const invEq = this._actor.getInvEq();
        const item = obj.item;
        let result = false;
        let msg = `Failed to equip ${item.getName()}`;
        if (item.getType().match(/^(missile|ammo)$/)) {
            if (invEq.equipNItems(item, obj.count)) {
                result = true;
            }
        }
        else if (invEq.equipItem(item)) {
            result = true;
        }
        if (obj.hasOwnProperty('callback')) {
            if (result) {
                msg = `Equipping ${item.getName()} succeeded!`;
            }
            obj.callback({msg: msg, result});
        }
        return ACTION_ALREADY_DONE;
    }

}
Cmd.EquipItem = CmdEquipItem;

/* Executed when an actor unequips an item. */
class CmdUnequipItem {

    execute(obj) {
        const name = obj.slot;
        const slotNumber = obj.slotNumber;
        const invEq = this._actor.getInvEq();
        let result = false;
        let msg = `Failed to remove item from slot ${name}.`;

        if (name === 'missile') {
            const eqItem = invEq.getEquipment().getItem('missile');

            if (eqItem !== null) {
                if (invEq.unequipItem(name, obj.count)) {
                    result = true;
                }
            }
        }
        else if (invEq.unequipItem(name, 1, slotNumber)) {
            result = true;
        }

        if (obj.hasOwnProperty('callback')) {
            if (result) {
                msg = `Unequipping from ${name} succeeded!`;
            }
            obj.callback({msg: msg, result});
        }
        return ACTION_ALREADY_DONE;
    }

}
Cmd.UnequipItem = CmdUnequipItem;

module.exports = Cmd;

