
/* This file contains objecsts for chat interactions between player and NPCs. */

const RG = require('./rg');
const Keys = require('./keymap');

const Chat = {};

const stats = RG.STATS;

/* Chat Object for trainers in the game. */
class ChatTrainer {

    constructor() {
        this.selectionObject = {
            showMenu: () => true,
            getMenu: () => {
                RG.gameMsg('Please select a stat to train:');
                const indices = Keys.menuIndices.slice(0, 6);
                const menuObj = {};
                stats.forEach((stat, index) => {
                    menuObj[indices[index]] = stats[index];
                    menuObj[indices[index]] += ` (${this.costs[index]} gold)`;
                });
                return menuObj;

            },
            select: code => {
                const selection = Keys.codeToIndex(code);
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
        stats.forEach(stat => {
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
                RG.tradeGoldWeightFromTo(gw, this.target, this.trainer);
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

/* Object attached to wizards selling magical services. */
class ChatWizard {

    constructor() {
        this.selectionObject = {
            showMenu: () => true,

            getMenu: () => {
                RG.gameMsg('Please select a magical service to buy:');
                const spellPower = this.wizard.get('SpellPower');
                const ppLeft = spellPower.getPP();
                const menuObj = {};
                if (ppLeft >= 10) {
                    menuObj[0] = 'Restore 10pp - 10 gold coins';
                }
                if (ppLeft >= 50) {
                    menuObj[1] = 'Restore 50pp - 45 gold coins';
                }
                if (ppLeft >= 25) {
                    menuObj[2] = 'Add one charge to rune - 50 gold coins';
                }
            },
            select: code => {
                const selection = Keys.codeToIndex(code);
                console.log(selection);
                return this.wizardCallback();
            }
        };
        this.wizardCallback = this.wizardCallback.bind(this);
    }

    /* Sets the target to train. */
    setWizard(wizard) {
        this.wizard = wizard;
    }

    getSelectionObject() {
        return this.selectionObject;
    }

    wizardCallback(index, cost) {
        const cb = () => {
            if (!RG.hasEnoughGold(this.target, cost)) {
                return;
            }
            switch (index) {
                case 0: this.restorePP(10); break;
                case 1: this.restorePP(50); break;
                case 2: this.setRuneSelectionObject(); break;
                default: break;
            }

        };
        return cb;
    }

    restorePP(numPP) {
        const spellPower = this.wizard.get('SpellPower');
        spellPower.decrPP(numPP);
        const spTarget = this.target.get('SpellPower');
        spTarget.addPP(numPP);
    }

    setRuneSelectionObject() {
        // Create a list of possible runes to charge up
        const selObj = {};

        this.target.setSelectionObject(selObj);
    }

}
Chat.Wizard = ChatWizard;

module.exports = Chat;
