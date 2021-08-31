
import RG from './rg';
import {EventPool} from './eventpool';
import {IMessage} from './interfaces';

//---------------------------------------------------------------------------
// MessageHandler
//---------------------------------------------------------------------------

/* Handles the game message listening and storing of the messages. */
export class MessageHandler { // {{{2

    public static fromJSON(json, pool: EventPool): MessageHandler {
        const msg = new MessageHandler(pool);
        msg._hasNew = json._hasNew as boolean;
        msg._messages = json._messages as IMessage[];
        msg._prevMessages = json._prevMessages as IMessage[];
        msg._lastMsg = json._lastMsg as IMessage;
        return msg;
    }

    public hasNotify: boolean;

    protected _lastMsg: null | IMessage;
    protected _messages: IMessage[];
    protected _prevMessages: IMessage[];
    protected _hasNew: boolean;
    protected _fullHistory: IMessage[];

    constructor(pool: EventPool) {
        this._lastMsg = null;
        this._messages = [];
        this._prevMessages = [];
        this._hasNew = false;
        this.hasNotify = true;
        this._fullHistory = [];
        pool.listenEvent(RG.EVT_MSG, this);
    }

    public notify(evtName: string, msg: IMessage): void {
        if (evtName === RG.EVT_MSG) {
            if (msg.hasOwnProperty('msg')) {
                const msgObj: IMessage = {msg: msg.msg, style: 'prim', count: 1};

                if (msg.hasOwnProperty('cell')) {
                    msgObj.cell = msg.cell;
                }

                if (msg.hasOwnProperty('style')) {
                    msgObj.style = msg.style;
                }

                if (this._lastMsg && this._lastMsg.msg === msgObj.msg) {
                    if (this._lastMsg.count) {
                        this._lastMsg.count += 1;
                    }
                    else {
                        this._lastMsg.count = 1;
                    }
                }
                else {
                    this._lastMsg = msgObj;
                    this._messages.push(msgObj);
                }
                this._hasNew = true;
            }
        }
    }

    public hasNew(): boolean {return this._hasNew;}

    public getHistory(): IMessage[] {return this._fullHistory.slice();}

    public getMessages(): IMessage[] {
        this._hasNew = false;
        if (this._messages.length > 0) {return this._messages;}
        else if (this._prevMessages.length > 0) {return this._prevMessages;}
        else {return [];}
    }

    public clear(): void {
        if (this._messages.length > 0) {this._prevMessages = this._messages.slice();}
        this._messages = [];
    }

    public toJSON(): any {
        return {
            _lastMsg: this._lastMsg,
            _messages: msgToJSON(this._messages),
            _fullHistory: msgToJSON(this._fullHistory),
            _prevMessages: msgToJSON(this._prevMessages),
            _hasNew: this._hasNew
        };
    }

}

/* Serializes the messages. Currently filters out messages with
 * 'cell' specified as this cannot be serialised correctly. */
function msgToJSON(messages: IMessage[]): IMessage[] {
    const res: IMessage[] = [];
    messages.forEach((msg: IMessage) => {
        if (!msg.cell) {
            res.push(msg);
        }
        else if (typeof msg.msg === 'string') {
            res.push({msg: msg.msg});
        }
    });
    return res;
}

