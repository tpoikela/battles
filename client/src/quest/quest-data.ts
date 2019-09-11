
import RG from '../rg';
import {Entity} from '../entity';
import {Level} from '../level';
import {getQuestVerb} from '../component/component.quest';

type ZoneBase = import('../world').ZoneBase;

//---------------------------------------------------------------------------
// QUESTDATA for storing quest mapping information
//---------------------------------------------------------------------------

/* Used when target creation is deferred until all tasks are mapped. */
export interface QuestObjSurrogate {
    createTarget: string; // Factory function to call
    args?: any[];
}

export type QuestTargetObj = Entity | ZoneBase | QuestObjSurrogate;

interface QuestPathObj {
    type: string;
    target: QuestTargetObj;
}

export class QuestData {
    public static mapStepToType: {[key: string]: string};

    // TODO fix typings
    public _stacks: {[key: string]: QuestTargetObj[]};
    public path: QuestPathObj[];
    public _ptr: {[key: string]: any};

    constructor() {
        this._stacks = {};
        this.path = [];
        this._ptr = {}; // Pointers for iteration
    }

    /* Adds one target for the quest. */
    public addTarget(targetType: string, obj: QuestTargetObj): void {
        if (!RG.isEntity(obj)) {
            if (!(obj as QuestObjSurrogate).createTarget) {
                const json = JSON.stringify(obj);
                RG.err('QuestData', 'addTarget',
                    `Only entities can be added. Got: ${json}`);
            }
        }
        if (QuestData.mapStepToType[targetType]) {
            if (!this._stacks[targetType]) {
                this._stacks[targetType] = [];
            }
            this._stacks[targetType].push(obj);
            this.path.push({type: targetType, target: obj});
        }
        else {
            const steps = JSON.stringify(QuestData.mapStepToType);
            RG.err('QuestData', 'add',
                `Step type ${targetType} not supported. See:\n${steps}`);
        }
    }

    public replaceTarget(key: string, oldTarget: QuestTargetObj, newTarget: Entity): boolean {
        const objList = this._stacks[key];
        let index = objList.indexOf(oldTarget);
        if (index >= 0) {
            objList.splice(index, 1, newTarget);
            index = this.path.findIndex(obj => obj.target === oldTarget);
            if (index >= 0) {
                const oldTargetObj = this.path[index];
                const newTargetObj: QuestPathObj = {
                    target: newTarget, type: oldTargetObj.type};
                this.path.splice(index, 1, newTargetObj);
            }
            else {
                RG.err('QuestData', 'replaceTarget',
                    'Could not replace target on path');
            }
            return true;
        }
        return false;
    }

    public numSteps(): number {
        const num = this.path.length;
        return num;
    }

    public keys(): string[] {
        const keys = Object.keys(this._stacks);
        return keys;
    }

    public getPathTypes(): string[] {
        return this.path.map(pair => pair.type);
    }

    public getPathTargets(): QuestTargetObj[] {
        return this.path.map(pair => pair.target);
    }

    public pop(targetType: string): QuestTargetObj | null {
        if (this._stacks[targetType]) {
            const val = this._stacks[targetType].pop();
            if (val) {return val;}
        }
        return null;
    }

    /* Reset iterators of the quest data. */
    public resetIter(): void {
        this.keys().forEach(targetType => {
            this._ptr[targetType] = 0;
        });
    }

    public next(targetType) {
        if (this._stacks[targetType]) {
            if (!this._ptr.hasOwnProperty(targetType)) {
                this._ptr[targetType] = 0;
            }
            const ptrVal = this._ptr[targetType];
            if (ptrVal < this._stacks[targetType].length) {
                ++this._ptr[targetType];
                return this._stacks[targetType][ptrVal];
            }
        }
        return null;
    }

    public getCurrent(targetType) {
        if (this._stacks[targetType]) {
            const stack = this._stacks[targetType];
            return stack[stack.length - 1];
        }
        return null;
    }

    public getCurrentLocation(): Level {
        const location = this.getCurrent('location') as Level;
        if (location) {return location;}
        RG.err('QuestGen', 'getCurrentLocation',
            'No location found');
    }

    /* Returns human-readable description of the quest. */
    public getDescr(): string {
        // this.resetIter();
        let res = '';
        this.path.forEach(pair => {
            const step = pair.type;
            // const value = this.next(step);
            const value = pair.target;
            const name = RG.getName(value);
            res += getQuestVerb(step) + ' ' + name + '. ';
        });
        return res;
    }

    public toJSON() {
        const path: any = [];
        this.path.forEach(step => {
            const refType = QuestData.mapStepToType[step.type];
            if (refType) {
                if ((step.target as Entity).getID) {
                    const pathData = {
                        type: step.type,
                        target: RG.getObjRef(refType, step.target)
                    };
                    path.push(pathData);
                }
                else {
                    const pathData = {
                        type: step.type, target: step.target};
                    path.push(pathData);
                }
            }
            else {
                console.error('Used step is', step);
                RG.err('QuestData', 'toJSON',
                    `No refType for step type ${step.type}`);
            }
        });
        path.$objRefArray = true;
        return {
            createFunc: 'createQuestData',
            value: {
                path
            }
        };
    }
}

QuestData.mapStepToType = {
    capture: 'entity',
    escort: 'entity',
    exchange: 'item',
    experiment: 'item',
    explore: 'element',
    damage: 'entity',
    defend: 'entity',
    get: 'item',
    give: 'entity',
    kill: 'entity',
    listen: 'entity',
    location: 'place',
    finishbattle: 'place',
    read: 'item',
    repair: 'element',
    report: 'entity',
    reportListen: 'entity',
    rescue: 'entity',
    spy: 'entity',
    steal: 'item',
    take: 'item',
    subquest: 'entity',
    use: 'item',
    winbattle: 'place'
};
