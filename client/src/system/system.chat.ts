
import RG from '../rg';
import {SystemBase} from './system.base';
import {Chat, ChatBase} from '../chat';
import {SystemQuest} from './system.quest';
import {TCoord, ILoreTopics, ILoreOpt} from '../interfaces';
import {BaseActor} from '../actor';

const NO_ACTORS_FOUND = Object.freeze([]);

/* This system handles all entity movement.*/
export class SystemChat extends SystemBase {
    constructor(compTypes, pool?) {
        super(RG.SYS.CHAT, compTypes, pool);
    }

    public updateEntity(ent): void {
        const args = ent.get('Chat').getArgs();
        const dir = args.dir;

        const actors = this.getActorsInDirection(ent, dir);
        let chatObj = null;
        actors.forEach(actor => {
            if (actor.has('Trainer')) {
                chatObj = this.getChatObject(ent, actor, 'Trainer');
            }
            else if (actor.has('QuestGiver')) {
                chatObj = this.getChatObject(ent, actor, 'QuestGiver');
            }
            else {
                // TODO spirits react differently
                chatObj = this.getGenericChatObject(ent, actor);
                const msg = `You chat with ${actor.getName()} for a while.`;
                RG.gameMsg({cell: ent.getCell(), msg});
            }
            if (actor.has('QuestTarget')) {
                this.addQuestTargetItems(ent, actor, chatObj);
            }
            this.addQuestSpecificItems(ent, actor, chatObj);

            if (ent.getLevel().has('Lore')) {
                this.addLoreItems(ent, actor, chatObj);
            }
        });

        if (chatObj) {
            const entBrain = ent.getBrain();
            const selObj = chatObj.getSelectionObject();
            entBrain.setSelectionObject(selObj);
        }

        ent.remove('Chat');
    }

    /* Returns all actors in the given direction. */
    public getActorsInDirection(ent, dir: TCoord): BaseActor[] {
        const [dX, dY] = [dir[0], dir[1]];
        const x = ent.getX() + dX;
        const y = ent.getY() + dY;
        const map = ent.getLevel().getMap();

        if (map.hasXY(x, y)) {
            const cell = map.getCell(x, y);
            if (cell.hasActors()) {
                return cell.getActors();
            }
            else {
                const msg = 'There is no one to talk to.';
                RG.gameMsg({cell, msg});
            }
        }
        else {
            const msg = 'There is no one to talk to.';
            RG.gameMsg({cell: ent.getCell(), msg});
        }
        return NO_ACTORS_FOUND as BaseActor[];
    }

    public getChatObject(ent, srcActor, compType): ChatBase {
        const chatObj = srcActor.get(compType).getChatObj();
        chatObj.setTarget(ent);
        const selObj = chatObj.getSelectionObject();
        if (selObj) {
            return chatObj;
        }
        else {
            const srcName = srcActor.getName();
            RG.err('SystemChat', 'setChatObject',
                `Null/undef selectObj with type ${compType}, src: ${srcName}`);
        }
        return null;
    }

    public getGenericChatObject(ent, actor): ChatBase {
        // if (ent.has('Quest')) {
            const chatObj = new Chat.ChatBase();
            const aName = actor.getName();
            chatObj.pre = `${aName} greets you. What do you say?`;
            return chatObj;
        // }
        // return null;
    }


    /* Adds additional chat items related to various quest objectives. */
    public addQuestTargetItems(ent, actor, chatObj: ChatBase): void {
        const qTarget = actor.get('QuestTarget');
        const tType = qTarget.getTargetType();
        if (tType === 'escort') {
            const qEscort = actor.get('QuestEscortTarget');
            const escortTo = qEscort.getEscortTo();
            if (escortTo.getID() !== ent.getLevel().getID()) {
                chatObj.add({
                    name: qEscort.getQuestion(),
                    option: () => {
                        // TODO Add Escorted by event stuff to help player
                        // getting the actor to cooperate
                    }
                });
            }
            else {
                chatObj.add({
                    name: 'I have escorted you safely to correct place now',
                    option: () => {
                        const args = {src: actor};
                        SystemQuest.addQuestEvent(ent, qTarget, 'escort', args);
                    }
                });
            }
        }
    }

    public addQuestSpecificItems(ent, actor, chatObj: ChatBase): void {
        if (ent.has('Quest')) {
            const qTargets = ent.get('Quest').getQuestTargets();

            // Adds generic options to ask about a quest
            qTargets.forEach(target => {
                this.addQuestTargetToChat(target, actor, chatObj);
            });

            // If target of chat has any info, add an option to ask about it
            if (actor.has('QuestInfo')) {
                const questInfo = actor.get('QuestInfo');
                const qTarget = actor.get('QuestTarget');
                chatObj.add({
                    name: questInfo.getQuestion(),
                    option: () => {
                        // TODO possibly add some condition to get the info
                        // ent.add(questInfo.clone());
                        const args = {info: questInfo, src: actor};
                        SystemQuest.addQuestEvent(ent, qTarget, 'listen', args);
                    }
                });
            }

            // Add additional options if the chat initiator has some quest info
            if (ent.has('QuestInfo') && actor.has('QuestTarget')) {
                const qTarget = actor.get('QuestTarget');
                const qInfoList = ent.getList('QuestInfo');
                const createQuestEvent = questInfo => {
                    SystemQuest.addQuestEvent(ent, qTarget, 'report', {info: questInfo});
                };

                qInfoList.forEach(questInfo => {
                    chatObj.add({
                        name: 'Tell about ' + questInfo.getInfo(),
                        option: createQuestEvent.bind(null, questInfo)
                    });
                });
            }

            // If target is expecting a report about the quest, create another info
            if (actor.has('QuestReport')) {
                chatObj.add({
                    name: 'Tell about quest being completed',
                    option: () => {
                        SystemQuest.addQuestEvent(ent, actor.get('QuestTarget'), 'report');
                    }
                });
            }

        }
    }


    /* Checks if initiator of chat is on quest and needs to query for any
     * information. */
    public addQuestTargetToChat(target, actor, chatObj: ChatBase): void {
        const aName = actor.getName();
        const tName = target.name;
        let resp = null;

        const id = target.id;
        const memory = actor.getBrain().getMemory();

        if (memory.hasSeen(id)) {
            resp = chatObj.getSelectionObject();
            const {x, y} = memory.getLastSeen(id);
            const dir = RG.getTextualDir([x, y], actor);
            let msg = `${aName} says: I know where ${tName} is.`;
            msg += ` I saw ${tName} ${dir} from here.`;
            RG.gameInfo(msg);
        }

        if (tName !== '') {
            if (!resp) {
                resp = () => {
                    const msg = `${aName} says: I know not where ${tName} is`;
                    RG.gameInfo(msg);
                };
            }
            chatObj.add({
                name: `Do you know where is ${tName}`,
                option: resp
            });
        }
    }

    /* Add lore-specific items to the chat object. */
    public addLoreItems(ent, actor: BaseActor, chatObj: ChatBase): void {
        const lore = actor.getLevel().get('Lore');
        const topics: ILoreTopics = lore.getLoreTopics();
        Object.keys(topics).forEach(name => {
            chatObj.add({
                name: getTopicQuestion(name),
                option: () => {
                    const chosenOpt = this.rng.arrayGetRand(topics[name]);
                    const opt = getFormattedReply(actor, name, chosenOpt);
                    RG.gameInfo({cell: ent.getCell(), msg: opt});
                }
            });
        });
    }

}

function getTopicQuestion(topicName: string): string {
    const questions = {
        quests: 'Is anyone looking for help here?',
        places: 'Do you know what places are nearby?',
        shops:  'Is there a place for trading?',
        people: 'What can you tell me about people here?',
        world: 'Do you have any rumors from faraway lands?'
    };
    return questions[topicName];
}

function getFormattedReply(actor: BaseActor, name: string, chosenOpt: ILoreOpt): string {
    if (typeof chosenOpt === 'string') {
        return chosenOpt;
    }
    let textualDir = '';
    if (chosenOpt.xy) {
        textualDir = RG.getTextualDir(chosenOpt.xy, actor);
    }

    let msg = '';
    switch (name) {
        case 'shops': {
            msg = `${chosenOpt.name} should have a shop ${textualDir} from here.`;
            break;
        }
    }
    return msg;
}
