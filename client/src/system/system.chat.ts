
import RG from '../rg';
import {SystemBase} from './system.base';
import {Chat, ChatBase} from '../chat';
import {SystemQuest} from './system.quest';
import {TCoord, ILoreTopics, ILoreOpt} from '../interfaces';
import {BaseActor} from '../actor';
import {Lore, format} from '../../data/lore';
import {Constraints} from '../constraints';

type Entity = import('../entity').Entity;
type Memory = import('../brain').Memory;

const NO_ACTORS_FOUND: BaseActor[] = [];

/* This system handles all entity movement.*/
export class SystemChat extends SystemBase {
    protected loreData: {[key: string]: any};
    protected factFuncs: {[key: string]: () => any};
    protected registeredObjs: {[key: string]: boolean};

    constructor(compTypes: string[], pool?) {
        super(RG.SYS.CHAT, compTypes, pool);
        this.factFuncs = {};
        this.registeredObjs = {
            Trainer: true, QuestGiver: true
        };
        this.loreData = {};
    }

    /* More lore can be added for chatting. */
    public addLore(key: string, loreData: any): void {
        this.loreData[key] = loreData;
    }

    public updateEntity(ent: Entity): void {
        const args = ent.get('Chat').getArgs();
        const dir = args.dir;
        const chatter: BaseActor = RG.toActor(ent);

        const actors = this.getActorsInDirection(chatter, dir);
        let chatObj: null | ChatBase = null;
        actors.forEach(actor => {
            if (actor.isEnemy(chatter)) {
                const msg = this.getHostileMsg(chatter, actor);
                RG.gameMsg({cell: actor.getCell()!, msg});
            }
            // First, we need to create the Chat object for the Menu
            Object.keys(this.registeredObjs).forEach((chatType: string) => {
                if (actor.has(chatType)) {
                    if (chatObj) {
                        // Need to assign return value, new TOP_MENU can be returned
                        chatObj = this.appendToChatObj(chatObj, chatter, actor, chatType);
                    }
                    else {
                        chatObj = this.getChatObject(chatter, actor, chatType);
                    }
                }
            });

            if (!chatObj) {
                // TODO spirits react differently
                chatObj = this.getGenericChatObject(ent, actor);
                const msg = `You chat with ${actor.getName()} for a while.`;
                RG.gameMsg({cell: chatter.getCell()!, msg});
            }

            // Then, we add relevant chat options for that object
            if (actor.has('QuestTarget')) {
                this.addQuestTargetItems(chatter, actor, chatObj);
            }
            this.addQuestSpecificItems(chatter, actor, chatObj);

            if (chatter.getLevel().has('Lore')) {
                this.addLevelLoreItems(chatter, actor, chatObj);
            }

            if (chatter.getLevel().getParentZone()) {
                this.addGenericLoreItems(chatter, actor, chatObj);
                this.addZoneLoreItems(ent, actor, chatObj);
            }
        });

        if (chatObj) {
            const entBrain = chatter.getBrain();
            const selObj = chatObj!.getSelectionObject();
            (entBrain as any).setSelectionObject(selObj);
        }

        ent.remove('Chat');
    }

    /* Returns all actors in the given direction. */
    public getActorsInDirection(ent: BaseActor, dir: TCoord): BaseActor[] {
        const [dX, dY] = [dir[0], dir[1]];
        const x = ent.getX() + dX;
        const y = ent.getY() + dY;
        const map = ent.getLevel().getMap();

        if (map.hasXY(x, y)) {
            const cell = map.getCell(x, y);
            if (cell.hasActors()) {
                return cell.getActors()!; // Exists due to hasActors()
            }
            else {
                const msg = 'There is no one to talk to.';
                RG.gameMsg({cell, msg});
            }
        }
        else {
            const msg = 'There is no one to talk to.';
            RG.gameMsg({cell: ent.getCell()!, msg});
        }
        return NO_ACTORS_FOUND.slice();
    }

    /* Chat object has two options. Either it's a persistent with the actor, or
     * new object can be created with factory function.
     */
    public registerChatObject(compType: string, factFunc?: () => any): void {
        if (typeof factFunc === 'function') {
            this.factFuncs[compType] = factFunc;
        }
        this.registeredObjs[compType] = true;
    }

    public appendToChatObj(
        chatObj: ChatBase, ent: BaseActor, srcActor: BaseActor, compType: string
    ): ChatBase {
        let topObj = chatObj;
        if (chatObj.getName() !== Chat.TOP_MENU) {
            topObj = new ChatBase();
            topObj.setName(Chat.TOP_MENU);
            topObj.add({name: 'Do you offer any special services?',
                        option: chatObj
            });
        }
        const newChatObj = this.getChatObject(ent, srcActor, compType);
        if (newChatObj) {
            const chatQuestion = this.getChatQuestion(compType);
            topObj.add({name: chatQuestion,
                        option: newChatObj
            });
        }
        else {
            RG.err('System.Chat', 'appendToChatObj',
                 'Failed to add new chat object with compType ' + compType);
        }
        return topObj;
    }

    public getChatObject(
        ent: BaseActor, srcActor: BaseActor, compType: string
    ): null | ChatBase {
        if (this.factFuncs.hasOwnProperty(compType)) {
            return this.factFuncs[compType]();
        }
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

    public getGenericChatObject(ent, actor: BaseActor): ChatBase {
        const chatObj = new Chat.ChatBase();
        const aName = actor.getName();
        chatObj.pre = `${aName} greets you. What do you say?`;
        return chatObj;
    }

    /* Adds additional chat items related to various quest objectives. This lets
    * player to inquire about their current quest targets. */
    public addQuestTargetItems(
        ent: BaseActor, actor: BaseActor, chatObj: ChatBase
    ): void {
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

    public addQuestSpecificItems(
        ent: BaseActor, actor: BaseActor, chatObj: ChatBase
    ): void {
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
        const memory: Memory = actor.getBrain().getMemory();

        if (memory.hasSeen(id)) {
            resp = chatObj.getSelectionObject();
            const {x, y} = memory.getLastSeen(id);
            const dir = RG.getTextualDir([x, y], actor);
            let msg = `${aName} says: I know where ${tName} is.`;
            msg += ` I saw ${tName} ${dir} from here.`;
            RG.gameInfo(msg);
        }
        else {
            // Check if zone Lore has any info about this one
            const zone = actor.getLevel().getParentZone();
            if (zone.has('Lore')) {
                const loreList = zone.getList('Lore');
                loreList.forEach(loreComp => {
                    const topics = loreComp.getTopics();
                    if (topics.sideQuest) {
                        const metaData = loreComp.getMetaData();
                        const {name} = metaData;
                        if (name === tName) {
                            resp = () => {
                                const dirMsg = this.rng.arrayGetRand(topics.sideQuest);
                                const msg = `${aName} says: ${dirMsg}`;
                                RG.gameInfo(msg);
                            };
                        }
                    }
                });
            }
        }

        if (tName !== '') {
            if (!resp) {
                resp = () => {
                    const msg = `${aName} says: I don't know where ${tName} is`;
                    RG.gameInfo(msg);
                };
            }
            chatObj.add({
                name: `Do you know where is ${tName}`,
                option: resp
            });
        }
    }

    /* Add lore-specific items belonging to Level to the chat object. */
    public addLevelLoreItems(
        ent: BaseActor, actor: BaseActor, chatObj: ChatBase
    ): void {
        const loreComps = actor.getLevel().getList('Lore');
        loreComps.forEach(lore => {
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
        });
    }

    public addGenericLoreItems(
        ent: BaseActor, actor: BaseActor, chatObj: ChatBase
    ): void {
        const maxTries = 3;
        let tries = 0;
        const topic = this.rng.arrayGetRand(Lore.genericTopics);
        const availableOpts: any[] = Lore[topic];

        let chosenText = '';
        while (tries < maxTries) {
            const chosenOpt = this.rng.arrayGetRand(availableOpts);
            if (this._meetsAllReq(chosenOpt, ent, actor)) {
                chosenText = this.rng.arrayGetRand(chosenOpt.text);
                break;
            }
            ++tries;
        }

        const level = ent.getLevel();
        console.log('chosenText is ' + chosenText);
        const msg = format(chosenText, {level, target: actor, asker: ent});
        chatObj.add({
            name: 'Have you heard anything interesting lately?',
            option: () => {
                RG.gameInfo({cell: ent.getCell(), msg});
            }
        });
    }

    public addZoneLoreItems(ent, actor: BaseActor, chatObj: ChatBase): void {
        const zone = actor.getLevel().getParentZone();
        if (zone.has('Lore')) {
            const loreComps = zone.getList('Lore');
            loreComps.forEach(loreComp => {
                if (loreComp.hasTopic('mainQuest')) {
                    const msg = this.rng.arrayGetRand(loreComp.getTopics().mainQuest);
                    if (typeof msg === 'string') {
                        chatObj.add({
                            name: 'Can you tell me anything about the North?',
                            option: () => {
                                RG.gameInfo({cell: ent.getCell(), msg});
                            }
                        });
                    }
                    else {
                        RG.err('SystemChat', 'addZoneLoreItems',
                        `Expected msg to be string. Got ${JSON.stringify(msg)}`);
                    }
                }

                if (loreComp.hasTopic('sideQuest')) {
                    const msg = this.rng.arrayGetRand(loreComp.getTopics().sideQuest);
                    if (typeof msg === 'string') {
                        chatObj.add({
                            name: 'What can you tell me about this area?',
                            option: () => {
                                RG.gameInfo({cell: ent.getCell(), msg});
                            }
                        });
                    }
                    else {
                        RG.err('SystemChat', 'addZoneLoreItems',
                        `Expected msg to be string. Got ${JSON.stringify(msg)}`);
                    }
                }
            });
        }
    }

    protected _meetsAllReq(chosenOpt, ent, actor): boolean {
        const fact = new Constraints();
        let allOk = true;
        if (chosenOpt.level) {
            const constrFunc = fact.getConstraints(chosenOpt.level);
            allOk = allOk && constrFunc(ent.getLevel());
        }
        if (chosenOpt.target) {
            const constrFunc = fact.getConstraints(chosenOpt.target);
            allOk = allOk && constrFunc(actor);
        }
        if (chosenOpt.asker) {
            const constrFunc = fact.getConstraints(chosenOpt.asker);
            allOk = allOk && constrFunc(ent);
        }
        return allOk;
    }

    protected getChatQuestion(compType: string): string {
        switch (compType) {
            case 'QuestGiver':
                return 'Can you give me some work to do?';
        }
        return 'Do you know anything about ' + compType + '?';
    }

    protected getHostileMsg(chatter: BaseActor, actor: BaseActor): string {
        const aName = actor.getName();
        const cType = chatter.getType();
        const memory: Memory = actor.getBrain().getMemory();
        if (memory.hasEnemyType(cType)) {
            return `${aName} shouts: 'Go away filthy ${cType}!'`;
        }
        return `${aName} is hostile and refuses to talk.`;
    }

}

//------------------
// HELPER FUNCTIONS
//------------------

function getTopicQuestion(topicName: string): string {
    const questions = {
        quests: 'Is anyone looking for help here?',
        places: 'Do you know what places are nearby?',
        shops:  'Is there a place for trading?',
        people: 'What can you tell me about people here?',
        world: 'Do you have any rumors from faraway lands?',
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
            if (actor.has('Shopkeeper')) {
                msg = `You are already in my shop. Welcome!`;
            }
            else {
                msg = `${chosenOpt.name} should have a shop ${textualDir} from here.`;
            }
            break;
        }
    }
    return msg;
}

