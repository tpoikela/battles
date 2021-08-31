
import RG from '../rg';
import {ObjectShell, Parser} from '../objectshellparser';
import {SystemBase} from './system.base';
import {EventPool} from '../eventpool';
import * as Component from '../component';
import {emitZoneEvent} from './system.utils';
import {IShell} from '../interfaces';

const parser: Parser = ObjectShell.getParser();

type Entity = import('../entity').Entity;
type HandleFunc = (ent, qEvent, questComp) => void;
type ItemBase = import('../item').ItemBase;
type Equipment = import('../equipment').Equipment;

export class SystemQuest extends SystemBase {

    /* Helper function to add QuestTargetEvent for entity. */
    public static addQuestEvent(ent, qTarget, eventType, args = {}) {
        const qEvent = new Component.QuestTargetEvent();
        qEvent.setArgs(args);
        qEvent.setEventType(eventType);
        qEvent.setTargetComp(qTarget);
        ent.add(qEvent);
    }

    private _eventTable: {[key: string]: HandleFunc};

    constructor(compTypes: string[], pool: EventPool) {
        super(RG.SYS.QUEST, compTypes, pool);
        this.compTypesAny = true; // Triggered on at least one component

        this._eventTable = {
            battle: this.onBattleEvent = this.onBattleEvent.bind(this),
            damage: this.onDamageEvent = this.onDamageEvent.bind(this),
            escort: this.onEscortEvent = this.onEscortEvent.bind(this),
            get: this.onGetEvent = this.onGetEvent.bind(this),
            give: this.onGiveEvent = this.onGiveEvent.bind(this),
            goto: this.onGotoEvent = this.onGotoEvent.bind(this),
            kill: this.onKillEvent = this.onKillEvent.bind(this),
            listen: this.onListenEvent = this.onListenEvent.bind(this),
            read: this.onReadEvent = this.onReadEvent.bind(this),
            report: this.onReportEvent = this.onReportEvent.bind(this)
        };
    }

    public updateEntity(ent: Entity): void {
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
    }

    /* When a quest is given to an actor, this function processes it. */
    public processGiveQuestComp(ent, comp): void {
        const giver = comp.getGiver();
        const giverComp = giver.get('QuestGiver');
        if (giverComp.getHasGivenQuest()) {
            return;
        }
        const questTargets = giverComp.getQuestTargets();
        const questComp = new Component.Quest();
        questComp.setQuestID(giverComp.getQuestID());

        if (questTargets.length === 0) {
            RG.err('SystemQuest', 'processGiveQuestComp',
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
    }

    /* Checks if any messages should be shown to player after a quest is
     * accepted. */
    public checkQuestMsgEmits(ent, questComp) {
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
        questMsg({cell: ent.getCell(), msg});
    }

    /* Processes QuestCompleted event and grants quest rewards. */
    public processComplComp(ent, comp) {
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
            const expComp = new Component.ExpPoints(expPoints);
            ent.add(expComp);

            // Give reward, items + any other info
            this.giveQuestReward(ent, giver, giverComp);
            emitZoneEvent(giver.getLevel(), RG.ZONE_EVT.QUEST_COMPLETED,
                {questGiver: giver});
        }
        else {
            RG.gameDanger({cell: ent.getCell(), msg: 'Quest is not completed!'});
        }

    }

    public giveQuestReward(ent, giver, comp): void {
        if (comp.hasReward()) {
            if (!comp.getHasGivenReward()) {
                comp.setHasGivenReward(true);
                const reward = comp.getReward();
                // Right now, only items are supported, later add support for
                // info etc
                let rewardItem: null | ItemBase = null;
                if (reward.type === 'item') {
                    const rewardName = reward.name;

                    rewardItem = parser.createItem(rewardName);
                    if (rewardItem) {
                        let msg = `${ent.getName()} receives ${rewardItem.getName()} as`;
                        msg += ' a reward for completing the quest';
                        questMsg({cell: ent.getCell(), msg});
                    }
                }
                else if (reward.type === 'generate') {
                    rewardItem = this.generateQuestRewardItem(ent, comp, giver);
                }

                // If item was created, give it to entity
                if (rewardItem) {
                    ent.getInvEq().getInventory().addItem(rewardItem);
                }
            }
            else {
                const msg = 'Reward has already been given!';
                questMsg({cell: ent.getCell(), msg});
            }
        }
    }

    public generateQuestRewardItem(ent, comp, giver): null | ItemBase {
        const eq: Equipment = ent.getInvEq().getEquipment();
        const freeSlotTypes: string[] = eq.getFreeSlotTypes();
        const [minVal, maxVal] = questMinMaxValue(comp.numTargets());
        const valueOk = (shell: IShell) => shell.value >= minVal && shell.value <= maxVal;

        if (freeSlotTypes.length > 0) {
            const randType = this.rng.arrayGetRand(freeSlotTypes);
            let func = (shell: IShell) => (
                shell.armourType === randType && valueOk(shell)
            );
            let item = parser.createRandomItem({func});
            if (item) {
                return item;
            }

            // Maybe randType is missile/spiritgem/hand
            if (randType === 'hand') {
                func = (shell: IShell) => valueOk(shell) && shell.type === 'weapon';
            }
            else if (randType === 'spiritgem') {
                func = (shell: IShell) => (
                    valueOk(shell) && shell.type === 'spiritgem'
                );
            }
            else if (randType === 'missile') {
                func = (shell: IShell) => (
                    valueOk(shell) &&
                    (shell.type === 'missile' || shell.type === 'ammo')
                );
            }
            else if (randType === 'missileweapon') {
                func = (shell: IShell) => (
                    valueOk(shell) && shell.type === 'missileweapon'
                );
            }

            item = parser.createRandomItem({func});
            if (item) {
                return item;
            }
        }
        else {
            // NO free slots, generate something else
            const func = (shell: IShell) => (
                valueOk(shell) && (shell.type === 'rune' ||
                                            shell.type === 'potion')
            );
            const item = parser.createRandomItem({func});
            if (item) {return item;}
        }
        return null;
    }

    public processQuestEvent(ent, qEvent) {
        const targetType = qEvent.getEventType();
        const quests = ent.getList('Quest');

        // Need to check each Quest on actor to find which one matches
        // the current event
        if (typeof this._eventTable[targetType] === 'function') {
            quests.forEach(questComp => {
                if (isEventValidForThisQuest(qEvent, questComp)) {
                    this._eventTable[targetType](ent, qEvent, questComp);
                }
            });
        }
        else {
            const keys = Object.keys(this._eventTable);
            RG.err('SystemQuest', 'processQuestEvent',
                `No function for ${targetType} in eventTable. Found: ${keys}`);
        }
    }

    /* Checks a battle quest event after battle is over. */
    public onBattleEvent(ent, qEvent, questComp) {
        const args = qEvent.getArgs();
        const qTarget = qEvent.getTargetComp();
        const level = qTarget.getTarget();
        const targetType = qTarget.getTargetType();
        const targetObj = getMatchObj(questComp, level);

        if (targetType === 'winbattle') {
            if (args.isWon) {
                this.setTargetCompleted(targetObj, questComp);
                let msg = `${ent.getName()} has won a battle as `;
                msg += 'as a quest objective!';
                questMsg({cell: ent.getCell(), msg});
            }
        }
        else if (targetType === 'finishbattle') {
            // Don't care if battle was won or lost
            this.setTargetCompleted(targetObj, questComp);
            let msg = `${ent.getName()} has finished a battle as `;
            msg += 'as a quest objective!';
            questMsg({cell: ent.getCell(), msg});
        }
    }

    public onDamageEvent(ent, qEvent, questComp): void {
        const qTarget = qEvent.getTargetComp();
        const targetEnt = qTarget.getTarget();
        const questTargets = questComp.getQuestTargets();
        const targetObj = questTargets.find(obj => obj.id === targetEnt.getID());
        this.setTargetCompleted(targetObj, questComp);
        let msg = `${ent.getName()} has finished a quest objective `;
        msg += `to damage ${targetEnt.getDamage()}`;
        questMsg({cell: ent.getCell(), msg});
    }

    /* Processes event when an actor has been escorted back safely. */
    public onEscortEvent(ent, qEvent, questComp): void {
        const qTarget = qEvent.getTargetComp();
        const actor = qTarget.getTarget();
        const questTargets = questComp.getQuestTargets();
        const targetObj = questTargets.find(obj => obj.id === actor.getID());

        // TODO add checks that level IDs match, right now done in System.Chat
        this.setTargetCompleted(targetObj, questComp);

        let placeName = '';
        const pZone = ent.getLevel().getParentZone();
        if (pZone) {
            placeName = ' to ' + pZone.getName();
        }

        let msg = `${ent.getName()} has escorted ${actor.getName()} `;
        msg += `safely back${placeName} as a quest objective!`;
        questMsg({cell: ent.getCell(), msg});
    }

    public onGetEvent(ent, qEvent, questComp) {
        const qTarget = qEvent.getTargetComp();
        const item = qTarget.getTarget();
        const questTargets = questComp.getQuestTargets();
        const targetObj = questTargets.find(obj => obj.id === item.getID());
        this.setTargetCompleted(targetObj, questComp);

        let msg = `${ent.getName()} has found ${item.getName()} `;
        msg += 'as a quest objective!';
        questMsg({cell: ent.getCell(), msg});
    }

    public onGiveEvent(ent, qEvent, questComp) {
        const args = qEvent.getArgs();
        const {actor, item} = args;
        const questTargets = questComp.getQuestTargets();
        const targetObj = questTargets.find(obj => obj.id === actor.getID());

        this.setTargetCompleted(targetObj, questComp);
        let msg = `${ent.getName()} has given ${item.getName()} `;
        msg += `to ${actor.getName()} as quest objective!`;
        questMsg({cell: ent.getCell(), msg});
    }

    public onGotoEvent(ent, qEvent, questComp) {
        const targetComp = qEvent.getTargetComp();
        const level = targetComp.getTarget();
        const questTargets = questComp.getQuestTargets();
        const targetObj = questTargets.find(obj => obj.id === level.getID());
        if (!targetObj.isCompleted) {
            this.setTargetCompleted(targetObj, questComp);
            const msg = `${ent.getName()} has arrived to a quest target location!`;
            questMsg({cell: ent.getCell(), msg});
        }
    }

    /* Called when quest event where an actor is killed happens. */
    public onKillEvent(ent, qEvent, questComp) {
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
            questMsg({cell: ent.getCell(), msg});
        }
        else {
            RG.err('SystemQuest', 'onKillEvent',
                `Args must contain |corpse|. Got: ${JSON.stringify(args)}`);
        }
    }

    public onListenEvent(ent, qEvent, questComp) {
        const args = qEvent.getArgs();
        if (args && args.info) {
            const info = args.info.getInfo();
            const actor = args.src;
            ent.add(args.info.clone());

            const listenID = actor.getID();
            const questTargets = questComp.getQuestTargets();
            const targetObj = questTargets.find(obj => obj.id === listenID);
            this.setTargetCompleted(targetObj, questComp);

            const msg = `${actor.getName()} tells about ${info}`;
            questMsg({msg, cell: ent.getCell()});
        }
        else {
            RG.err('SystemQuest', 'onListenEvent',
                `Args must contain |info|. Got: ${JSON.stringify(args)}`);
        }
    }

    public onReadEvent(ent, qEvent, questComp) {
        const targetComp = qEvent.getTargetComp();
        const readEntity = targetComp.getTarget();
        const questTargets = questComp.getQuestTargets();
        const targetObj = questTargets.find(obj => (
            obj.id === readEntity.getID()));
        this.setTargetCompleted(targetObj, questComp);

        const placeData = readEntity.getMetaData('place');
        if (placeData) {
            const placeObj = placeData[0];
            if (placeObj.levelID === ent.getLevel().getID()) {
                // Mark target as completed
                const targetLoc = questTargets.find(obj => (
                    obj.id === placeObj.levelID && !obj.isCompleted
                ));
                this.setTargetCompleted(targetLoc, questComp);
            }
            else {
                let msg = `${ent.getName()} learns to travel to `;
                msg += `${placeObj.placeName} as part of the quest.`;
                questMsg({cell: ent.getCell(), msg});
            }
        }
    }

    public onReportEvent(ent, qEvent, questComp) {
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
                    questMsg({cell: ent.getCell(), msg});
                }
            } // Handle other reporting like kill/spy/goto etc
            else if (questComp.isTargetInQuest(targetComp)) {
                // const questTargets = questComp.getQuestTargets();
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
            questMsg({cell: ent.getCell(), msg});
            this.setTargetCompleted(targetReportObj, questComp);
        }
    }

    /* Moves QuestTarget from one entity to another. */
    public moveQuestTargetComp(srcEnt, destEnt) {
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
    }

    public setTargetCompleted(targetObj, questComp) {
        const ent = questComp.getEntity();
        if (targetObj.isCompleted === false) {
            targetObj.isCompleted = true;
        }
        else {
            let json = 'targetObj: ' + JSON.stringify(targetObj);
            json += 'targetQuest: ' + JSON.stringify(questComp);
            RG.err('SystemQuest', 'setTargetCompleted',
                'Tried to set completed quest to completed again: ' + json);
        }

        if (questComp.isCompleted()) {
            let msg = `${ent.getName()} has completed a quest!`;
            msg += ' now it is time to go collect the reward.';
            questMsg({cell: ent.getCell(), msg});
            this.checkSubQuestCompletion(ent, questComp);
        }
    }

    /* WHen a quest becomes completed, check if any other quest has that one
     * as a subquest, then mark the subquest item completed. */
    public checkSubQuestCompletion(ent, questComp) {
        const questID = questComp.getQuestID();
        const questList = ent.getList('Quest');
        questList.forEach(quest => {
            const subQuests = quest.getTargetsByType('subquest');
            subQuests.forEach(sqObj => {
                if (sqObj.subQuestID === questID) {
                    sqObj.isCompleted = true;
                }
            });
        });
    }

}

function getMatchObj(questComp, targetObj) {
    const questTargets = questComp.getQuestTargets();
    const foundObj = questTargets.find(obj => obj.id === targetObj.getID());
    return foundObj;
}

function isEventValidForThisQuest(qEvent, questComp) {
    const qTarget = qEvent.getTargetComp();
    return questComp.isInThisQuest(qTarget);
}

function questMsg(obj) {
    RG.gameInfo(obj);
}

function questMinMaxValue(len: number): [number, number] {
    switch (len) {
        case 1: return [75, 150];
        case 2: return [90, 190];
        case 3: return [100, 220];
        case 4: return [120, 250];
        default: return [
            120 + 30 * (len - 4),
            250 + 30 * (len - 4),
        ];
    }
}
