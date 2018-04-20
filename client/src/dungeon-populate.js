
const RG = require('./rg.js');
const Geometry = require('./geometry');
const Evaluator = require('./evaluators');

const MIN_ACTORS_ROOM = 2;

const DungeonPopulate = function(conf) {
    this.theme = conf.theme;

    this.maxDanger = conf.maxDanger || 5;
    this.maxValue = conf.maxValue || 50;
};

/* Populates the level with actors and items. Some potential features to use
* here in extras:
*   1. startPoint: No monsters spawn in vicinity
*   2. terms: Good items, tough monsters
*   3. bigRooms: spawn depending on theme
*   4. Critical path: Gold coins?
*/
DungeonPopulate.prototype.populateLevel = function(level) {
    const extras = level.getExtras();
    const maxDanger = this.maxDanger;
    const factZone = new RG.Factory.Zone();
    const maxValue = this.maxValue;

    let mainLootAdded = false;
    const roomsDone = {}; // Keep track of finished rooms

    if (extras.bigRooms) {
        extras.bigRooms.forEach(bigRoom => {
            const {room, type} = bigRoom;
            const bbox = room.getBbox();
            const areaSize = room.getAreaSize();
            const actorConf = {
                maxDanger,
                func: actor => actor.danger <= maxDanger + 2
            };
            if (/cross/.test(type)) {
                // Cross has lower density as its huge
                actorConf.nActors = Math.floor(areaSize / 6);
                factZone.addActorsToBbox(level, bbox, actorConf);
            }
            else {
                actorConf.nActors = Math.floor(areaSize / 3);
                factZone.addActorsToBbox(level, bbox, actorConf);
            }

            // Add main loot
            if (!mainLootAdded) {
                mainLootAdded = this.addMainLoot(level, room, maxValue);
            }

            roomsDone[room.getID()] = true;
        });
    }

    // Add something nasty into terminal room
    // Some possible design patterns:
    //   1. Stairs + guardian
    //   2. Guardian + strong item
    //   3. Special feature
    //   4. Pack or group of actors
    if (extras.terms) {
        extras.terms.forEach(room => {
            // Don't populate stairs Up room
            if (!room.hasStairsUp()) {
                const bbox = room.getBbox();

                if (!mainLootAdded) {
                    mainLootAdded = this.addMainLoot(level, room, maxValue);
                }

                // Add optional, less potent loot stuff
                const areaSize = room.getAreaSize();
                const nItems = Math.ceil(areaSize / 10);
                const itemConf = {maxValue, itemsPerLevel: nItems,
                    func: item => item.value <= maxValue
                };
                factZone.addItemsToBbox(level, bbox, itemConf);

                const coord = Geometry.getCoordBbox(bbox);
                coord.forEach(xy => {
                    const enemy = new RG.Element.Marker('e');
                    enemy.setTag('enemy');
                    level.addElement(enemy, xy[0], xy[1]);
                });
            }
            roomsDone[room.getID()] = true;
        });
    }

    // Process rest of the rooms
    if (extras.rooms) {
        extras.rooms.forEach(room => {
            const bbox = room.getBbox();
            const areaSize = room.getAreaSize();

            // Add actors into the room
            const actorConf = {
                maxDanger,
                func: actor => actor.danger <= maxDanger
            };
            actorConf.nActors = Math.floor(areaSize / 6);
            if (actorConf.nActors < MIN_ACTORS_ROOM) {
                actorConf.nActors = MIN_ACTORS_ROOM;
            }
            factZone.addActorsToBbox(level, bbox, actorConf);

            // Add items into the room
            const nItems = Math.ceil(areaSize / 20);
            const itemConf = {maxValue, itemsPerLevel: nItems,
                func: item => item.value <= maxValue
            };
            factZone.addItemsToBbox(level, bbox, itemConf);

            roomsDone[room.getID()] = true;
        });
    }

    // Add an endpoint guardian
    if (extras.endPoint) {
        const eXY = extras.endPoint;
        const guardEval = new Evaluator.Guard(RG.BIAS.Guard, eXY);

        const guardian = this.getEndPointGuardian(maxDanger);
        if (guardian) {
            if (guardian.getBrain().getGoal) {
                guardian.getBrain().getGoal().addEvaluator(guardEval);
            }
            level.addActor(guardian, eXY[0], eXY[1]);
        }
    }

};

DungeonPopulate.prototype.getEndPointGuardian = function(maxDanger) {
    const parser = RG.ObjectShell.getParser();
    let currDanger = maxDanger + 1;
    let guardian = null;
    const actorFunc = actor => actor.danger <= currDanger;
    while (!guardian && currDanger > 0) {
        // TODO add some theming for the guardian
        guardian = parser.createRandomActor({func: actorFunc});
        --currDanger;
    }
    return guardian;
};

DungeonPopulate.prototype.addMainLoot = function(level, room, maxValue) {
    const parser = RG.ObjectShell.getParser();
    const [cx, cy] = room.getCenter();
    // Add main loot
    // 1. Scale is from 2-4 normal value, this scales the
    // guardian danger as well
    const scaleLoot = RG.RAND.getUniformInt(2, 3);
    const maxPrizeValue = scaleLoot * maxValue;
    const minPrizeValue = (scaleLoot - 1) * maxValue;
    const lootPrize = parser.createRandomItem(
        {func: item => item.value >= minPrizeValue
            && item.value <= maxPrizeValue}
    );
    if (lootPrize) {
        level.addItem(lootPrize, cx, cy);
        return true;
    }
    return false;
};

module.exports = DungeonPopulate;
