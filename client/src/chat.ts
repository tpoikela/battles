
/* This file contains objecsts for chat interactions between player and NPCs. */

const RG = require('./rg');
const Keys = require('./keymap');
const Menu = require('./menu');

const Chat = {};
const stats = RG.STATS;

const OPTION_GOODBYE = {
    name: 'Say goodbye',
    option: Menu.EXIT_MENU
};

/* Chat object added to actors which have any interesting things to chat about.
 */
class ChatBase {

    constructor() {
        this.options = [];
        this.parent = null;
    }

    /* Adds a chat object or an option into this object. */
    add({name, option}) {
        this.options.push({name, option});
        if (option && option.setParent) {
            option.setParent(this);
        }
    }

    clearOptions() {
        this.options = [];
    }

    setParent(parent) {
        this.parent = parent;
    }

    getParent() {
        return this.parent;
    }

    getSelectionObject() {
        const selObj = {
            showMenu: () => true,
            getMenu: () => {
                const menuObj = {};
                this.options.forEach((opt, i) => {
                    menuObj[Keys.menuIndices[i]] = opt.name;
                });
                if (this.pre) {
                    menuObj.pre = this.pre;
                }
                if (this.post) {
                    menuObj.post = this.post;
                }
                menuObj.Q = OPTION_GOODBYE.name;
                return menuObj;
            },
            select: code => {
                const selection = Keys.codeToIndex(code);
                if (selection < this.options.length) {
                    const value = this.options[selection].option;
                    if (value !== Menu.EXIT_MENU) {
                        if (value.getSelectionObject) {
                            return value.getSelectionObject();
                        }
                    }
                    return value;
                }
                return Menu.EXIT_MENU;
            }
        };
        return selObj;
    }

}
Chat.ChatBase = ChatBase;

/* Object used in actors which can give quests. */
class ChatQuest extends ChatBase {

    constructor() {
        super();
        const acceptOpt = {
            name: 'Accept the quest',
            option: this.questCallback.bind(this)
        };
        const refuseOpt = {
            name: 'Refuse the quest',
            option: Menu.EXIT_MENU
        };
        this.add(acceptOpt);
        this.add(refuseOpt);
    }

    setQuestGiver(giver) {
        this.questGiver = giver;
    }

    setTarget(target) {
        const giver = this.questGiver;
        this.target = target;
        const qLen = 'lengthy';
        const giverComp = this.questGiver.get('QuestGiver');
        if (!giverComp.getHasGivenQuest()) {
            this.pre = [
                `${giver.getName()} wants to offer a ${qLen} quest:`,
                `${giverComp.getDescr()}`,
                'What do you want to do?'
            ];
        }
        else {
            this.pre = [
                `${giver.getName()} has already given this quest:`,
                `${giverComp.getDescr()}`,
                'What do you want to do?'
            ];
            this.clearOptions();
            const rewardOpt = {
                name: 'Claim the reward',
                option: this.rewardCallback.bind(this)
            };
            this.add(rewardOpt);
        }
    }

    questCallback() {
        if (RG.isNullOrUndef([this.target, this.questGiver])) {
            RG.err('ChatQuest', 'questCallback',
                'target and questGiver must be defined');
        }
        const giveQuestComp = new RG.Component.GiveQuest();
        giveQuestComp.setTarget(this.target);
        giveQuestComp.setGiver(this.questGiver);
        this.target.add(giveQuestComp);
    }

    rewardCallback() {
        const questCompl = new RG.Component.QuestCompleted();
        questCompl.setGiver(this.questGiver);
        this.target.add(questCompl);
    }

}
Chat.Quest = ChatQuest;

/* Chat Object for trainers in the game. */
class ChatTrainer {

    constructor() {
        this.selectionObject = {
            showMenu: () => true,
            pre: 'Please select a stat to train:',
            getMenu: () => {
                // RG.gameMsg('');
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
