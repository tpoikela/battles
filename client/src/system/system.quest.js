
const RG = require('../rg');

const System = {};
System.Base = require('./system.base');

System.Quest = function(compTypes) {
    System.Base.call(this, RG.SYS.QUEST, compTypes);
    this.compTypesAny = true; // Triggered on at least one component
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
};

/* When a quest is given to an actor, this function processes it. */
System.Quest.prototype.processGiveComp = function(ent, comp) {
    const giver = comp.getGiver();
    const giverComp = giver.get('QuestGiver');
    if (giverComp.getHasGivenQuest()) {
        return;
    }
    const questData = giverComp.getQuestData();
    const questKeys = questData.keys();
    const questComp = new RG.Component.Quest();
    giverComp.setQuestID(questComp.getID());

    if (questKeys.length === 0) {
        RG.err('System.Quest', 'processGiveComp',
            `No keys in questData, giver: ${giver.getName}`);
    }

    questData.resetIter();
    questKeys.forEach(key => {
        let questTarget = questData.next(key);
        while (questTarget) {
            const targetComp = questTarget.get('QuestTarget');
            if (targetComp) {
                questComp.addTarget(targetComp);
            }
            questTarget = questData.next(key);
        }
    });

    giverComp.giveQuest(ent);
    questComp.setGiver(giver);
    ent.add(questComp);
    this.checkQuestMsgEmits(ent, questComp);
    console.log('SystemQuest added Quest to', ent.getName());
};

/* Checks if any messages should be shown to player after a quest is
 * accepted. */
System.Quest.prototype.checkQuestMsgEmits = function(ent, questComp) {
    const entLevel = ent.getLevel();
    const firstLevel = questComp.first('location');
    const giverName = questComp.getGiver().getName();
    let msg = `You accept the quest from ${giverName}.`;
    if (firstLevel) {
        if (entLevel.getID() === firstLevel.getID()) {
            msg += ' You are already in the first quest location';
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
    const givenQuest = quests.find(quest => quest.getID() === questID);

    if (givenQuest.isCompleted()) {
        const giverComp = giver.get('QuestGiver');
        const questData = giverComp.getQuestData();
        // Give exp reward
        const expPoints = giverComp.getDanger() * questData.numSteps();
        const expComp = new RG.Component.ExpPoints(expPoints);
        ent.add(expComp);

        // Give reward, items + any other info
    }
    else {
        RG.gameDanger({cell: ent.getCell(), msg: 'Quest is not completed!'});
    }
};

module.exports = System.Quest;
