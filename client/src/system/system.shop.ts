
import RG from '../rg';
import {SystemBase} from './system.base';
import * as Item from '../item';
import * as Component from '../component';
import {ElementShop} from '../element';
import {SentientActor} from '../actor';

type EventPool = import('../eventpool').EventPool;

const {addSkillsExp} = SystemBase;

interface TransArgs {
    buyer: SentientActor;
    seller: SentientActor;
    item: Item.ItemBase;
    shop: ElementShop;
    count?: number;
    callback?: (obj: any) => void;
}

/* Processes entities with transaction-related components.*/
export class SystemShop extends SystemBase {
    constructor(compTypes: string[], pool: EventPool) {
        super(RG.SYS.SHOP, compTypes, pool);
    }

    public updateEntity(ent): void {
        const transactions = ent.getList('Transaction');
        transactions.forEach(trans => {
            const args: TransArgs = trans.getArgs();
            const {buyer} = args;
            this._checkTransArgsOK(ent, args);
            if (buyer.getID() === ent.getID()) {
                this.buyItem(args);
            }
            else {
                this.sellItem(args);
            }
            ent.remove(trans);
        });
    }

    public _checkTransArgsOK(ent, args: TransArgs): void {
        const {item, buyer, shop, seller} = args;
        let msg = '';
        if (!item) {
            msg += 'Item is null/undef. ';
        }
        if (!buyer) {
            msg += 'Buyer is null/undef. ';
        }
        if (!seller) {
            msg += 'Seller is null/undef. ';
        }
        if (!shop) {
            msg += 'Shop (element) is null/undef. ';
        }
        if (msg !== '') {
            msg += 'Entity: ' + ent.getName();
            RG.err('System.Shop', '_checkTransArgsOK', msg);
        }
    }


    public buyItem(args: TransArgs): void {
        const {item, buyer, shop, seller} = args;
        const buyerCell = buyer.getCell();
        const value = item.getValue() * shop.getCostFactorSell();
        const goldWeight = RG.valueToGoldWeight(value);
        const nCoins = RG.getGoldInCoins(goldWeight);

        if (RG.hasEnoughGold(buyer, goldWeight)) {
            const coins = new Item.GoldCoin(RG.GOLD_COIN_NAME);
            const nCoinsRemoved = RG.removeNCoins(buyer, nCoins);
            coins.setCount(nCoinsRemoved);

            if (!buyer.getInvEq().canCarryItem(item)) {
                buyer.getInvEq().addItem(coins); // Add coins back
                const msg = buyer.getName() + ' cannot carry more weight';
                RG.gameMsg({cell: buyer.getCell()!, msg});
                if (args.callback) {
                    args.callback({msg, result: false});
                }
                return;
            }

            seller.getInvEq().addItem(coins);
            const level = seller.getLevel();
            if (level.removeItem(item, shop.getX(), shop.getY())) {
                buyer.getInvEq().addItem(item);
                item.remove('Unpaid');
                const msg = buyer.getName() +
                    ' bought ' + item.getName() + ' for ' + nCoins + ' coins.';
                RG.gameMsg({cell: buyerCell, msg});
                if (args.callback) {
                    args.callback({msg, result: true});
                }
                addSkillsExp(seller, 'Trading', 1);
            }
            else {
                RG.err('System.Shop', 'buyItem',
                   'Could not remove item from level');
            }
        }
        else {
            const msg = buyer.getName() + ' doesn\'t have enough money to buy '
                + item.getName() + ' for ' + nCoins + ' coins.'
            RG.gameMsg({cell: buyerCell, msg});
            if (args.callback) {
                args.callback({msg, result: false});
            }
        }
    }

    public sellItem(args: TransArgs): void {
        const {item, buyer, seller, shop} = args;
        if (!seller) {
            RG.err('System.Shop', 'sellItem',
                'Seller is null or undefined.');
        }

        if (!this.willingToBuyItem(item, buyer)) {
            let itemName = item.getName();
            if (item.getCount() > 1) {
                itemName = RG.pluralize(itemName);
            }
            const msg = `${buyer.getName()} is not interested in ${itemName}.`;
            RG.gameMsg({cell: seller.getCell(), msg});
            if (args.callback) {
                args.callback({msg, result: false});
            }
            return;
        }

        const count = args.count || 1;
        const sellerCell = seller.getCell();
        const value = count * item.getValue() * shop.getCostFactorBuy();
        const goldWeight = RG.valueToGoldWeight(value);
        const nCoins = RG.getGoldInCoins(goldWeight);

        if (RG.hasEnoughGold(buyer, goldWeight)) {
            if (seller.getInvEq().dropNItems(item, count)) {
                const coins = new Item.GoldCoin(RG.GOLD_COIN_NAME);
                const nCoinsRemoved = RG.removeNCoins(buyer, nCoins);
                coins.setCount(nCoinsRemoved);
                seller.getInvEq().addItem(coins);

                // New item is found at the bottom
                const cellItems = seller.getCell().getItems();
                const bottomItem = cellItems[cellItems.length - 1];
                bottomItem.add(new Component.Unpaid());

                const itemName = bottomItem.getName();
                RG.gameMsg({cell: sellerCell, msg: seller.getName() +
                    ' sold ' + itemName + ' for ' + nCoins + ' coins.'});
                if (args.callback) {
                    const msg = `${item.getName()} was sold.`;
                    args.callback({msg, result: true});
                }
                addSkillsExp(seller, 'Trading', 1);
            }
        }
        else {
            const name = buyer.getName();
            const msg = name + ' doesn\'t have enough gold to buy it';
            RG.gameMsg({cell: buyer.getCell(), msg});
            if (args.callback) {
                args.callback({msg, result: false});
            }
        }
    }

    public willingToBuyItem(item, buyer): boolean {
        if (item.getName() === RG.GOLD_COIN_NAME) {
            return false;
        }
        return true;
    }

}
