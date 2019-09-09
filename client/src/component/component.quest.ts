
import RG from '../rg';
import {ChatQuest} from '../chat';
import {ComponentBase, Component} from './component.base';

const UniqueDataComponent = Component.UniqueDataComponent;
const DataComponent = Component.DataComponent;
const TransientDataComponent = Component.TransientDataComponent;
const BaseProto = ComponentBase.prototype;
//--------------------------------------------
// QUEST COMPONENTS
//--------------------------------------------

const NO_QUEST_REWARD = -1;
const NO_SUB_QUEST = -1;

/* QuestGiver is added to actors who can give quests. Only one comp
 * supported per actor. */
export const QuestGiver = UniqueDataComponent('QuestGiver', {
    hasGivenQuest: false, descr: '',
    questID: -1, danger: 1, reward: NO_QUEST_REWARD,
    hasGivenReward: false,
    questTargets: null
});

QuestGiver.prototype._init = function(descr: string) {
    this.chatObj = new ChatQuest();
    this.descr = descr;
    this.questID = this.getID();
    this.questTargets = [];

    const _addCb = () => {
      this.chatObj.setQuestGiver(this.getEntity());
    };
    this.addCallback('onAdd', _addCb);
};

QuestGiver.prototype.hasReward = function() {
    return this.reward && (this.reward !== NO_QUEST_REWARD);
};

QuestGiver.prototype.giveQuest = function(target) {
    if (target) {
        this.questGivenTo = target;
        this.hasGivenQuest = true;
    }
    else {
        this.hasGivenQuest = false;
    }
};

QuestGiver.prototype.addTarget = function(targetType, target) {
    if (!target) {
        RG.err('QuestGiver', 'addTarget',
            `No target given. Type ${targetType}`);
    }
    const name = RG.getName(target);
    if (!RG.isEmpty(name)) {
        const targetData = {
            id: target.getID(), name, targetType,
            subQuestID: -1
        };
        const qTarget = target.get('QuestTarget');
        if (qTarget.getSubQuestID() !== NO_SUB_QUEST) {
            targetData.subQuestID = qTarget.getSubQuestID();
        }
        this.questTargets.push(targetData);
    }
    else {
        RG.err('QuestGiver', 'addTarget',
            `Empty name got for target ${JSON.stringify(target)}`);
    }
};

QuestGiver.prototype.toJSON = function() {
    const json = BaseProto.toJSON.call(this);
    // json.setQuestData = this.questData.toJSON();
    if (this.questGivenTo) {
        json.giveQuest = RG.getObjRef('entity', this.questGivenTo);
    }
    return json;
};

QuestGiver.prototype.getChatObj = function() {
    return this.chatObj;
};

/* QuestTarget Comp is added to quest targets (items, actors etc). */
export const QuestTarget = DataComponent('QuestTarget', {
    targetType: '', target: null, isCompleted: false,
    targetID: -1, questID: -1, subQuestID: NO_SUB_QUEST
});

QuestTarget.prototype.isKill = function() {
    return this.targetType === 'kill';
};

QuestTarget.prototype.toString = function() {
    let name = '';
    if (this.target.getName) {
        name = this.target.getName();
    }
    else if (this.target.getParent) {
        const parent = this.target.getParent();
        if (parent) {
            name = parent.getName();
        }
        if (parent.getParent) {
            const topParent = parent.getParent();
            name += ' of ' + topParent.getName();
        }
    }
    return `${this.targetType} ${name}`;
};

QuestTarget.prototype.toJSON = function() {
    const json = BaseProto.toJSON.call(this);
    json.setTargetType = this.targetType;
    if (this.target.$objID) {
        json.setTarget = RG.getObjRef('object', this.target);
    }
    else {
        json.setTarget = RG.getObjRef('entity', this.target);
    }
    return json;
};

export const QuestEscortTarget = DataComponent('QuestEscortTarget', {
    escortTo: -1, question: 'Can I help you safely somewhere?'
});

QuestEscortTarget.prototype.toJSON = function() {
    const json = BaseProto.toJSON.call(this);
    json.setEscortTo = RG.getObjRef('entity', this.escortTo);
    return json;
};

/* Quest component contains all info related to a single quest. */
export const Quest = DataComponent('Quest', {
    giver: null, questTargets: null, questID: -1, descr: ''
});

Quest.prototype._init = function() {
    this.questTargets = [];
};

Quest.prototype.addTarget = function(targetData) {
    this.questTargets.push(targetData);
};

Quest.prototype.isInThisQuest = function(targetComp) {
    return this.getQuestID() === targetComp.getQuestID();
};

Quest.prototype.getTargetsByType = function(targetType) {
    return this.questTargets.filter(obj => (
        obj.targetType === targetType
    ));
};

/* Returns first quest target matching the given targetType. */
Quest.prototype.first = function(targetType) {
    const targetObj = this.questTargets.find(obj => (
        obj.targetType === targetType
    ));
    if (targetObj) {return targetObj;}
    return null;
};

/* Returns true if all QuestTarget comps have been completed. */
Quest.prototype.isCompleted = function() {
    return this.questTargets.reduce((acc, obj) => acc && obj.isCompleted,
        true);
};

Quest.prototype.isTargetInQuest = function(targetComp) {
    const target = targetComp.getTarget();
    for (let i = 0; i < this.questTargets.length; i++) {
        const curr = this.questTargets[i];
        if (curr.id === target.getID()) {
            return true;
        }
    }
    return false;
};

Quest.prototype.toString = function(): string {
    let res = '';
    this.questTargets.forEach((obj, i) => {
        if (i > 0) {res += '. ';}
        if (obj.targetType === 'subquest') {
            res += 'Talk to ' + obj.name;
        }
        else {
            res += getQuestVerb(obj.targetType) + ' ' + obj.name;
            // res += obj.targetType + ' ' + obj.name;
        }
    });
    return res;
};

export const QuestInfo = DataComponent('QuestInfo', {
    question: '', info: '',
    givenBy: -1 // ID of the info source
});

export const QuestReport = DataComponent('QuestReport', {
    expectInfoFrom: -2
});

export const QuestCompleted = TransientDataComponent('QuestCompleted',
    {giver: null}
);

export const GiveQuest = TransientDataComponent('GiveQuest',
    {target: null, giver: null}
);

export const QuestTargetEvent = TransientDataComponent('QuestTargetEvent',
    {targetComp: null, args: null, eventType: ''}
);

QuestTargetEvent.prototype.setTargetComp = function(target) {
    RG.assertType(target, 'QuestTarget');
    this.targetComp = target;
};

export function getQuestVerb(targetType: string): string {
    const type = targetType.toLowerCase();
    switch (type) {
        case 'location': return 'Find location';
        case 'reportlisten': return 'Talk to';
        case 'report': return 'Report info to';
        case 'give': return 'Give item to';
        case 'explore': return 'Explore';
        case 'get': return 'Find item';
        case 'listen': return 'Get info from';
        default: {
            console.log('getQuestVerb ret default for', targetType);
            return type.toUpperCase();
        }
    }
}
