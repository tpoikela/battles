
// Note: All CmdXXX classes are used from Brain.Player. 'this' is bound to the
// Brain.Player object by using execute.call(this)

import RG from './rg';
import {Path} from './path';
import * as Component from './component/component';

type BrainPlayer = import('./brain/brain.player').BrainPlayer;
type SentientActor = import ('./actor').SentientActor;

export const Cmd: any = {};

export const ACTION_ALREADY_DONE = () => {};
export const ACTION_ZERO_ENERGY = null;
Cmd.ACTION_ALREADY_DONE = ACTION_ALREADY_DONE;
Cmd.ACTION_ZERO_ENERGY = ACTION_ZERO_ENERGY;

export class CmdBase {

    protected _actor: SentientActor;
    protected brain: BrainPlayer;

    constructor(brain: BrainPlayer) {
        this._actor = brain.getActor();
        this.brain = brain;
    }

}

/* Executes one attack against target actor/cell. */
export class CmdAttack extends CmdBase {

    public execute(obj) {
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
        const attackRange = RG.getMeleeAttackRange(this._actor);
        if (dist <= attackRange) {
            const attackComp = new Component.Attack({target: actor});
            this._actor.add(attackComp);
            return ACTION_ALREADY_DONE;
        }
        else {
          return this.brain.cmdNotPossible('Target not within attack range');
        }
      }
      return this.brain.cmdNotPossible('No valid targets for attack');
    }

}
Cmd.Attack = CmdAttack;

export class CmdMissile extends CmdBase {

    public execute(obj) {
        const attComp = new Component.AttackRanged();
        attComp.setAttacker(this._actor);
        attComp.setTarget(obj.target);
        this._actor.add(attComp);
        return ACTION_ALREADY_DONE;
    }

}
Cmd.Missile = CmdMissile;

/* Executed when player uses an item. */
export class CmdUseItem extends CmdBase {

    public execute(obj) {
        if (obj.hasOwnProperty('item')) {
            const item = obj.item;
            let result = false;
            let msg = `You failed to use ${item.getName()}.`;
            if (typeof item.useItem === 'function') {
                this.brain.energy = RG.energy.USE;
                item.useItem({target: obj.target});
                result = true;
            }

            if (obj.hasOwnProperty('callback')) {
                if (result) {
                    msg = `You used ${item.getName()}!`;
                }
                obj.callback({msg, result});
            }
            else if (!result) {
                // return this.brain.cmdNotPossible('You cannot use that item.');
                const useComp = new Component.UseItem();
                useComp.setItem(item);
                useComp.setTarget(obj.target);
                this._actor.add(useComp);
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
export class CmdUseElement extends CmdBase {

    public execute(obj) {
        const cell = obj.target;
        const elems = cell.getElements();
        const useComp = new Component.UseElement();
        elems.forEach(elem => {
            if (elem.onUse) {
                useComp.setElement(elem);
            }
        });
        this._actor.add(useComp);
        return ACTION_ALREADY_DONE;
    }
}
Cmd.UseElement = CmdUseElement;

export class CmdDropItem extends CmdBase {

  public execute(obj) {
      const invEq = this._actor.getInvEq();
      const actorCell = this._actor.getCell();
      let result = false;
      let msg = `Failed to drop ${obj.item.getName()}`;
      const dropCount = obj.count <= obj.item.getCount() ? obj.count
        : obj.item.getCount();

      let hasActiveShop = false;
      if (actorCell.hasShop()) {
          const shop = actorCell.getShop();
          hasActiveShop = !shop.isAbandoned();
      }

      if (hasActiveShop) {
          const shopElem = actorCell.getPropType('shop')[0];
          const price = shopElem.getItemPriceForSelling(obj.item, dropCount);

          // this.brain._wantConfirm = true;
          const confirmCb = () => {
              // const sellOk = shopElem.sellItem(obj.item, this._actor);
              const trans = new Component.Transaction();
              trans.setArgs({item: obj.item, seller: this._actor,
                  shop: shopElem, callback: obj.callback,
                  buyer: shopElem.getShopkeeper(), count: dropCount});
              this._actor.add(trans);
          };
          msg = `Press y to sell item for ${price} gold coins.`;
          this.brain.setWantConfirm(this.brain.energy, confirmCb, msg);
          if (obj.hasOwnProperty('callback')) {
              obj.callback({msg, result});
          }
      }
      else if (invEq.dropNItems(obj.item, dropCount)) {
          result = true;
          msg = 'Item dropped!';
      }
      if (obj.hasOwnProperty('callback')) {
          obj.callback({msg, result});
      }
      return ACTION_ALREADY_DONE;
  }

}
Cmd.DropItem = CmdDropItem;

export class CmdEquipItem extends CmdBase {

    public execute(obj) {
        const eqComp = new Component.Equip();
        // eqComp.setItem(obj.item);
        eqComp.setArgs(obj);
        eqComp.setIsRemove(false);
        this._actor.add(eqComp);
        return ACTION_ALREADY_DONE;
    }

}
Cmd.EquipItem = CmdEquipItem;

/* Executed when an actor unequips an item. */
export class CmdUnequipItem extends CmdBase {

    public execute(obj) {
        const eqComp = new Component.Equip();
        eqComp.setArgs(obj);
        eqComp.setIsRemove(true);
        this._actor.add(eqComp);
        return ACTION_ALREADY_DONE;
    }

}
Cmd.UnequipItem = CmdUnequipItem;
