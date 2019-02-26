import RG from './rg';
import {EventPool} from './eventpool';

/* Describes a condition when the player has won the game. 1st version pretty
 * much checks if given actor is killed. */
export class WinCondition {
    public hasNotify: boolean;

    private _name: string;
    private description: string; // Shown when condition filled

    private _condIncomplete: {[key: string]: any[]};
    private _condFilled: {[key: string]: boolean};
    private pool: EventPool;
    private _isTrue: boolean;
    private _notifyCallbacks: {[key: string]: (any) => void};

    constructor(name, pool: EventPool) {
        this._name = name;
        this.description = ''; // Shown when condition filled

        this._condIncomplete = {};
        this._condFilled = {};
        this.pool = pool;
        this._isTrue = false;
        this.hasNotify = true;
        this._notifyCallbacks = {
            [RG.EVT_ACTOR_KILLED]: this.actorKilledCallback.bind(this)
        };
    }

    public getName(): string {
        return this._name;
    }

    public setPool(pool: EventPool): void {
        if (pool !== this.pool) {
            if (this.pool.isListener(this)) {
                this.pool.removeListener(this);
            }
        }
        this.pool = pool;
    }

    public isTrue() {return this._isTrue;}

    public addNotifyCallback(type, func) {
        this._notifyCallbacks[type] = func;
    }

    public notify(evtName, args) {
        if (this._notifyCallbacks.hasOwnProperty(evtName)) {
            this._notifyCallbacks[evtName](args);
        }

        if (!this._isTrue) {
            if (Object.keys(this._condIncomplete).length === 0) {
                this._isTrue = true;
                this.onTrue();
            }
        }
    }

    /* Add an event to listen to for win condition. */
    public _addEvent(type) {
        this.pool.listenEvent(type, this);
    }

    public addActorKilled(actor) {
        this._addEvent(RG.EVT_ACTOR_KILLED);
        this._condIncomplete[RG.EVT_ACTOR_KILLED] = [actor.getID()];
    }

    /* Customisable callback fired on condition being true. */
    public onTrue() {
        let msg = `Condition: ${this._name}, Description: ${this.description}.`;
        msg += 'Congratulations. You have won!';
        RG.gameSuccess(msg);
        this.pool.emitEvent(RG.EVT_WIN_COND_TRUE, {name: this._name});
    }

    // Some default callbacks (if not overwritten)
    public actorKilledCallback(args) {
        const actor = args.actor;
        const actors = this._condIncomplete[RG.EVT_ACTOR_KILLED];
        if (actors) {
            const index = actors.indexOf(actor.getID());
            if (index >= 0) {
                actors.splice(index, 1);
                if (actors.length === 0) {
                    delete this._condIncomplete[RG.EVT_ACTOR_KILLED];
                }
            }
        }
    }

}
