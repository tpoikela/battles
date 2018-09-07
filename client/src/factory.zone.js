
const RG = require('./rg.js');
const debug = require('debug')('bitn:Factory.Zone');
const MountainGenerator = require('./mountain-generator');
const {FactoryItem} = require('./factory.items');
const CityGenerator = require('./city-generator');

const RNG = RG.Random.getRNG();

const ItemConf = function(conf) {
    const req = ['itemsPerLevel', 'maxValue', 'func'];
    req.forEach(prop => {
        if ((prop in conf)) {
            this[prop] = conf[prop];
        }
        else {
            const msg = `${prop} must be given`;
            RG.err('ItemConf', 'new', msg);
        }
    });
};

RG.Factory.Zone = function() {
    RG.Factory.Base.call(this);
    this._verif = new RG.Verify.Conf('Factory.Zone');
    this._parser = RG.ObjectShell.getParser();

    this.getRandLevelType = () => {
        const type = ['uniform', 'rooms', 'rogue', 'digger'];
        const nLevelType = RNG.randIndex(type);
        return type[nLevelType];
    };

    this.addItemsAndActors = function(level, conf) {
        this._verif.verifyConf('addItemsAndActors', conf,
            ['nLevel', 'sqrPerItem', 'sqrPerActor', 'maxValue']);

        const numFree = level.getMap().getFree().length;
        const actorsPerLevel = Math.round(numFree / conf.sqrPerActor);
        const itemsPerLevel = Math.round(numFree / conf.sqrPerItem);
        const goldPerLevel = itemsPerLevel;

        debug(`Adding ${actorsPerLevel} monsters and items ` +
            `${itemsPerLevel} to the level`);

        const getItemConstraintFunc = (min, max) => (
            item => (
                item.value >= min &&
                item.value <= max
            )
        );

        const itemConf = {
            nLevel: conf.nLevel,
            itemsPerLevel,
            func: getItemConstraintFunc(0, conf.maxValue),
            maxValue: conf.maxValue,
            food: true,
            gold: true
        };
        if (conf.hasOwnProperty('food')) {
            itemConf.food = conf.food;
        }
        if (conf.hasOwnProperty('gold')) {
            itemConf.gold = conf.gold;
        }
        if (conf.item) {
            itemConf.func = conf.item;
            debug(`Set itemConf.func to ${conf.item.toString()}`);
        }
        else if (conf.minValue) {
            itemConf.func = getItemConstraintFunc(conf.minValue, conf.maxValue);
        }
        this.addNRandItems(level, this._parser, itemConf);

        const actorConf = {
            actorsPerLevel: conf.actorsPerLevel || actorsPerLevel,
            maxDanger: conf.maxDanger || conf.nLevel + 1
        };
        if (conf.actor) {
            if (typeof conf.actor === 'function') {
                actorConf.func = conf.actor;
            }
            else {
                RG.err('Factory.Zone', 'addItemsAndActors',
                    'conf.actor must be a function');
            }
        }
        this.addNRandActors(level, this._parser, actorConf);

        if (itemConf.gold) {
            const goldConf = {
                goldPerLevel,
                nLevel: conf.nLevel + 1
            };
            this.addRandomGold(level, this._parser, goldConf);
        }
    };

    /* Creates dungeon level. Unless levelType is given, chooses the type
     * randomly. */
    this.createDungeonLevel = function(conf) {
        this._verif.verifyConf('createDungeonLevel', conf, ['x', 'y']);
        let level = null;
        let levelType = this.getRandLevelType();
        if (conf.dungeonType && conf.dungeonType !== '') {
            levelType = conf.dungeonType;
        }
        debug(`dungeonLevel: ${levelType}, ${JSON.stringify(conf)}`);
        level = this.createLevel(levelType, conf.x, conf.y, conf);
        this.addItemsAndActors(level, conf);
        this.addExtraDungeonFeatures(level, conf);
        return level;
    };


    this.createMountainLevel = function(conf) {
        let mountConf = Object.assign(MountainGenerator.getFaceOptions(),
            {
                maxValue: 100,
                sqrPerActor: 50,
                sqrPerItem: 200,
                nLevel: 4
            }
        );
        mountConf = Object.assign(mountConf, conf);
        debug(`Creating mountain level with ${conf}`);
        const mountGen = new MountainGenerator();
        const mountainLevel = mountGen.createFace(conf.x, conf.y,
            mountConf);
        /* const mountainLevel = this.createLevel('mountain',
            conf.x, conf.y, mountConf);*/
        this.addItemsAndActors(mountainLevel, mountConf);
        return mountainLevel;
    };

    this.createSummitLevel = function(conf) {
        this._verif.verifyConf('createSummitLevel', conf, ['cols', 'rows']);
        let summitConf = {
            maxValue: 100,
            sqrPerActor: 20,
            sqrPerItem: 200,
            nLevel: 4
        };
        summitConf = Object.assign(summitConf, conf);

        const mountGen = new MountainGenerator();
        const summitLevel = mountGen.createSummit(conf.cols, conf.rows,
            summitConf);
        debug(`Creating summit level with ${conf}`);
        this.addItemsAndActors(summitLevel, summitConf);
        if (!conf.maxValue) {conf.maxValue = summitConf.maxValue;}
        return summitLevel;
    };

    //---------------------------
    // CITY LEVELS
    //---------------------------

    /* Called for each nLevels of city quarter. Delegates the task to other
    * functions based on the type of city and quarter. */
    this.createCityLevel = function(nLevel, conf) {
        const levelConf = RG.Factory.cityConfBase(conf);
        levelConf.parser = this._parser;
        let cityLevel = null;

        const {x, y} = conf;
        if (levelConf.groupType) {
            switch (levelConf.groupType) {
                case 'village': {
                    cityLevel = this.createVillageLevel(x, y, levelConf);
                    break;
                }
                case 'capital': {
                    cityLevel = this.createCapitalLevel(
                        nLevel, x, y, levelConf);
                    break;
                }
                case 'stronghold': {
                    cityLevel = this.createStrongholdLevel(x, y, levelConf);
                    break;
                }
                case 'fort': {
                    cityLevel = this.createFortLevel(x, y, levelConf);
                    break;
                }
                default: {
                    break;
                }
            }
        }

        // Fall back to the default method
        if (cityLevel === null) {
            cityLevel = this.createLevel('town', x, y, levelConf);
        }

        if (conf.friendly) {
            const actors = cityLevel.getActors();
            actors.forEach(actor => {
                if (!actor.has('NonSentient')) {
                    actor.getBrain().getMemory().removeEnemyType('player');
                }
            });
        }

        return cityLevel;
    };

    this.createVillageLevel = function(cols, rows, levelConf) {
        levelConf.levelType = 'empty';
        levelConf.wallType = 'wooden';
        // const level = this.createLevel('town', cols, rows, levelConf);
        if (!levelConf.actorsPerLevel) {
            levelConf.actorsPerLevel = 30;
        }
        if (!levelConf.maxDanger) {
            levelConf.maxDanger = 3;
        }
        if (!levelConf.itemsPerLevel) {
            levelConf.itemsPerLevel = levelConf.maxDanger * 2;
        }
        const cityGen = new CityGenerator();
        const level = cityGen.create(cols, rows, levelConf);
        this.populateCityLevel(level, levelConf);
        this.addItemsToCityLevel(level, levelConf);
        return level;
    };

    this.createFortLevel = function(cols, rows, levelConf) {
        levelConf.levelType = 'miner';
        const level = this.createLevel('town', 100, 84, levelConf);
        this.populateCityLevel(level, levelConf);
        return level;
    };

    this.createCapitalLevel = function(nLevel, cols, rows, levelConf) {
        levelConf.levelType = 'miner';
        let level = null;
        if (nLevel === 0) {
            levelConf.levelType = 'townwithwall';
            level = this.createLevel('townwithwall', 200, 84, levelConf);
        }
        else {
            level = this.createLevel('town', 100, 84, levelConf);
        }
        this.populateCityLevel(level, levelConf);
        return level;
    };

    this.createStrongholdLevel = function(cols, rows, levelConf) {
        levelConf.levelType = 'miner';
        const level = this.createLevel('town', 100, 84, levelConf);
        this.populateCityLevel(level, levelConf);
        return level;
    };

    this.populateCityLevel = function(level, levelConf) {
        let alignment = levelConf.alignment;
        if (!alignment) {
            alignment = RNG.arrayGetRand(RG.ALIGNMENTS);
        }

        if (!levelConf.actor) {
            if (alignment === RG.ALIGN_GOOD) {
                this.populateWithHumans(level, levelConf);
            }
            else if (alignment === RG.ALIGN_EVIL) {
                this.populateWithEvil(level, levelConf);
            }
            else {
                this.populateWithNeutral(level, levelConf);
            }
        }
        else {
            this.populateWithActors(level, levelConf);
        }
    };

    /* Adds items to the city level in a reasonable way. */
    this.addItemsToCityLevel = function(level, levelConf) {
        const map = level.getMap();
        const floorCells = map.getCells(cell => (
            cell.getBaseElem().getType() === 'floorhouse'
        ));
        const factItem = new FactoryItem();
        const parser = RG.ObjectShell.getParser();
        const itemConf = {
            func: item => item.value <= (levelConf.maxDanger * 10),
            maxValue: levelConf.maxDanger * 50
        };
        if (!RG.isNullOrUndef([levelConf.itemsPerLevel])) {
            itemConf.itemsPerLevel = levelConf.itemsPerLevel;
        }

        factItem.addItemsToCells(level, parser, floorCells, itemConf);
    };

    this.populateWithActors = function(level, levelConf) {
        console.log('Factory populateWithActors now');
        const actorConf = {
            actorsPerLevel: levelConf.actorsPerLevel || 100,
            maxDanger: levelConf.maxDanger || 10,
            func: levelConf.actor
        };
        const nAdded = this.addNRandActors(level, this._parser, actorConf);
        if (nAdded === 0) {
            const parent = level.getParent();
            let msg = 'No actors added to level.';
            if (parent) {
                msg += ' Level parent: ' + parent.getName();
            }
            RG.err('Factory', 'populateWithActors', msg);
        }
    };

    this.populateWithHumans = function(level, levelConf) {
        const actorConf = {
            actorsPerLevel: levelConf.actorsPerLevel || 100,
            maxDanger: levelConf.maxDanger || 10,
            func: actor => (
                actor.type === 'human' &&
                actor.name !== 'shopkeeper'
            )
        };
        if (levelConf.func) {actorConf.func = levelConf.func;}
        this.addNRandActors(level, this._parser, actorConf);
    };

    this.populateWithEvil = function(level, levelConf) {
        let allOK = false;
        while (!allOK) {
            const raceType = RNG.arrayGetRand(RG.EVIL_RACES);
            const actorConf = {
                actorsPerLevel: levelConf.actorsPerLevel || 100,
                maxDanger: levelConf.maxDanger || 10,
                func: actor => (
                    actor.type === raceType
                )
            };
            if (levelConf.func) {actorConf.func = levelConf.func;}
            allOK = this.addNRandActors(level, this._parser, actorConf);
        }
    };

    this.populateWithNeutral = function(level, levelConf) {
        const raceType = RNG.arrayGetRand(RG.NEUTRAL_RACES);
        const actorConf = {
            actorsPerLevel: levelConf.actorsPerLevel || 100,
            maxDanger: levelConf.maxDanger || 10,
            func: actor => (
                actor.type === raceType
            )
        };
        if (levelConf.func) {actorConf.func = levelConf.func;}
        this.addNRandActors(level, this._parser, actorConf);
    };

    this.addActorToLevel = (actorName, level) => {
        const actor = this._parser.createActor(actorName);
        const cell = level.getFreeRandCell();
        level.addActor(actor, cell.getX(), cell.getY());
    };

    /* Adds some special features to dungeon levels to make them more
     * interestings. */
    this.addExtraDungeonFeatures = (level, conf) => {
        const extras = level.getExtras();
        if (extras.rooms) {
            extras.rooms.forEach(room => {
                room.getDoors((x, y) => {
                    level.addElement(new RG.Element.Door(), x, y);
                });
            });

            const room = RNG.arrayGetRand(extras.rooms);
            const bbox = room.getBbox();
            this.addActorsToBbox(level, bbox, conf);
        }
    };

    this.addActorsToBbox = (level, bbox, conf) => {
        const nActors = conf.nActors || 4;
        const {maxDanger, func} = conf;
        const actors = this.generateNActors(nActors, func, maxDanger);
        const freeCells = level.getMap().getFreeInBbox(bbox);
        if (freeCells.length < nActors) {
            RG.warn('Factory.Zone', 'addActorsToBbox',
                'Not enough free cells');
        }
        RG.Factory.addPropsToCells(level, freeCells, actors, RG.TYPE_ACTOR);
    };

    /* Adds N items to the given level in bounding box coordinates. */
    this.addItemsToBbox = (level, bbox, conf) => {
        const nItems = conf.nItems || 4;
        let itemConf = Object.assign({itemsPerLevel: nItems}, conf);
        itemConf = new ItemConf(itemConf);
        const freeCells = level.getMap().getFreeInBbox(bbox);
        const itemFact = new FactoryItem();
        const items = itemFact.generateItems(this._parser, itemConf);
        RG.Factory.addPropsToCells(level, freeCells, items, RG.TYPE_ITEM);
    };

};
RG.extend2(RG.Factory.Zone, RG.Factory.Base);

module.exports = RG.Factory.Zone;
