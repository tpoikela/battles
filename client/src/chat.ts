
/* This file contains objecsts for chat interactions between player and NPCs. */

import RG from './rg';
import {Keys} from './keymap';
import * as Menu from './menu';
import * as Item from './item';
import * as Component from './component/component';
import {BrainPlayer} from './brain/brain.player';

type SentientActor = import('./actor').SentientActor;

export const Chat: any = {};
const stats = RG.STATS;

const EXIT_MENU = Menu.Menu.EXIT_MENU;

const OPTION_GOODBYE = {
    name: 'Say goodbye',
    option: EXIT_MENU
};

interface SelObject {
    pre?: string[];
    post?: string[];
    showMenu(): boolean;
    getMenu?(): any;
    select(code: number): void;
}

Chat.TOP_MENU = 'TOP_MENU';


/* Trades the given gold weight from given to another actor. */
Chat.tradeGoldWeightFromTo = (gw, actorFrom, actorTo) => {
    const nCoins = RG.getGoldInCoins(gw);
    const coins = new Item.GoldCoin();
    const nCoinsRemoved = RG.removeNCoins(actorFrom, nCoins);
    coins.setCount(nCoinsRemoved);
    actorTo.getInvEq().addItem(coins);
};


/* Chat object added to actors which have any interesting things to chat about.
 */
export class ChatBase {

    public chatter: SentientActor;
    public options: any[];
    public parent: any | null;
    public pre: string[];
    public post: string[];
    public selectionObject: SelObject;
    public name: string;

    constructor() {
        this.options = [];
        this.parent = null;
        this.name = '';
    }

    public setName(name: string): void {
        this.name = name;
    }

    public getName(): string {
        return this.name;
    }

    /* Adds a chat object or an option into this object. */
    public add({name, option}) {
        this.options.push({name, option});
        if (option && option.setParent) {
            option.setParent(this);
        }
    }

    public clearOptions() {
        this.options = [];
    }

    public setParent(parent) {
        this.parent = parent;
    }

    public getParent() {
        return this.parent;
    }

    public getSelectionObject(): SelObject {
        const selObj: SelObject = {
            showMenu: () => true,
            getMenu: () => {
                const menuObj: any = {pre: [], post: []};
                this.options.forEach((opt, i) => {
                    menuObj[Keys.menuIndices[i]] = opt.name;
                });
                if (this.pre) {
                    menuObj.pre = this.pre;
                }
                if (this.post) {
                    menuObj.post = this.post;
                }
                addGoodbyeOption(menuObj);
                return menuObj;
            },
            select: code => {
                const selection = Keys.codeToIndex(code);
                if (selection < this.options.length) {
                    const value = this.options[selection].option;
                    if (value !== EXIT_MENU) {
                        if (value.getSelectionObject) {
                            return value.getSelectionObject();
                        }
                    }
                    return value;
                }
                return EXIT_MENU;
            }
        };
        return selObj;
    }

}
Chat.ChatBase = ChatBase;

/* Object used in actors which can give quests. */
export class ChatQuest extends ChatBase {

    public questGiver: SentientActor;

    constructor() {
        super();
        const acceptOpt = {
            name: 'Accept the quest',
            option: this.questCallback.bind(this)
        };
        const refuseOpt = {
            name: 'Refuse the quest',
            option: EXIT_MENU
        };
        this.add(acceptOpt);
        this.add(refuseOpt);
    }

    public setQuestGiver(giver) {
        this.questGiver = giver;
    }

    public setTarget(target) {
        const giver = this.questGiver;
        this.chatter = target;
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

    public questCallback() {
        if (RG.isNullOrUndef([this.chatter, this.questGiver])) {
            RG.err('ChatQuest', 'questCallback',
                'target and questGiver must be defined');
        }
        const giveQuestComp = new Component.GiveQuest();
        giveQuestComp.setTarget(this.chatter);
        giveQuestComp.setGiver(this.questGiver);
        this.chatter.add(giveQuestComp);
    }

    public rewardCallback() {
        const questCompl = new Component.QuestCompleted();
        questCompl.setGiver(this.questGiver);
        this.chatter.add(questCompl);
    }

}
Chat.Quest = ChatQuest;

/* Chat Object for trainers in the game. */
export class ChatTrainer extends ChatBase {

    public trainer: SentientActor;
    public costs: any;

    constructor() {
        super();
        this.selectionObject = {
            showMenu: () => true,
            // pre: ['Please select a stat to train:'],
            getMenu: () => {
                // RG.gameMsg('');
                const indices = Keys.menuIndices.slice(0, 6);
                const menuObj: any = {};
                menuObj.pre = ['Please select a stat to train:'];
                stats.forEach((stat, index) => {
                    menuObj[indices[index]] = stats[index];
                    menuObj[indices[index]] += ` (${this.costs[index]} gold)`;
                });
                addGoodbyeOption(menuObj);
                return menuObj;

            },
            select: code => {
                const selection = Keys.codeToIndex(code);
                if (selection < stats.length) {
                    const statSel = stats[selection];
                    const cost = this.costs[selection];
                    return this.trainCallback(statSel, cost);
                }
                return EXIT_MENU;
            }
        };
        this.trainCallback = this.trainCallback.bind(this);
    }

    /* Sets the target to train. */
    public setTrainer(trainer) {
        this.trainer = trainer;
    }

    /* Sets the target to train. Computes also the training costs based on the
     * stats of the target. */
    public setTarget(target) {
        this.chatter = target;
        this.costs = [];
        stats.forEach(stat => {
            const getFunc = 'get' + stat;
            this.costs.push(100 * target.get('Stats')[getFunc]());
        });
    }

    public getSelectionObject() {
        return this.selectionObject;
    }

    public trainCallback(statSel, cost) {
        const cb = () => {
            const gw = RG.valueToGoldWeight(cost);
            const taName = this.chatter.getName();

            if (!RG.hasEnoughGold(this.chatter, gw)) {
                const msg = `${taName} does not have enough gold.`;
                RG.gameMsg({cell: this.chatter.getCell(), msg});
                return;
            }
            else {
                Chat.tradeGoldWeightFromTo(gw, this.chatter, this.trainer);
            }

            const targetStats = this.chatter.get('Stats');
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
                RG.gameMsg({cell: this.chatter.getCell(), msg});
            }
            else {
                const msg = `${trName} doesn't have skill to train that stat`;
                RG.gameMsg({cell: this.chatter.getCell(), msg});
            }
        };
        return cb;
    }

}
Chat.Trainer = ChatTrainer;

/* Object attached to wizards selling magical services. */
export class ChatWizard extends ChatBase {

    public wizard: SentientActor;
    public costs: {[key: string]: number};

    constructor() {
        super();
        this.costs = {
            0: 10,
            1: 45,
            2: 50
        };
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
                const selection: number = Keys.codeToIndex(code);
                return this.wizardCallback(selection);
            }
        };
        this.wizardCallback = this.wizardCallback.bind(this);
    }

    /* Sets the target to train. */
    public setWizard(wizard) {
        this.wizard = wizard;
    }

    public getSelectionObject(): SelObject {
        return this.selectionObject;
    }

    public wizardCallback(index) {
        const cost: number  = this.costs[index];
        const cb = () => {
            if (!RG.hasEnoughGold(this.chatter, cost)) {
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

    public restorePP(numPP) {
        const spellPower = this.wizard.get('SpellPower');
        spellPower.decrPP(numPP);
        const spTarget = this.chatter.get('SpellPower');
        spTarget.addPP(numPP);
    }

    public setRuneSelectionObject() {
        // TODO Create a list of possible runes to charge up and
        // add associated callback for charging the rune
        const selObj = {};
        const brain = this.chatter.getBrain() as BrainPlayer;
        brain.setSelectionObject(selObj);
    }

}
Chat.Wizard = ChatWizard;


class ChatComposite extends ChatBase {

    protected subChats: ChatBase[];

    constructor() {
        super();
    }

    public addChat(chat: ChatBase): void {
        this.subChats.push(chat);
    }
}

function addGoodbyeOption(menuObj): void {
    menuObj.Q = OPTION_GOODBYE.name;
}
