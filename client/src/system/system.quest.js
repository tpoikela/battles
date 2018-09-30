
const RG = require('../rg');

const System = {};
System.Base = require('./system.base');

System.Quest = function(compTypes) {
    System.Base.call(this, RG.SYS.QUEST, compTypes);
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
        this.processCompleteComp(ent, complComp);
        ent.remove(complComp);
    }
};

System.Quest.prototype.processGiveComp = function(ent, comp) {
    const giver = comp.getGiver();
    const giverComp = giver.get('QuestGiver');
    const questData = giverComp.getQuestData();
    const questKeys = questData.keys();
    const questComp = new RG.Component.Quest();

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
    // questComp.setQuestData(questData);
    questComp.setGiver(giver);
    ent.add(questComp);
    console.log('SystemQuest added Quest to', ent.getName());
};

/*
System.Quest.prototype.processComplComp = function(ent, comp) {

};
*/

module.exports = System.Quest;
