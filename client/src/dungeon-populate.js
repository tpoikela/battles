
const RG = require('./rg.js');
const Geometry = require('./geometry');
const Evaluator = require('./evaluators');
RG.ObjectShell = require('./objectshellparser');

const MIN_ACTORS_ROOM = 2;

const RNG = RG.Random.getRNG();

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
                const center = room.getCenter();
                mainLootAdded = this.addMainLoot(level, center, maxValue);
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
                    const center = room.getCenter();
                    mainLootAdded = this.addMainLoot(level, center, maxValue);
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
        this.addPointGuardian(level, extras.endPoint, maxDanger);
    }
};

DungeonPopulate.prototype.setActorFunc = function(func) {
    this.actorFunc = func;
};

DungeonPopulate.prototype.addPointGuardian = function(level, point, maxDanger) {
    const eXY = point;
    const guardEval = new Evaluator.Guard(RG.BIAS.Guard, eXY);

    const guardian = this.getEndPointGuardian(maxDanger);
    if (guardian) {
        if (guardian.getBrain().getGoal) {
            guardian.getBrain().getGoal().addEvaluator(guardEval);
        }
        level.addActor(guardian, eXY[0], eXY[1]);
    }
    else {
        console.warn('Could not get guardian for endpoint', point);
    }
};

DungeonPopulate.prototype.getEndPointGuardian = function(maxDanger) {
    const parser = RG.ObjectShell.getParser();
    let currDanger = maxDanger;
    let guardian = null;
    let actorFunc = actor => actor.danger <= currDanger;
    if (this.actorFunc) {
        actorFunc = actor => (
            this.actorFunc(actor) && actor.danger <= currDanger
        );
    }
    while (!guardian && currDanger > 0) {
        // TODO add some theming for the guardian
        guardian = parser.createRandomActor({func: actorFunc});
        --currDanger;
    }
    return guardian;
};

DungeonPopulate.prototype.addMainLoot = function(level, center, maxValue) {
    const parser = RG.ObjectShell.getParser();
    const [cx, cy] = center;
    // Add main loot
    // 1. Scale is from 2-4 normal value, this scales the
    // guardian danger as well
    const scaleLoot = RNG.getUniformInt(2, 3);
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

const popOptions = ['NOTHING', 'LOOT', 'GOLD', 'GUARDIAN', 'ELEMENT', 'CORPSE',
    'TIP'];

/* Given level and x,y coordinate, tries to populate that point with content. */
DungeonPopulate.prototype.populatePoint = function(level, point, conf) {
    const {maxDanger} = conf;
    const type = RNG.arrayGetRand(popOptions);
    // const [pX, pY] = point;
    switch (type) {
        case 'NOTHING': break;
        case 'LOOT': this.addLootToPoint(level, point); break;
        case 'GUARDIAN':
            this.addPointGuardian(level, point, maxDanger);
            break;
        case 'ELEMENT': this.addElementToPoint(level, point, conf); break;
        case 'CORPSE': this.addCorpseToPoint(level, point, conf); break;
        case 'GOLD': this.addGoldToPoint(level, point, conf); break;
        case 'TIP': this.addTipToPoint(level, point, conf); break;
        default: break;
    }
};

/* DungeonPopulate.prototype.addActorGroup = function(level, point, conf) {

};*/

/* Adds an element into the given point. */
DungeonPopulate.prototype.addElementToPoint = function(level, point, conf) {
    console.log(level, conf, point);
    // TODO
};

/* Creates a corpse to the given point, and adds some related loot there. */
DungeonPopulate.prototype.addCorpseToPoint = function(level, point, conf) {
    console.log(level, conf, point);
    // TODO
};

DungeonPopulate.prototype.addLootToPoint = function(level, point) {
    const maxValue = this.maxValue;
    const lootTypes = [RG.ITEM_POTION, RG.ITEM_SPIRITGEM, RG.ITEM_AMMUNITION,
        RG.ITEM_POTION, RG.ITEM_RUNE];
    const generatedType = RNG.arrayGetRand(lootTypes);

    const parser = RG.ObjectShell.getParser();
    const lootPrize = parser.createRandomItem(
        {func: item => item.type >= generatedType
            && item.value <= maxValue}
    );
    if (lootPrize) {
        const [cx, cy] = point;
        level.addItem(lootPrize, cx, cy);
        return true;
    }
    return false;
};

DungeonPopulate.prototype.addGoldToPoint = function(level, point) {
    const numCoins = this.maxValue;
    const gold = new RG.Item.GoldCoin();
    gold.setCount(numCoins);
    const [cx, cy] = point;
    level.addItem(gold, cx, cy);
};

/* Adds a tip/hint to the given point. These hints can reveal information
 * about world map etc. */
DungeonPopulate.prototype.addTipToPoint = function(level, point, conf) {
    console.log(level, conf, point);
    // TODO
};

module.exports = DungeonPopulate;
