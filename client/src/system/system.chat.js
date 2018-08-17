
const RG = require('../rg');

const System = {};
System.Base = require('./system.base');

/* This system handles all entity movement.*/
System.Chat = function(compTypes) {
    System.Base.call(this, RG.SYS.CHAT, compTypes);

    this.updateEntity = function(ent) {
        const args = ent.get('Chat').getArgs();
        const dir = args.dir;
        const [dX, dY] = [dir[0], dir[1]];
        const x = ent.getX() + dX;
        const y = ent.getY() + dY;
        const map = ent.getLevel().getMap();
        if (map.hasXY(x, y)) {
            const cell = map.getCell(x, y);
            if (cell.hasActors()) {
                const actor = cell.getActors()[0];
                if (actor.has('Trainer')) {
                    const chatObj = actor.get('Trainer').getChatObj();
                    chatObj.setTarget(ent);
                    const selObj = chatObj.getSelectionObject();
                    const entBrain = ent.getBrain();
                    entBrain.setSelectionObject(selObj);
                }
                // TODO spirits react differently
                const msg = `You chat with ${actor.getName()} for a while.`;
                RG.gameMsg({cell, msg});
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

};
RG.extend2(System.Chat, System.Base);

module.exports = System.Chat;
