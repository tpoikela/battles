
const RG = require('../rg');
const ObjectShell = require('../objectshellparser');

const System = {};
System.Base = require('./system.base');

const parser = ObjectShell.getParser();

System.Quest = function(compTypes) {
    System.Base.call(this, RG.SYS.QUEST, compTypes);
    this.compTypesAny = true; // Triggered on at least one component

    this._eventTable = {
        kill: this.onKillEvent = this.onKillEvent.bind(this),
        listen: this.onListenEvent = this.onListenEvent.bind(this),
        read: this.onReadEvent = this.onReadEvent.bind(this),
        report: this.onReportEvent = this.onReportEvent.bind(this)
    };
};
RG.extend2(System.Quest, System.Base);

System.Quest.prototype.updateEntity = function(ent) {
    if (ent.has('GiveQuest')) {
        const giveComp = ent.get('GiveQuest');
        this.processGiveQuestComp(ent, giveComp);
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
System.Quest.prototype.processGiveQuestComp = function(ent, comp) {
    const giver = comp.getGiver();
    const giverComp = giver.get('QuestGiver');
    if (giverComp.getHasGivenQuest()) {
        return;
    }
    const questTargets = giverComp.getQuestTargets();
    const questComp = new RG.Component.Quest();
    questComp.setQuestID(giverComp.getQuestID());

    if (questTargets.length === 0) {
        RG.err('System.Quest', 'processGiveQuestComp',
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
    console.log('processComplComp');
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
        if (!comp.getHasGivenReward()) {
            comp.setHasGivenReward(true);
            const reward = comp.getReward();
            // Right now, only items are supported, later add support for
            // info etc
            if (reward.type === 'item') {
                const rewardName = reward.name;

                const item = parser.createItem(rewardName);
                if (item) {
                    let msg = `${ent.getName()} receives ${item.getName()} as`;
                    msg += ' a reward for completing the quest';
                    RG.gameMsg({cell: ent.getCell(), msg});
                    ent.getInvEq().getInventory().addItem(item);
                }
            }
        }
        else {
            const msg = 'Reward has already been given!';
            RG.gameMsg({cell: ent.getCell(), msg});
        }
    }
};

System.Quest.prototype.processQuestEvent = function(ent, qEvent) {
    const targetType = qEvent.getEventType();
    const quests = ent.getList('Quest');
    if (typeof this._eventTable[targetType] === 'function') {
        quests.forEach(questComp => {
            if (isEventValidForThisQuest(qEvent, questComp)) {
                this._eventTable[targetType](ent, qEvent, questComp);
            }
        });
    }
    else {
        const keys = Object.keys(this._eventTable);
        RG.err('System.Quest', 'processQuestEvent',
            `No function for ${targetType} in eventTable. Found: ${keys}`);
    }
};

/* Called when quest event where an actor is killed happens. */
System.Quest.prototype.onKillEvent = function(ent, qEvent, questComp) {
    const args = qEvent.getArgs();
    if (args && args.corpse) {
        const targetComp = qEvent.getTargetComp();
        const actor = targetComp.getTarget();
        this.moveQuestTargetComp(actor, args.corpse);

        const questTargets = questComp.getQuestTargets();
        const targetObj = questTargets.find(obj => (
            obj.id === actor.getID()));
        this.setTargetCompleted(targetObj, questComp);

        let msg = `${ent.getName()} has reached quest target of killing`;
        msg += ` ${actor.getName()}.`;
        RG.gameMsg({cell: ent.getCell(), msg});
    }
    else {
        RG.err('System.Quest', 'onKillEvent',
            `Args must contain |corpse|. Got: ${JSON.stringify(args)}`);
    }
};

System.Quest.prototype.onListenEvent = function(ent, qEvent, questComp) {
    const args = qEvent.getArgs();
    if (args && args.info) {
        const info = args.info.getInfo();
        const actor = args.src;
        const msg = `${actor.getName()} tells about ${info}`;
        RG.gameMsg({msg, cell: ent.getCell()});
        ent.add(args.info.clone());

        const listenID = actor.getID();
        const questTargets = questComp.getQuestTargets();
        const targetObj = questTargets.find(obj => obj.id === listenID);
        this.setTargetCompleted(targetObj, questComp);
    }
    else {
        RG.err('System.Quest', 'onListenEvent',
            `Args must contain |info|. Got: ${JSON.stringify(args)}`);
    }
};

System.Quest.prototype.onReadEvent = function(ent, qEvent, questComp) {
    const targetComp = qEvent.getTargetComp();
    const readEntity = targetComp.getTarget();
    const questTargets = questComp.getQuestTargets();
    const targetObj = questTargets.find(obj => (
        obj.id === readEntity.getID()));
    this.setTargetCompleted(targetObj, questComp);
};

System.Quest.prototype.onReportEvent = function(ent, qEvent, questComp) {
    const questTargets = questComp.getQuestTargets();
    const targetComp = qEvent.getTargetComp();
    const reportTarget = targetComp.getTarget();
    const tName = reportTarget.getName();

    let reportOK = false;
    if (reportTarget.has('QuestReport')) {
        const reportComp = reportTarget.get('QuestReport');
        const questInfo = qEvent.getArgs().info;
        // Handles part where specific info has been given via 'listen'
        if (questInfo) {
            if (reportComp.getExpectInfoFrom() === questInfo.getGivenBy()) {
                reportOK = true;
            }
            else {
                const msg = `${tName} is not interested in this info`;
                RG.gameMsg({cell: ent.getCell(), msg});
            }
        } // Handle other reporting like kill/spy/goto etc
        else if (questComp.isTargetInQuest(targetComp)) {
            const questTargets = questComp.getQuestTargets();
            // Filter out report target
            const otherTargets = questTargets.filter(obj => (
                obj.id !== reportTarget.getID()));
            // Check that all other goals are completed
            reportOK = otherTargets.reduce((acc, obj) => acc && obj.isCompleted,
                true);
        }
    }

    if (reportOK) {
        const targetReportObj = questTargets.find(obj => (
            obj.id === reportTarget.getID()
        ));
        const msg = `${ent.getName()} reports info to ${tName}`;
        RG.gameMsg({cell: ent.getCell(), msg});
        this.setTargetCompleted(targetReportObj, questComp);
    }
};

/* Moves QuestTarget from one entity to another. */
System.Quest.prototype.moveQuestTargetComp = function(srcEnt, destEnt) {
    try {
        const qTarget = srcEnt.get('QuestTarget');
        qTarget.changeEntity(destEnt);
        qTarget.setIsCompleted(true);
        qTarget.setTarget(destEnt);
    }
    catch (e) {
        console.log('srcEnt is', srcEnt);
        console.log(e.message);
    }
};


System.Quest.prototype.setTargetCompleted = function(targetObj, questComp) {
    const ent = questComp.getEntity();
    if (targetObj.isCompleted === false) {
        targetObj.isCompleted = true;
    }
    else {
        let json = 'targetObj: ' + JSON.stringify(targetObj);
        json += 'targetQuest: ' + JSON.stringify(questComp);
        RG.err('System.Quest', 'setTargetCompleted',
            'Tried to set completed quest to completed again: ' + json);
    }

    if (questComp.isCompleted()) {
        let msg = `${ent.getName()} has completed a quest!`;
        msg += ' now it is time to go collect the reward.';
        RG.gameMsg({cell: ent.getCell(), msg});
    }
};

function isEventValidForThisQuest(qEvent, questComp) {
    const qTarget = qEvent.getTargetComp();
    return questComp.isInThisQuest(qTarget);
}

module.exports = System.Quest;
