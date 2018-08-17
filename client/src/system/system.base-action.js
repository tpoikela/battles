
const RG = require('../rg');

const System = {};
System.Base = require('./system.base');

/* Processes entities with attack-related components.*/
System.BaseAction = function(compTypes) {
    System.Base.call(this, RG.SYS.BASE_ACTION, compTypes);
    this.compTypesAny = true;

    const handledComps = [
        'Pickup', 'UseStairs', 'OpenDoor', 'UseItem', 'UseElement',
        'Jump'
    ];

    this.updateEntity = function(ent) {
        handledComps.forEach(compType => {
            if (ent.has(compType)) {
                this._dtable[compType](ent);
                ent.remove(compType);
            }
        });
    };

    /* Handles pickup command. */
    this._handlePickup = ent => {
        const [x, y] = [ent.getX(), ent.getY()];
        const level = ent.getLevel();
        // TODO move logic from level to here, need access to the picked up item
        level.pickupItem(ent, x, y);
        const evtArgs = {
            type: RG.EVT_ITEM_PICKED_UP
        };
        this._createEventComp(ent, evtArgs);
    };

    /* Handles command when actor uses stairs. */
    this._handleUseStairs = ent => {
        const level = ent.getLevel();
        const cell = ent.getCell();
        // Check if any actors should follow the player
        const actorsAround = RG.Brain.getActorsAround(ent);

        if (level.useStairs(ent)) {
            if (ent.isPlayer()) {ent.getBrain().addMark();}

            if (actorsAround.length > 0) {
                const newLevel = ent.getLevel();
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
    };

    /* Handles command to open door and execute possible triggers like traps. */
    this._handleOpenDoor = ent => {
        const door = ent.get('OpenDoor').getDoor();
        const [x, y] = door.getXY();
        const level = ent.getLevel();
        const cell = level.getCell(x, y);
        let msg = '';
        const entName = ent.getName();

        if (door.canToggle()) {
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
    };

    this._handleUseItem = ent => {
        const useItemComp = ent.get('UseItem');
        const item = useItemComp.getItem();
        if (item.has('OneShot')) {
            if (item.count === 1) {
                const msg = {item};
                RG.POOL.emitEvent(RG.EVT_DESTROY_ITEM, msg);
            }
            else {
                item.count -= 1;
            }
        }
        else if (item.getCharges && item.getCharges() > 0) {
            item.setCharges(item.getCharges() - 1);
        }
        this._checkUseItemMsgEmit(ent, useItemComp);
    };

    this._handleUseElement = ent => {
        const useComp = ent.get('UseElement');
        const elem = useComp.getElement();
        if (elem.onUse) { // Just assume it's a function, what else can it be?
            elem.onUse(ent);
        }
        this._checkUseElementMsgEmit(ent, useComp);
    };

    this._handleJump = ent => {
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
    };

    // Initialisation of dispatch table for handler functions
    this._dtable = {
        Pickup: this._handlePickup,
        UseStairs: this._handleUseStairs,
        OpenDoor: this._handleOpenDoor,
        UseItem: this._handleUseItem,
        UseElement: this._handleUseElement,
        Jump: this._handleJump
    };

    /* Used to create events in response to specific actions. */
    this._createEventComp = (ent, args) => {
        const evtComp = new RG.Component.Event();
        evtComp.setArgs(args);
        ent.add(evtComp);
    };

    this._checkUseItemMsgEmit = (ent, comp) => {
        if (comp.getUseType() === RG.USE.DRINK) {
            const item = comp.getItem();
            const target = comp.getTarget();
            const cell = target.getCell();
            const msg = target.getName() + ' drinks '
                + item.getName();
            RG.gameMsg({cell, msg});
        }
    };

    this._checkUseElementMsgEmit = (ent, comp) => {
        if (comp.getUseType() === RG.USE.LEVER) {
            const cell = ent.getCell();
            const name = ent.getName();
            const msg = `${name} toggles the lever`;
            RG.gameMsg({cell, msg});
        }
    };
};
RG.extend2(System.BaseAction, System.Base);

module.exports = System.BaseAction;
