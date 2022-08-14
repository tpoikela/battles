
import RG from '../rg';
import {SystemBase} from './system.base';
import {EventPool} from '../eventpool';
import {IRecipe, IRecipeEntry} from '../interfaces';
import {ObjectShell, Parser} from '../objectshellparser';
import {IShell} from '../interfaces';
import {SentientActor} from '../actor';
import {getElem, ELEM_MAP} from '../../data/elem-constants';

type Entity = import('../entity').Entity;
type Cell = import('../map.cell').Cell;


export class SystemBuilding extends SystemBase {

    protected parser: Parser;

    constructor(compTypes: string[], pool: EventPool) {
        super(RG.SYS.BUILDING, compTypes, pool);
        this.parser = ObjectShell.getParser();
    }

    public updateEntity(ent: Entity): void {
        const compList = ent.getList('BuildEvent');
        compList.forEach(comp => {
            this.processComp(ent, comp);
            ent.remove(comp);
        });
    }

    protected processComp(ent: Entity, comp): void {
        const actor = ent as SentientActor;
        const entName = actor.getName();
        const elemName = comp.getElem();
        const cell: Cell = comp.getTarget();
        const level = actor.getLevel();

        if (ELEM_MAP.elemTypeToObj[elemName]) {
            const elem = getElem(elemName);
            const [x, y] = [cell.getX(), cell.getY()];
            level.getMap().getCell(x, y).setBaseElem(elem);
        }
        else {
            const elem = this.parser.createElement(elemName) as any;
            if (elem) {
                if (elem.has('Location')) {
                    level.addElement(elem, cell.getX(), cell.getY());
                }
            }
        }
    }
}
