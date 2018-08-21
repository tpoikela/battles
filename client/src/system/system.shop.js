
const RG = require('../rg');

const System = {};
System.Base = require('./system.base');

const {addSkillsExp} = System.Base;

/* Processes entities with transaction-related components.*/
System.Shop = function(compTypes) {
    System.Base.call(this, RG.SYS.SHOP, compTypes);

    this.updateEntity = function(ent) {
        const trans = ent.get('Transaction');
        const args = trans.getArgs();
        if (args.buyer.getID() === ent.getID()) {
            this.buyItem(args);
        }
        else {
            this.sellItem(args);
        }
        ent.remove(trans);
    };


    this.buyItem = function(args) {
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
            const coins = new RG.Item.GoldCoin(RG.GOLD_COIN_NAME);
            coins.count = RG.removeNCoins(buyer, nCoins);
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
                " doesn't have enough money to buy " + item.getName() + ' for '
                + nCoins + ' coins.'});
        }
    };

    this.sellItem = function(args) {
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
                const coins = new RG.Item.GoldCoin(RG.GOLD_COIN_NAME);
                coins.count = RG.removeNCoins(buyer, nCoins);
                seller.getInvEq().addItem(coins);

                const topItem = seller.getCell().getItems()[0];
                topItem.add('Unpaid', new RG.Component.Unpaid());
                const itemName = topItem.getName();

                RG.gameMsg({cell: sellerCell, msg: seller.getName() +
                    ' sold ' + itemName + ' for ' + nCoins + ' coins.'});
                if (args.callback) {
                    const msg = `${item.getName()} was sold.`;
                    args.callback({msg: msg, result: true});
                }
                addSkillsExp(seller, 'Trading', 1);
            }
        }
        else {
            const name = buyer.getName();
            RG.gameMsg({cell: buyer.getCell(),
                msg: 'Buyer ' + name +
                " doesn't have enough gold to buy it."});
            if (args.callback) {
                const msg = `Cannot sell ${item.getName()}.`;
                args.callback({msg: msg, result: false});
            }
        }

        return false;
    };

};
RG.extend2(System.Shop, System.Base);


module.exports = System.Shop;
