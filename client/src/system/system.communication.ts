
import RG from '../rg';
import {Entity} from '../entity';
import {SystemBase} from './system.base';
import {Communication} from '../component';
import {EventPool} from '../eventpool';

/* Processes entities with communication component.*/
export class SystemCommunication extends SystemBase {

    private _msgFunc: {[key: string]: (ent, msg) => void};

    constructor(compTypes, pool?: EventPool) {
        super('Communication', compTypes, pool);

        // Dispatch table for different messages
        this._msgFunc = {
            Enemies: this.processEnemies.bind(this),
            Shout: this.processShout.bind(this)
        };

    }

    // Each entity here has received communication and must capture its
    // information contents
    public updateEntity(ent: Entity): void {
        const comComp = ent.get('Communication');
        const messages = comComp.getMsg();
        for (let i = 0; i < messages.length; i++) {
            this.processMessage(ent, messages[i]);
        }
        ent.remove('Communication');
    }

    public processMessage(ent, msg): void {
        if (this._msgFunc.hasOwnProperty(msg.type)) {
            this._msgFunc[msg.type](ent, msg);
        }
        else {
            RG.err('CommunicationSystem', 'processMessage',
                'No function for msg type |' + msg.type + '| in dtable.');
        }
    }

    public processEnemies(ent, msg): void {
        const enemies = msg.enemies;
        const srcName = msg.src.getName();
        for (let i = 0; i < enemies.length; i++) {
            ent.addEnemy(enemies[i]);
        }
        const msgObj = {cell: ent.getCell(),
            msg: `${srcName} seems to communicate with ${ent.getName()}`
        };
        RG.gameInfo(msgObj);
    }

    public processShout(ent, msg): void {
        const shoutMsg = msg.shout;
        const srcName = msg.src.getName();
        const msgObj = {cell: msg.src.getCell(),
            msg: `${srcName} shouts ${shoutMsg}`};
        RG.gameInfo(msgObj);
    }

}

