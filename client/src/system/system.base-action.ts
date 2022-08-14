
import RG from '../rg';
import * as Menu from '../menu';
import {SystemBase} from './system.base';
import {EventPool} from '../eventpool';

import {Path} from '../path';
import {SystemEffects} from './system.effects';
import {SystemQuest} from './system.quest';
import * as Component from '../component';
import {Brain} from '../brain';
import {Element} from '../element';
import {removeStatsModsOnLeave} from './system.utils';

type Entity = import('../entity').Entity;
type Area = import('../world').Area;
type AreaTile = import('../world').AreaTile;

const handledComps = [
    'Pickup', 'UseStairs', 'OpenDoor', 'UseItem', 'UseElement',
    'Jump', 'Read', 'Rest', 'Give', 'Displace',
];

type HandleFunc = (ent) => void;

/* Processes entities with attack-related components.*/
export class SystemBaseAction extends SystemBase {

    public _dtable: {[key: string]: HandleFunc};

    constructor(compTypes: string[], pool: EventPool) {
        super(RG.SYS.BASE_ACTION, compTypes, pool);
        this.compTypesAny = true;

        // Initialisation of dispatch table for handler functions
        this._dtable = {
            Displace: this._handleDisplace.bind(this),
            Give: this._handleGive.bind(this),
            Jump: this._handleJump.bind(this),
            OpenDoor: this._handleOpenDoor.bind(this),
            Pickup: this._handlePickup.bind(this),
            Read: this._handleRead.bind(this),
            UseElement: this._handleUseElement.bind(this),
            UseItem: this._handleUseItem.bind(this),
            UseStairs: this._handleUseStairs.bind(this),
            Rest: this._handleRest.bind(this),
        };
    }

    public updateEntity(ent: Entity): void {
        handledComps.forEach(compType => {
            if (ent.has(compType)) {
                this._dtable[compType](ent);
                ent.remove(compType);
            }
        });
    }

    /* Issue: Should cause Movement, otherwise many effects won't
     * trigger. */
    private _handleDisplace(ent: Entity): void {
        // RG.err('BaseAction', '_handleDisplace', 'Not implemented');
        const dispComp = ent.get('Displace');
        const dispTarget = dispComp.getDisplaceTarget();
        if (!dispTarget.isEnemy(ent)) {
            const [eX, eY] = ent.get('Location').getXY();
            const [dX, dY] = dispTarget.get('Location').getXY();
            const level = ent.get('Location').getLevel();
            const movComp = new Component.Movement(dX, dY, level);
            movComp.setDisplace(true);
            movComp.setActor(dispTarget);
            ent.add(movComp);
            const movComp2 = new Component.Movement(eX, eY, level);
            movComp2.setDisplace(true);
            movComp2.setActor(ent);
            dispTarget.add(movComp2);
        }
        else { // TODO: Apply Charm checks etc to allow displacing enemies
            const tname = RG.getName(dispTarget);
            const entName = RG.getName(ent);
            const cell = RG.getCell(ent);
            if (cell) {
                const msg = `${tname} refuses to swap places with ${entName}`;
                RG.gameMsg({msg, cell});
            }
        }
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
                // Auto-equip if similar missile/ammo equipped
                this._checkForAutoEquip(ent, item);

                if (item.has('QuestTarget')) {
                    const qTarget = item.get('QuestTarget');
                    SystemQuest.addQuestEvent(ent, qTarget, 'get');
                }

                const evtArgs = {
                    eventObject: item,
                    type: RG.EVT_ITEM_PICKED_UP,
                };
                this._createEventComp(ent, evtArgs);
            }
            else {
                const msgObj = {
                    msg: ent.getName() + ' cannot carry more weight',
                    cell
                };
                RG.gameMsg(msgObj);
            }
        }
    }

    /* Called when missile is picked to to check if it can be auto-equipped. */
    private _checkForAutoEquip(ent, item): void {
        const missile = ent.getInvEq().getMissile();
        if (missile) {
            if (missile.equals(item)) {
                if (ent.getInvEq().equipNItems(item, item.getCount())) {
                    const iName = item.getNameWithCount();
                    RG.gameMsg({cell: ent.getCell(), msg:
                        `${ent.getName()} equips ${iName}`});
                }
            }
        }
    }

    /* Handles command when actor uses stairs. */
    private _handleUseStairs(ent): void {
        const level = ent.getLevel();
        const cell = ent.getCell();
        // Check if any actors should follow the player
        const actorsAround = Brain.getActorsAround(ent);

        if (cell.hasConnection() && level.useStairs(ent)) {
            if (ent.isPlayer()) {ent.getBrain().addMark();}

            const newLevel = ent.getLevel();
            if (newLevel.has('QuestTarget')) {
                const qEvent = new Component.QuestTargetEvent();
                qEvent.setEventType('goto');
                qEvent.setTargetComp(newLevel.get('QuestTarget'));
                ent.add(qEvent);
            }

            this.pool.emitEvent(RG.EVT_LEVEL_CHANGED,
                {target: newLevel, src: level, actor: ent});
            this.pool.emitEvent(RG.EVT_LEVEL_ENTERED,
                {actor: ent, target: newLevel});

            // Moves the surrounding actors to new location as well
            if (actorsAround.length > 0) {
                const cells = Brain.getBoxOfFreeCellsAround(ent, 1);

                while (actorsAround.length > 0 && cells.length > 0) {
                    const nextActor = actorsAround.pop();
                    const nextCell = cells.pop();
                    const oldCell = nextActor.getCell();

                    if (level.removeActor(nextActor)) {
                        const [x, y] = [nextCell.getX(), nextCell.getY()];
                        const oldType = oldCell.getBaseElem().getType();
                        newLevel.addActor(nextActor, x, y);
                        removeStatsModsOnLeave(nextActor, oldType);
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
                cell, level,
            };
            this._createEventComp(ent, evtArgs);
            // If prev cell had any penalties, we need to remove those
            removeStatsModsOnLeave(ent, cell.getBaseElem().getType());
        }
        else {
            // If we're in AreaTile, create new Zone (if no conns close by)
            const levParent = level.getParent();
            if (RG.isArea(levParent)) {
                const xy = levParent.findTileXYById(level.getID());
                const area = levParent as Area;
                if (xy) {
                    const [ax, ay] = xy;
                    const tile: AreaTile = area.getTiles()[ax][ay] as AreaTile;
                    const eventArgs = {
                        areaTile: tile, level, cell,
                        zoneConf: {
                            zoneType: 'wilderness',
                        },
                    };
                    this.pool.emitEvent(RG.EVT_CREATE_ZONE, eventArgs);
                }
            }
            else {
                RG.gameMsg({cell, msg: 'No stairs or connection in cell'});
            }
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
        const effArgs = useItemComp.getEffect();

        if (item.has('Broken')) {
          const msg = `${item.getName()} cannot be used because it is broken`;
          RG.gameMsg({cell: ent.getCell(), msg});
          return;
        }

        // We can apply to use without effArgs only
        if (!effArgs) {
            RG.reduceCountOrCharge(item, ent, this.pool);
            this._checkUseItemMsgEmit(ent, useItemComp);
        }
        else if (effArgs) {
            const effComp = new Component.Effects(effArgs);
            effComp.setItem(item);
            console.log('Added Effects comp with args', effArgs, ent.getName());
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
            return Element.canJumpOver(cell.getBaseElem().getType());
        };
        const path = Path.getShortestActorPath(map, x0, y0, x1, y1,
            jumpPathCb);
        // TODO Verify that path is direct path
        if (path.length === jumpRange) {
            const movComp = new Component.Movement(x1, y1, ent.getLevel());
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
            const qEvent = new Component.QuestTargetEvent();
            qEvent.setEventType('read');
            qEvent.setTargetComp(readTarget.get('QuestTarget'));
            ent.add(qEvent);
        }
    }

    private _handleRest(ent): void {
        const cell = ent.getCell();
        const baseElem = cell.getBaseElem();
        // TODO Check if entity is on bed element
        // and that there are no hostile actors nearby
        if (baseElem.getType() === 'bed') {
            const enemies = Brain.getSeenHostiles(ent);
            if (enemies.length === 0) {
                const health = ent.get('Health');
                health.addHP(1);
                const msg = `${ent.getName()} rests for a while in bed`;
                RG.gameMsg({cell, msg});
            }
            else {
                const msg = `${ent.getName()} cannot rest with enemies around`;
                RG.gameMsg({cell, msg});
            }
        }
        else {
            const msg = `${ent.getName()} seems to be resting.`;
            RG.gameMsg({cell, msg});
        }
    }

    /* Used to create events in response to specific actions. */
    private _createEventComp(ent, args): void {
        const evtComp = new Component.Event();
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

