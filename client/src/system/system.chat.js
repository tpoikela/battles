
const RG = require('../rg');
const Chat = require('../chat');

const System = {};
System.Base = require('./system.base');

/* This system handles all entity movement.*/
System.Chat = function(compTypes) {
    System.Base.call(this, RG.SYS.CHAT, compTypes);
};
RG.extend2(System.Chat, System.Base);

System.Chat.prototype.updateEntity = function(ent) {
    const args = ent.get('Chat').getArgs();
    const dir = args.dir;
    const [dX, dY] = [dir[0], dir[1]];
    const x = ent.getX() + dX;
    const y = ent.getY() + dY;
    const map = ent.getLevel().getMap();
    if (map.hasXY(x, y)) {
        const cell = map.getCell(x, y);
        if (cell.hasActors()) {
            const actors = cell.getActors();
            actors.forEach(actor => {
                if (actor.has('Trainer')) {
                    this.setChatObject(ent, actor, 'Trainer');
                }
                else if (actor.has('QuestGiver')) {
                    this.setChatObject(ent, actor, 'QuestGiver');
                }
                else {
                    // TODO spirits react differently
                    this.createGenericChatObject(ent, actor);
                    const msg = `You chat with ${actor.getName()} for a while.`;
                    RG.gameMsg({cell, msg});
                }
            });
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
    ent.remove('Chat');
};

System.Chat.prototype.setChatObject = function(ent, srcActor, compType) {
    const chatObj = srcActor.get(compType).getChatObj();
    chatObj.setTarget(ent);
    const selObj = chatObj.getSelectionObject();
    if (selObj) {
        const entBrain = ent.getBrain();
        entBrain.setSelectionObject(selObj);
    }
    else {
        const srcName = srcActor.getName();
        RG.err('System.Chat', 'setChatObject',
            `Null/undef selectObj with type ${compType}, src: ${srcName}`);
    }
};


System.Chat.prototype.createGenericChatObject = function(ent, actor) {
    if (ent.has('Quest')) {
        const chatObj = new Chat.ChatBase();
        const aName = actor.getName();

        chatObj.pre = `${aName} greets you. What do you say?`;
        const qTargets = ent.get('Quest').getQuestTargets();

        qTargets.forEach(target => {
            // const target = comp.getTarget();
            this.processQuestTarget(target, actor, chatObj);
        });

        const selObj = chatObj.getSelectionObject();
        ent.getBrain().setSelectionObject(selObj);
    }
};


System.Chat.prototype.processQuestTarget = function(target, actor, chatObj) {
    const aName = actor.getName();
    const tName = target.name;
    let resp = null;

    const id = target.id;
    const memory = actor.getBrain().getMemory();
    if (memory.hasSeen(id)) {
        resp = chatObj.getSelectionObject();
        const {x, y} = memory.getLastSeen(id);
        const dir = RG.getTextualDxDy(actor, [x, y]);
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
};

module.exports = System.Chat;
