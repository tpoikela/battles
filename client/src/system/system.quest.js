
const RG = require('../rg');
const ObjectShell = require('../objectshellparser');

const System = {};
System.Base = require('./system.base');

const parser = ObjectShell.getParser();

System.Quest = function(compTypes) {
    System.Base.call(this, RG.SYS.QUEST, compTypes);
    this.compTypesAny = true; // Triggered on at least one component

    this._eventTable = {
        kill: this.onKillEvent = this.onKillEvent.bind(this)
    };
};
RG.extend2(System.Quest, System.Base);

System.Quest.prototype.updateEntity = function(ent) {
    if (ent.has('GiveQuest')) {
        const giveComp = ent.get('GiveQuest');
        this.processGiveComp(ent, giveComp);
        ent.remove(giveComp);
    }
    if (ent.has('QuestCompleted')) {
        const complComp = ent.get('QuestCompleted');
        this.processComplComp(ent, complComp);
        ent.remove(complComp);
    }
    if (ent.has('QuestTargetEvent')) {
        const qEvent = ent.get('QuestTargetEvent');
        this.processQuestEvent(ent, qEvent);
        ent.remove(qEvent);
    }
};

/* When a quest is given to an actor, this function processes it. */
System.Quest.prototype.processGiveComp = function(ent, comp) {
    const giver = comp.getGiver();
    const giverComp = giver.get('QuestGiver');
    if (giverComp.getHasGivenQuest()) {
        return;
    }
    const questTargets = giverComp.getQuestTargets();
    const questComp = new RG.Component.Quest();
    questComp.setQuestID(giverComp.getQuestID());

    if (questTargets.length === 0) {
        RG.err('System.Quest', 'processGiveComp',
            `No keys in questData, giver: ${giver.getName}`);
    }

    questTargets.forEach(target => {
        const questTarget = Object.assign({}, target);
        questTarget.isCompleted = false;
        questComp.addTarget(questTarget);
    });

    giverComp.giveQuest(ent);
    questComp.setGiver({name: giver.getName(), id: giver.getID()});
    questComp.setDescr(giverComp.getDescr());
    ent.add(questComp);
    this.checkQuestMsgEmits(ent, questComp);
};

/* Checks if any messages should be shown to player after a quest is
 * accepted. */
System.Quest.prototype.checkQuestMsgEmits = function(ent, questComp) {
    const entLevel = ent.getLevel();
    const firstLevel = questComp.first('location');
    const giverName = questComp.getGiver().name;
    let msg = `You accept the quest from ${giverName}.`;
    if (firstLevel) {
        if (entLevel.getID() === firstLevel.id) {
            msg += ' You are already in the first quest location';
            this.setTargetCompleted(firstLevel, questComp);
        }
        else {
            msg += ' You should try to get to the first quest location';
        }
    }
    RG.gameMsg({cell: ent.getCell(), msg});
};

System.Quest.prototype.processComplComp = function(ent, comp) {
    const giver = comp.getGiver();
    const questID = giver.get('QuestGiver').getQuestID();
    const quests = ent.getList('Quest');
    // Need to find matching quest first
    const givenQuest = quests.find(quest => quest.getQuestID() === questID);

    if (givenQuest.isCompleted()) {
        const giverComp = giver.get('QuestGiver');
        // const questData = giverComp.getQuestData();
        const numSteps = giverComp.getQuestTargets().length;
        // Give exp reward
        const expPoints = giverComp.getDanger() * numSteps;
        const expComp = new RG.Component.ExpPoints(expPoints);
        ent.add(expComp);

        // Give reward, items + any other info
        this.giveQuestReward(ent, giverComp);
    }
    else {
        RG.gameDanger({cell: ent.getCell(), msg: 'Quest is not completed!'});
    }

};

System.Quest.prototype.giveQuestReward = function(ent, comp) {
    if (comp.hasReward()) {
        const reward = comp.getReward();
        // Right now, only items are supported, later add support for info etc
        if (reward.type === 'item') {
            const rewardName = reward.name;

            const item = parser.createItem(rewardName);
            if (item) {
                let msg = `${ent.getName()} receives ${item.getName()} as a `;
                msg += 'reward for completing the quest';
                RG.gameMsg({cell: ent.getCell(), msg});
                ent.getInvEq().getInventory().addItem(item);
            }
        }
    }
};

System.Quest.prototype.processQuestEvent = function(ent, qEvent) {
    const targetType = qEvent.getTarget().getTargetType();
    if (typeof this._eventTable[targetType] === 'function') {
        this._eventTable[targetType](ent, qEvent);
    }
    else {
        const keys = Object.keys(this._eventTable);
        RG.err('System.Quest', 'processQuestEvent',
            `No function for ${targetType} in eventTable. Found: ${keys}`);
    }
};

/* Called when quest event where an actor is killed happens. */
System.Quest.prototype.onKillEvent = function(ent, qEvent) {
    const args = qEvent.getArgs();
    if (args && args.corpse) {
        const actor = qEvent.getTarget();
        this.moveQuestTargetComp(actor, args.corpse);

        const questComp = ent.get('Quest');
        const targetObj = questComp.find(obj => obj.id === actor.getID());
        this.setTargetCompleted(targetObj, questComp);

        let msg = `${ent.getName()} has reached quest target of killing`;
        msg += ` ${actor.getName()}.`;
		RG.gameMsg({cell: ent.getCell(), msg});
    }
    else {
        RG.err('System.Quest', 'onKillEvent',
            `Args must contain corpse. Got: ${JSON.stringify(args)}`);

    }
};

/* Moves QuestTarget from one entity to another. */
System.Quest.prototype.moveQuestTargetComp = function(srcEnt, destEnt) {
    const qTarget = srcEnt.get('QuestTarget');
    qTarget.changeEntity(destEnt);
    qTarget.setIsCompleted(true);
    qTarget.setTarget(destEnt);
};


System.Quest.prototype.setTargetCompleted = function(targetObj, questComp) {
    const ent = questComp.getEntity();
    targetObj.isCompleted = true;
    if (questComp.isCompleted()) {
        let msg = `${ent.getName()} has completed a quest!`;
        msg += ' now it is time to go collect the reward.';
        RG.gameMsg({cell: ent.getCell(), msg});
    }
};

module.exports = System.Quest;
