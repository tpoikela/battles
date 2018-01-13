
/* This file contains objecsts for chat interactions between player and NPCs. */

const RG = require('./rg');

const Chat = {};

const stats = RG.STATS;

/* Chat Object for trainers in the game. */
class ChatTrainer {

    constructor() {
        this.selectionObject = {
            showMenu: () => true,
            getMenu: () => {
                RG.gameMsg('Please select a stat to train:');
                const indices = RG.menuIndices.slice(0, 6);
                const menuObj = {};
                stats.forEach((stat, index) => {
                    menuObj[indices[index]] = stats[index];
                    menuObj[indices[index]] += ` (${this.costs[index]} gold)`;
                });
                return menuObj;

            },
            select: code => {
                const selection = RG.codeToIndex(code);
                if (selection < stats.length) {
                    const statSel = stats[selection];
                    const cost = this.costs[selection];
                    return this.trainCallback(statSel, cost);
                }
                return null;
            }
        };
        this.trainCallback = this.trainCallback.bind(this);
    }

    getSelectionObject() {
        return this.selectionObject;
    }

    /* Sets the target to train. */
    setTrainer(trainer) {
        this.trainer = trainer;
    }

    /* Sets the target to train. Computes also the training costs based on the
     * stats of the target. */
    setTarget(target) {
        this.target = target;
        this.costs = [];
        stats.forEach((stat) => {
            const getFunc = 'get' + stat;
            this.costs.push(100 * target.get('Stats')[getFunc]());
        });
    }

    getSelectionObject() {
        return this.selectionObject;
    }

    trainCallback(statSel, cost) {
        const cb = () => {
            const gw = RG.valueToGoldWeight(cost);
            const taName = this.target.getName();

            if (!RG.hasEnoughGold(this.target, gw)) {
                const msg = `${taName} does not have enough gold.`;
                RG.gameMsg({cell: this.target.getCell(), msg});
                return;
            }
            else {
                const nCoins = RG.getGoldInCoins(gw);
                const coins = new RG.Item.GoldCoin();
                coins.count = RG.removeNCoins(this.target, nCoins);
                this.trainer.getInvEq().addItem(coins);
            }

            const targetStats = this.target.get('Stats');
            const trainerStats = this.trainer.get('Stats');
            const getFunc = 'get' + statSel;
            const setFunc = 'set' + statSel;
            const targetVal = targetStats[getFunc]();
            const trainerVal = trainerStats[getFunc]();

            const trName = this.trainer.getName();
            if (targetVal < trainerVal) {
                const newTargetVal = targetVal + 1;
                targetStats[setFunc](newTargetVal);
                const msg = `${trName} trains ${statSel} of ${taName}`;
                RG.gameMsg({cell: this.target.getCell(), msg});
            }
            else {
                const msg = `${trName} doesn't have skill to train that stat`;
                RG.gameMsg({cell: this.target.getCell(), msg});
            }
        };
        return cb;
    }

}
Chat.Trainer = ChatTrainer;


module.exports = Chat;
