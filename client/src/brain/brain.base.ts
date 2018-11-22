
import RG from '../rg';

type ActionCallback = import('../time').ActionCallback;
type BaseActor = import('../actor').BaseActor;
type Cell = import('../map.cell').Cell;
type Memory = import('./brain.memory').Memory;

const NO_MEMORY = null;

/* Base class for actor brains. */
export class BrainBase {

    public _actor: BaseActor;
    public _type: string;

    constructor(actor) {
        if (RG.isNullOrUndef([actor])) {
            RG.err('BrainSentient', 'constructor',
                'Actor must not be null.');
        }
        this._actor = actor;
        this._type = null;
    }

    public setActor(actor: BaseActor): void {this._actor = actor;}
    public getActor(): BaseActor {return this._actor;}
    public getType(): string {return this._type;}
    public setType(type: string): void {this._type = type;}

    public getMemory(): Memory {return NO_MEMORY;}
    public getSeenCells(): Cell[] {return [];}
    public findEnemyCell(seenCells: Cell[]): Cell {return null;}
    public findFriendCell(seenCells: Cell[]): Cell {return null;}
    public canMeleeAttack(x, y): boolean {return false;}
    public canSeeActor(actor): boolean {return false;}
    public getSeenFriends(): BaseActor[] {return [];}
    public getSeenEnemies(): BaseActor[] {return [];}

    public decideNextAction(obj?: any): ActionCallback {
        RG.err('BrainBase', 'decideNextAction',
            'Not implemented. Do in derived class');
        return null;
    }

    public toJSON() {
        return {
            type: this._type
        };
    }
}
