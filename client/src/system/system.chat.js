
const RG = require('../rg');

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
                // TODO spirits react differently
                const msg = `You chat with ${actor.getName()} for a while.`;
                RG.gameMsg({cell, msg});
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
    const entBrain = ent.getBrain();
    entBrain.setSelectionObject(selObj);
};

module.exports = System.Chat;
