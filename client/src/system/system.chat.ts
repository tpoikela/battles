
import RG from '../rg';
import {SystemBase} from './system.base';
import {Chat, ChatBase} from '../chat';
import {SystemQuest} from './system.quest';
import {TCoord, ILoreOpt, ILoreEntry, TLoreMsg, IQuestTarget} from '../interfaces';
import {BaseActor} from '../actor';
import {Lore, formatMsg} from '../../data/lore';
import {Constraints} from '../constraints';
import {Random} from '../random';

import {ComponentLore} from '../component/component';

type Entity = import('../entity').Entity;
type Memory = import('../brain').Memory;

const NO_ACTORS_FOUND: BaseActor[] = [];

const QUERY_LOC_FROM_MEM = 'queryLocationFromMemory';

const ERROR_STR = '<ERROR: You should not see this. A bug found >';
const RNG = Random.getRNG();

/* This system handles all entity chat operations. */
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
        for (let i = 0; i < actors.length; i++) {
            const actor = actors[i];

            if (actor.isEnemy(chatter)) {
                const msg = this.getHostileMsg(chatter, actor);
                RG.gameMsg({cell: actor.getCell()!, msg});
                continue;
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

        }

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

    /* Used when actor has no specific chat object present. */
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
    public addQuestTargetToChat(target: IQuestTarget, actor, chatObj: ChatBase): void {
        const aName = actor.getName();
        const tName = target.name;
        let resp = null;
        let inMemory = false;
        [inMemory, resp] = this.actorHasInMemory(target, actor, chatObj);

        const askedQuestions: {[key: string]: boolean} = {};

        if (!inMemory) {
            // Check if zone Lore has any info about this one
            const zone = actor.getLevel().getParentZone();
            if (zone.has('Lore')) {
                const loreList: ComponentLore[] = zone.getList('Lore');
                loreList.forEach((loreComp: ComponentLore) => {
                    const entries: ILoreEntry[] = loreComp.getKey({topic: 'sideQuest'});
                    entries.forEach((entry: ILoreEntry) => {
                        const {names} = entry;
                        if (names && names.find((nn) => nn === tName)) {
                            resp = () => {
                                const chosenMsg = this.getRespMsgFromEntry(actor, entry);
                                const opt = this.getFormattedReply(actor, 'sideQuest',
                                    chosenMsg as any);
                                // const dirMsg = this.rng.arrayGetRand(topics.sideQuest);
                                const msg = `${aName} says: ${opt}`;
                                RG.gameInfo(msg);
                            };
                        }
                    });
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
            const question = `Do you know where is ${tName}?`;
            if (!askedQuestions[question]) {
                askedQuestions[question] = true;
                chatObj.add({
                    name: question,
                    option: resp
                });
            }
        }
    }


    /* Add lore-specific items belonging to Level to the chat object. */
    public addLevelLoreItems(
        ent: BaseActor, actor: BaseActor, chatObj: ChatBase
    ): void {
        const loreComps: ComponentLore[] = actor.getLevel().getList('Lore');
        loreComps.forEach((loreComp: ComponentLore) => {
            const topics: string[] = loreComp.getLoreTopics();
            topics.forEach((name: string) => {

                const usedQuestions: {[key: string]: boolean} = {};
                const entries: ILoreEntry[] = loreComp.getKey({topic: name});
                RNG.shuffle(entries);

                entries.forEach((entry: ILoreEntry) => {
                    const question = this.getTopicQuestion(actor, name, entry);
                    if (usedQuestions[question]) {
                        return;
                    }
                    usedQuestions[question] = true;
                    chatObj.add({
                        name: question,
                        option: () => {
                            const chosenMsg = this.getRespMsgFromEntry(actor, entry);
                            const opt = this.getFormattedReply(actor, name, chosenMsg as any);
                            // TODO if there are names/IDs, add these to create new
                            // lore h
                            this.checkEntryForRevealed(loreComp, entry);
                            RG.gameInfo({cell: ent.getCell()!, msg: opt});
                        }
                    });
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
        const msg = formatMsg(chosenText, {level, target: actor, asker: ent});
        chatObj.add({
            name: 'Have you heard anything interesting lately?',
            option: () => {
                RG.gameInfo({cell: ent.getCell(), msg});
            }
        });
    }

    public addZoneLoreItems(ent, actor: BaseActor, chatObj: ChatBase): void {
        // We've checked existence of zone already before call
        const zone = actor.getLevel().getParentZone()!;
        if (zone.has('Lore')) {
            const loreComps: ComponentLore[] = zone.getList('Lore');
            loreComps.forEach((loreComp: ComponentLore) => {
                if (loreComp.hasTopic('mainQuest')) {
                    const entries: any[] = loreComp.getKey({topic: 'mainQuest'});
                    const entry = this.rng.arrayGetRand(entries);
                    const msg = this.getRespMsgFromEntry(actor, entry);
                    const opt = this.getFormattedReply(actor, 'mainQuest', msg as any);

                    if (typeof opt === 'string') {
                        chatObj.add({
                            name: 'Can you tell me anything about the North?',
                            option: () => {
                                this.checkEntryForRevealed(loreComp, entry);
                                RG.gameInfo({cell: ent.getCell(), msg: opt});
                            }
                        });
                    }
                    else {
                        RG.err('SystemChat', 'addZoneLoreItems',
                            `Expected msg to be string. Got ${JSON.stringify(msg)}`);
                    }
                }

                if (loreComp.hasTopic('sideQuest')) {
                    const entries: any[] = loreComp.getKey({topic: 'sideQuest'});
                    const entry = this.rng.arrayGetRand(entries);
                    const msg = this.getRespMsgFromEntry(actor, entry);
                    const opt = this.getFormattedReply(actor, 'sideQuest', msg as any);

                    if (typeof opt === 'string') {
                        chatObj.add({
                            name: 'What can you tell me about this area?',
                            option: () => {
                                this.checkEntryForRevealed(loreComp, entry);
                                RG.gameInfo({cell: ent.getCell(), msg: opt});
                            }
                        });
                    }
                    else {
                        RG.err('SystemChat', 'addZoneLoreItems',
                        `Expected msg to be string. Got ${JSON.stringify(opt)}`);
                    }
                }
            });
        }
    }

    /* Does preformatting of message (when cmds are used), or selects string
     * randomly from an array. */
    protected getRespMsgFromEntry(actor, entry: ILoreEntry): TLoreMsg {
        let msg = entry.respMsg;
        if (!msg && (entry as any).msg) {
            RG.err('System.Chat', 'getRespMsgFromEntry',
               'entry.msg not supported. Use entry.respMsg from now on');
        }
        if (Array.isArray(msg)) {
            msg = this.rng.arrayGetRand(msg);
        }

        if (typeof msg === 'string') {
            return msg as string;
        }
        else if (entry.cmd) {
            // This switch implements differents "cmds" that are required in
            // querying response data such as x,y coords from actor memory
            switch (entry.cmd) {
                case QUERY_LOC_FROM_MEM: {
                    const name = entry.names![0];
                    const id = entry.ids[0];
                    const memory: Memory = actor.getBrain().getMemory();
                    if (memory.hasSeen(id)) {
                        const {x, y} = memory.getLastSeen(id)!; // hasSeen called
                        return {xy: [x, y], name};
                    }
                    else {
                        if (actor.getID() === id) {
                            return `I am ${name}. What do you need?`;
                        }
                        return `I haven't seen ${name} around here.`;
                    }
                }
                default: {
                    RG.err('System.Chat', 'getRespMsgFromEntry',
                        `No cmd ${entry.cmd} supported`);
                }
            }
        }
        else if (msg!.xy) {
            return msg as ILoreOpt;
        }

        const json = {msg, entry};
        RG.err('System.Chat', 'getRespMsgFromEntry',
           'Only str/str[]/ILoreOpt msg supported in entry. Got: ' + JSON.stringify(json));
        return ERROR_STR;
    }


    protected getAskMsgFromEntry(actor, entry: ILoreEntry): string {
        if ((entry as any).msg) {
            let err = 'entry.msg not supported. Use entry.askMsg from now on';
            err += ' Got: ' + JSON.stringify((entry as any).msg);
            RG.err('System.Chat', 'getRespMsgFromEntry', err);
        }
        if (entry.askMsg) {
            const msg = entry.askMsg;
            if (Array.isArray(msg)) {
                return this.rng.arrayGetRand(msg);
            }
            else if (typeof msg === 'string') {
                return msg;
            }
        }
        RG.err('System.Chat', 'getAskMsgFromEntry',
            'entry.askMsg does not exist');
        return ERROR_STR;
    }

    protected actorHasInMemory(target: IQuestTarget, actor, chatObj): [boolean, any] {
        const aName = actor.getName();
        const tName = target.name;
        let resp = null;
        const id = target.id;
        const memory: Memory = actor.getBrain().getMemory();

        if (memory.hasSeen(id)) {
            resp = chatObj.getSelectionObject();
            const {x, y} = memory.getLastSeen(id)!; // hasSeen called
            const dir = RG.getTextualDir([x, y], actor);
            let msg = `${aName} says: I know where ${tName} is.`;
            msg += ` I saw ${tName} ${dir} from here.`;
            RG.gameInfo(msg);
            return [true, resp];
        }
        else if (target.targetType === 'location') {
            if (id === actor.getLevel().getID()) {
                resp = chatObj.getSelectionObject();
                const msg = `This place is ${tName}.`;
                RG.gameInfo(msg);
                return [true, resp];
            }
        }
        return [false, resp];
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

    /* This checks the current lore entry, if choosing that will reveal any new
     * info to the player. */
    protected checkEntryForRevealed(loreComp: ComponentLore, entry: ILoreEntry): void {
        if (entry.revealNames) {
            entry.revealNames.forEach((newName: string) => {
                const msg = ['Where can I find ' + newName + '?'];
                const newEntry: ILoreEntry = {topic: 'custom', askMsg: msg, names: [newName]};
                newEntry.cmd = QUERY_LOC_FROM_MEM;
                // Currently only 1 name/ID supported
                if (entry.revealIds) {
                    if (entry.revealNames!.length === 1 && entry.revealIds.length === 1) {
                        newEntry.ids = entry.revealIds.slice();
                    }
                }
                if (!loreComp.hasEntry(newEntry)) {
                    loreComp.addEntry(newEntry);
                }
            });
        }
    }

    protected getTopicQuestion(actor, topicName: string, entry: ILoreEntry): string {
        const questions: any = {
            quests: 'Is anyone looking for help here?',
            places: 'Do you know what places are nearby?',
            shops:  'Is there a place for trading?',
            people: 'What can you tell me about people here?',
            world: 'Do you have any rumors from faraway lands?',
        };
        if (questions[topicName]) {
            return questions[topicName];
        }
        else if (topicName === 'custom') {
            return this.getAskMsgFromEntry(actor, entry);
        }
        else {
            RG.err('system.chat.ts', 'getTopicQuestion',
               `No match for topic ${topicName}`);
        }
        return ERROR_STR;
    }

    protected getFormattedReply(
        actor: BaseActor, topic: string, chosenOpt: ILoreOpt
    ): string {
        // No processing needed, just return what we got
        console.log(topic + '| getFormattedReply msg is ', chosenOpt);
        if (typeof chosenOpt === 'string') {
            return chosenOpt;
        }

        // TODO Need to query some attributes for the reply

        // Contains a hint for a direction
        let textualDir = '';
        if (chosenOpt.xy) {
            textualDir = RG.getTextualDir(chosenOpt.xy, actor);
        }

        let msg = '';
        switch (topic) {
            case 'shops': {
                if (actor.has('Shopkeeper')) {
                    msg = `You are already in my shop. Welcome!`;
                }
                else {
                    msg = `${chosenOpt.name} should have a shop ${textualDir} from here.`;
                }
                break;
            }
            case 'custom': {
                if (textualDir !== '') {
                    msg = `I saw ${chosenOpt.name} ${textualDir} from here.`;
                }
                else {
                    msg = `I saw ${chosenOpt.name} around, but don't remember where.`;
                }
                break;
            }
        }
        console.log(topic + '| getFormattedReply return msg ', msg);
        return msg;
    }

}
