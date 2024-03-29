
// Note: All CmdXXX classes are used from Brain.Player. 'this' is bound to the
// Brain.Player object by using execute.call(this)

import RG from './rg';
import {Path} from './path';
import * as Component from './component/component';

type BrainPlayer = import('./brain/brain.player').BrainPlayer;
type SentientActor = import ('./actor').SentientActor;
type Cell = import('./map.cell').Cell;
type ElementShop = import('./element').ElementShop;

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
      const actorCell: null | Cell = this._actor.getCell();
      let result = false;
      let msg = `Failed to drop ${obj.item.getName()}`;
      const dropCount = obj.count <= obj.item.getCount() ? obj.count
        : obj.item.getCount();

      let hasActiveShop = false;
      if (actorCell) {
          if (actorCell.hasShop()) {
              const shop = actorCell.getShop() as ElementShop;
              hasActiveShop = !shop.isAbandoned();
          }
      }
      else {
          RG.err('CmdDropItem', 'execute',
              'Null actorCell. Cannot execute cmd');
          return;
      }

      if (hasActiveShop) {
          const shopElem = actorCell.getShop() as ElementShop;
          const price = shopElem.getItemPriceForSelling(obj.item, dropCount);

          const confirmCb = () => {
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

export class CmdDisplace extends CmdBase {

    public execute(obj) {
        const dispComp = new Component.Displace();
        const actor = obj.target.getFirstActor();
        dispComp.setDisplaceTarget(actor);
        this._actor.add(dispComp);
        return ACTION_ALREADY_DONE;
    }

}
Cmd.Missile = CmdMissile;

export class CmdEquipItem extends CmdBase {

    public execute(obj) {
        const eqComp = new Component.Equip();
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

/* Executes crafting command. */
export class CmdCraft extends CmdBase {

    public execute(obj) {
      const craftComp = new Component.Crafting();
      craftComp.setItem(obj.item.getName());
      craftComp.setCount(obj.item.getCount());
      craftComp.setArgs(obj);
      this._actor.add(craftComp);
      return ACTION_ALREADY_DONE;
    }

}
Cmd.Craft = CmdCraft;

/* Executes buy command. */
export class CmdBuy extends CmdBase {

    public execute(obj) {
      const {items} = obj;
      items.forEach(item => {
        const [x, y] = item.getXY();
        const shopElem = this._actor.getLevel().getMap().getCell(x, y).getShop();
        const trans = new Component.Transaction();
        trans.setArgs({item, buyer: this._actor,
          shop: shopElem, seller: shopElem.getShopkeeper(), callback: obj.callback});
        console.log('Created buy transaction for ', item.getName());
        this._actor.add(trans);
      });
      return ACTION_ALREADY_DONE;
    }

}
Cmd.Buy = CmdBuy;

/* Executes sell command. */
export class CmdSell extends CmdBase {

    public execute(obj) {
      const {items} = obj;
      const shopElem = this._actor.getCell()!.getShop();
      if (!shopElem) {
        RG.err('CmdSell', 'execute',
          'Tried to sell in non-shop element cell');
      }
      items.forEach(item => {
        const trans = new Component.Transaction();
        trans.setArgs({item, buyer: shopElem.getShopkeeper(),
          shop: shopElem, seller: this._actor, callback: obj.callback});
        this._actor.add(trans);
      });
      return ACTION_ALREADY_DONE;
    }

}
Cmd.Sell = CmdSell;
