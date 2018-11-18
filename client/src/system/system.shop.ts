
import RG from '../rg';
import {SystemBase} from './system.base';
import * as Item from '../item';
import * as Component from '../component';

const {addSkillsExp} = SystemBase;

/* Processes entities with transaction-related components.*/
export class SystemShop extends SystemBase {
    constructor(compTypes, pool?) {
        super(RG.SYS.SHOP, compTypes, pool);
    }

    public updateEntity(ent) {
        const trans = ent.get('Transaction');
        const args = trans.getArgs();
        const {buyer} = args;
        this._checkArgsOK(ent, args);
        if (buyer.getID() === ent.getID()) {
            this.buyItem(args);
        }
        else {
            this.sellItem(args);
        }
        ent.remove(trans);
    }

    public _checkArgsOK(ent, args) {
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
            RG.err('System.Shop', '_checkArgsOK', msg);
        }
    }


    public buyItem(args) {
        const {item, buyer, shop, seller} = args;
        if (!buyer.getInvEq().canCarryItem(item)) {
            RG.gameMsg(buyer.getName() + ' cannot carry more weight');
            return;
        }
        const buyerCell = buyer.getCell();
        const value = item.getValue() * shop.getCostFactorSell();
        const goldWeight = RG.valueToGoldWeight(value);
        const nCoins = RG.getGoldInCoins(goldWeight);

        if (RG.hasEnoughGold(buyer, goldWeight)) {
            const coins = new Item.GoldCoin(RG.GOLD_COIN_NAME);
            const nCoinsRemoved = RG.removeNCoins(buyer, nCoins);
            coins.setCount(nCoinsRemoved);

            seller.getInvEq().addItem(coins);
            item.getOwner().removeProp('items', item);
            buyer.getInvEq().addItem(item);
            item.remove('Unpaid');
            RG.gameMsg({cell: buyerCell, msg: buyer.getName() +
                ' bought ' + item.getName() + ' for ' + nCoins + ' coins.'});
            addSkillsExp(seller, 'Trading', 1);
        }
        else {
            RG.gameMsg({cell: buyerCell, msg: buyer.getName() +
                ' doesn\'t have enough money to buy ' + item.getName() + ' for '
                + nCoins + ' coins.'});
        }
    }

    public sellItem(args) {
        const {item, buyer, seller, shop} = args;
        if (!seller) {
            RG.err('System.Shop', 'sellItem',
                'Seller is null or undefined.');
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

                const topItem = seller.getCell().getItems()[0];
                topItem.add(new Component.Unpaid());
                const itemName = topItem.getName();

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
            RG.gameMsg({cell: buyer.getCell(),
                msg: 'Buyer ' + name +
                ' doesn\'t have enough gold to buy it.'});
            if (args.callback) {
                const msg = `Cannot sell ${item.getName()}.`;
                args.callback({msg, result: false});
            }
        }

        return false;
    }
}
