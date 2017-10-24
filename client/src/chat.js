
/* This file contains objecsts for chat interactions between player and NPCs. */

const RG = require('./rg');

const Chat = {};

const stats = ['Acc', 'Agi', 'Wil', 'Mag', 'Per', 'Str'];

class ChatTrainer {

    constructor() {
        this.selectionObject = {
            showMenu: () => true,
            getMenu: function() {
                RG.gameMsg('Please select a stat to train:');
                const indices = RG.menuIndices.slice(0, 6);
                const menuObj = {};
                stats.forEach((stat, index) => {
                    menuObj[indices[index]] = stats[index];
                });
                return menuObj;

            },
            select: code => {
                const selection = RG.codeToIndex(code);
                if (selection < stats.length) {
                    const statSel = stats[selection];
                    const name = this.target.getName();
                    const tName = this.trainer.getName();
                    const msg = `${name} trains ${statSel} with ${tName}`;
                    RG.gameMsg(msg);
                    // TODO add callback for training
                    this.trainCallback(statSel);
                }
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

    /* Sets the target to train. */
    setTarget(target) {
        this.target = target;
    }

    getSelectionObject() {
        return this.selectionObject;
    }

    trainCallback(statSel) {
        console.log('Train callback was called with: ' + statSel);
    }

}
Chat.Trainer = ChatTrainer;


module.exports = Chat;
