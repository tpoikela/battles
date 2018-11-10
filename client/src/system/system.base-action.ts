
import RG from '../rg';
import * as Menu from '../menu';
import {SystemBase} from './system.base';
import {EventPool} from '../eventpool';

import {SystemEffects} from './system.effects';
import {SystemQuest} from './system.quest';

const POOL = EventPool.getPool();

const handledComps = [
    'Pickup', 'UseStairs', 'OpenDoor', 'UseItem', 'UseElement',
    'Jump', 'Read', 'Give'
];

type HandleFunc = (ent) => void;

/* Processes entities with attack-related components.*/
export class SystemBaseAction extends SystemBase {

    public _dtable: {[key: string]: HandleFunc};

    constructor(compTypes, pool?: EventPool) {
        super(RG.SYS.BASE_ACTION, compTypes, pool);
        this.compTypesAny = true;

        // Initialisation of dispatch table for handler functions
        this._dtable = {
            Give: this._handleGive,
            Jump: this._handleJump,
            OpenDoor: this._handleOpenDoor,
            Pickup: this._handlePickup,
            Read: this._handleRead,
            UseElement: this._handleUseElement,
            UseItem: this._handleUseItem,
            UseStairs: this._handleUseStairs
        };
    }

    updateEntity(ent): void {
        handledComps.forEach(compType => {
            if (ent.has(compType)) {
                this._dtable[compType](ent);
                ent.remove(compType);
            }
        });
    }

    /* Handles give command. */
    private _handleGive(ent): void {
        const giveComp = ent.get('Give');
        const giveTarget = giveComp.getGiveTarget();
        const giveItem = giveComp.getItem();

        if (!giveTarget.isEnemy(ent)) {
            if (ent.getInvEq().removeItem(giveItem)) {
                const removedItem = ent.getInvEq().getRemovedItem();
                giveTarget.getInvEq().addItem(removedItem);
                const isQuestItem = removedItem.has('QuestTarget');

                if (isQuestItem && giveTarget.has('QuestTarget')) {
                    const giveArgs = {actor: giveTarget, item: removedItem};
                    const qTarget = removedItem.get('QuestTarget');
                    SystemQuest.addQuestEvent(ent, qTarget, 'give', giveArgs);
                }
                let msg = `${ent.getName()} gives `;
                msg += `${giveItem.getName()} to ${giveTarget.getName()}`;
                RG.gameMsg({cell: ent.getCell(), msg});
            }
        }
        else {
            let msg = `${giveTarget.getName()} refuses to take `;
            msg += `${giveItem.getName()} from ${ent.getName()}`;
            RG.gameMsg({cell: ent.getCell(), msg});
        }
    }

    /* Handles pickup command. */
    private _handlePickup(ent): void {
        const [x, y] = [ent.getX(), ent.getY()];
        const level = ent.getLevel();
        const cell = level.getMap().getCell(x, y);

        if (cell.hasProp(RG.TYPE_ITEM)) {
            const item = cell.getProp(RG.TYPE_ITEM)[0];
            if (ent.getInvEq().canCarryItem(item)) {
                ent.getInvEq().addItem(item);

                try {
                    level.removeItem(item, x, y);
                }
                catch (e) {
                    let msg = `Unable to remove item ${JSON.stringify(item)}\n`;
                    msg += `Actor for pickup: ${ent.getName()}`;
                    RG.err('System.BaseAction', 'handlePickup', msg);
                }

                let itemStr = item.getName();
                if (item.getCount() > 1) {
                    itemStr += ' x' + item.getCount();
                }
                const msgObj = {
                    msg: ent.getName() + ' picked up ' + itemStr,
                    cell
                };
                RG.gameMsg(msgObj);

                if (item.has('QuestTarget')) {
                    const qTarget = item.get('QuestTarget');
                    addQuestEvent(ent, qTarget, 'get');
                }
            }
            else {
                const msgObj = {
                    msg: ent.getName() + ' cannot carry more weight',
                    cell
                };
                RG.gameMsg(msgObj);
            }
        }
        const evtArgs = {
            type: RG.EVT_ITEM_PICKED_UP
        };
        this._createEventComp(ent, evtArgs);
    }

    /* Handles command when actor uses stairs. */
    private _handleUseStairs(ent): void {
        const level = ent.getLevel();
        const cell = ent.getCell();
        // Check if any actors should follow the player
        const actorsAround = RG.Brain.getActorsAround(ent);

        if (level.useStairs(ent)) {
            if (ent.isPlayer()) {ent.getBrain().addMark();}

            const newLevel = ent.getLevel();
            if (newLevel.has('QuestTarget')) {
                const qEvent = new RG.Component.QuestTargetEvent();
                qEvent.setEventType('goto');
                qEvent.setTargetComp(newLevel.get('QuestTarget'));
                ent.add(qEvent);
            }

            POOL.emitEvent(RG.EVT_LEVEL_CHANGED,
                {target: newLevel, src: level, actor: ent});
            POOL.emitEvent(RG.EVT_LEVEL_ENTERED,
                {actor: ent, target: newLevel});

            // Moves the surrounding actors to new location as well
            if (actorsAround.length > 0) {
                const cells = RG.Brain.getBoxOfFreeCellsAround(ent, 1);

                while (actorsAround.length > 0 && cells.length > 0) {
                    const nextActor = actorsAround.pop();
                    const nextCell = cells.pop();
                    if (level.removeActor(nextActor)) {
                        const [x, y] = [nextCell.getX(), nextCell.getY()];
                        newLevel.addActor(nextActor, x, y);
                        const name = nextActor.getName();
                        RG.gameMsg(`${name} follows ${ent.getName()}`);
                    }
                    else {
                        // Failing not a fatal error, there might not be space
                        const json = JSON.stringify(nextActor);
                        RG.warn('System.BaseAction', '_handleUseStairs',
                            'Could not remove the actor: ' + json);
                    }
                }
            }
            const evtArgs = {
                type: RG.EVT_ACTOR_USED_STAIRS,
                cell
            };
            this._createEventComp(ent, evtArgs);
        }
    }

    /* Handles command to open door and execute possible triggers like traps. */
    private _handleOpenDoor(ent): void {
        const door = ent.get('OpenDoor').getDoor();
        const [x, y] = door.getXY();
        const level = ent.getLevel();
        const cell = level.getCell(x, y);
        let msg = '';
        const entName = ent.getName();

        if (door.has('Broken')) {
            msg = 'Door is broken and does not move at all!';
        }
        else if (door.canToggle()) {
            if (cell.hasItems()) {
                msg = 'Door is blocked by an item';
            }
            else if (cell.hasActors()) {
                msg = 'Door is blocked by someone';
            }
            else if (door.isOpen()) {
                door.closeDoor();
                msg = `${entName} closes a door.`;
            }
            else {
                door.openDoor();
                msg = `${entName} opens a door.`;
            }
        }
        else {
            msg = `${entName} cannot toggle the door.`;
        }
        if (msg !== '') {
            RG.gameMsg({cell, msg});
        }
    }

    private _handleUseItem(ent): void {
        const useItemComp = ent.get('UseItem');
        const item = useItemComp.getItem();

        if (item.has('Broken')) {
          const msg = `${item.getName()} cannot be used because it is broken`;
          RG.gameMsg({cell: ent.getCell(), msg});
          return;
        }

        if (item.has('OneShot')) {
            if (item.getCount() === 1) {
                const msg = {item};
                POOL.emitEvent(RG.EVT_DESTROY_ITEM, msg);
            }
            else {
                item.decrCount(1);
            }
        }
        else if (item.getCharges && item.getCharges() > 0) {
            item.setCharges(item.getCharges() - 1);
        }
        this._checkUseItemMsgEmit(ent, useItemComp);

        const effArgs = useItemComp.getEffect();
        if (effArgs) {
            const effComp = new RG.Component.Effects(effArgs);
            ent.add(effComp);
        }
    }

    private _handleUseElement(ent): void {
        const useComp = ent.get('UseElement');
        const elem = useComp.getElement();
        if (!elem.has('Broken')) {
            if (elem.onUse) {
                // Just assume it's a function, what could go wrong?
                elem.onUse(ent);
            }
        }
        this._checkUseElementMsgEmit(ent, useComp);
    }

    private _handleJump(ent): void {
        const jump = ent.get('Jump');
        const [dx, dy] = [jump.getX(), jump.getY()];
        let jumpRange = 2;
        if (ent.has('Jumper')) {
            jumpRange = ent.get('Jumper').getJumpRange();
        }
        const map = ent.getLevel().getMap();
        const [x0, y0] = ent.getXY();
        const x1 = x0 + dx * jumpRange;
        const y1 = y0 + dy * jumpRange;
        const jumpPathCb = (x, y) => {
            const cell = map.getCell(x, y);
            if (cell.hasActors()) {
                const actors = cell.getActors();
                for (let i = 0; i < actors.length; i++) {
                    const actor = actors[i];
                    if (!actor.has('Ethereal')) {
                        return false;
                    }
                }
            }
            return RG.Element.canJumpOver(cell.getBaseElem().getType());
        };
        const path = RG.Path.getShortestActorPath(map, x0, y0, x1, y1,
            jumpPathCb);
        // TODO Verify that path is direct path
        if (path.length === jumpRange) {
            const movComp = new RG.Component.Movement(x1, y1, ent.getLevel());
            ent.add(movComp);
        }
    }

    private _handleRead(ent) {
        const read = ent.get('Read');
        let readTarget = read.getReadTarget();
        if (!readTarget) {
            const cell = ent.getCell();
            if (cell.hasItems()) {
                const items = cell.getItems();
                const book = items.find(item => item.getType() === 'book');
                if (book) {
                    readTarget = book;
                }
            }
        }
        if (readTarget) {
            const text = readTarget.getText();
            const bookMenu = new Menu.MenuInfoOnly();
            bookMenu.addPre(text);
            const bookName = readTarget.getName();
            RG.gameInfo(`The book "${bookName}" reads:`);
            if (ent.getBrain().setSelectionObject) {
                ent.getBrain().setSelectionObject(bookMenu);
            }
        }
        else {
            const msg = `${ent.getName()} finds nothing interesting to read.`;
            RG.gameMsg({cell: ent.getCell(), msg});
        }

        if (readTarget.has('QuestTarget')) {
            const qEvent = new RG.Component.QuestTargetEvent();
            qEvent.setEventType('read');
            qEvent.setTargetComp(readTarget.get('QuestTarget'));
            ent.add(qEvent);
        }
    }


    /* Used to create events in response to specific actions. */
    private _createEventComp(ent, args): void {
        const evtComp = new RG.Component.Event();
        evtComp.setArgs(args);
        ent.add(evtComp);
    }

    private _checkUseItemMsgEmit(ent, comp): void {
        if (comp.getUseType() === RG.USE.DRINK) {
            const item = comp.getItem();
            const targetObj = comp.getTarget();
            const targetType = comp.getTargetType();
            const target = getUseTarget(targetObj, targetType);
            const cell = target.getCell();
            const msg = target.getName() + ' drinks '
                + item.getName();
            RG.gameMsg({cell, msg});
        }
    }

    private _checkUseElementMsgEmit(ent, comp): void {
        const elem = comp.getElement();
        const elemName = elem.getName();
        const cell = ent.getCell();

        let msg = '';
        if (elem.has('Broken')) {
            msg = `${elemName} is broken, and cannot be used.`;
        }
        else if (comp.getUseType() === RG.USE.LEVER) {
            const name = ent.getName();
            msg = `${name} toggles the lever`;
        }
        if (msg) {
            RG.gameMsg({cell, msg});
        }
    }
}

function getUseTarget(targetObj, targetType) {
    if (targetObj.target) {
        return SystemEffects.getTargetFromObj(targetObj, targetType);
    }
    else if (targetObj.getCell) {
        return targetObj;
    }
    return null;
}

