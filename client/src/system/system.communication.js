
const RG = require('../rg');

const System = {};
System.Base = require('./system.base');

/* Processes entities with communication component.*/
System.Communication = function(compTypes) {
    System.Base.call(this, RG.SYS.COMMUNICATION, compTypes);

    // Each entity here has received communication and must capture its
    // information contents
    this.updateEntity = function(ent) {
        const comComp = ent.get('Communication');
        const messages = comComp.getMsg();
        for (let i = 0; i < messages.length; i++) {
            this.processMessage(ent, messages[i]);
        }
        ent.remove('Communication');
    };

    this.processMessage = (ent, msg) => {
        if (_msgFunc.hasOwnProperty(msg.type)) {
            _msgFunc[msg.type](ent, msg);
        }
        else {
            RG.err('CommunicationSystem', 'processMessage',
                'No function for msg type |' + msg.type + '| in dtable.');
        }
    };

    this.processEnemies = (ent, msg) => {
        const enemies = msg.enemies;
        const srcName = msg.src.getName();
        for (let i = 0; i < enemies.length; i++) {
            ent.addEnemy(enemies[i]);
        }
        const msgObj = {cell: ent.getCell(),
            msg: `${srcName} seems to communicate with ${ent.getName()}`
        };
        RG.gameInfo(msgObj);
    };

    // Dispatch table for different messages
    const _msgFunc = {
        Enemies: this.processEnemies
    };

};
RG.extend2(System.Communication, System.Base);

module.exports = System.Communication;
