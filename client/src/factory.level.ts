
import RG from './rg';
import {MapGenerator} from './generator';
import {Level} from './level';
import {ElementDoor} from './element';
import * as Verify from './verify';
import {DungeonPopulate} from './dungeon-populate';

type MapObj = import('./generator').MapObj;

export class FactoryLevel {


    public static createLevel(
        type: string, cols: number, rows: number, conf?
    ): Level {
        const factLevel = new FactoryLevel();
        return factLevel.createLevel(type, cols, rows, conf);
    }

    private _verif: Verify.Conf;

    constructor() {
        this._verif = new Verify.Conf('FactoryLevel');
    }

    /* Factory method for creating levels.*/
    public createLevel(levelType: string, cols: number, rows: number, conf?): Level {
        const mapgen = new MapGenerator();
        let mapObj: null | MapObj = null;
        let level: null | Level = null;
        mapgen.setGen(levelType, cols, rows);

        if (levelType === 'empty') {
            mapObj = mapgen.createEmptyMap();
        }
        else if (levelType === 'town') {
            mapObj = mapgen.createTownBSP(cols, rows, conf);
            level = new Level(mapObj.map);
            this.createHouseElements(level, mapObj);
            this.createShops(level, mapObj, conf);
            this.createTrainers(level, conf);
        }
        else if (levelType === 'townwithwall') {
            mapObj = mapgen.createTownWithWall(cols, rows, conf);
            level = new Level(mapObj.map);
            this.createHouseElements(level, mapObj);
            this.createShops(level, mapObj, conf);
            this.createTrainers(level, conf);
        }
        else if (levelType === 'forest') {
            mapObj = mapgen.createForest(conf);
        }
        else if (levelType === 'lakes') {
            mapObj = mapgen.createLakes(conf);
        }
        else if (levelType === 'mountain') {
            mapObj = mapgen.createMountain(cols, rows, conf);
        }
        else if (levelType === 'summit') {
            mapObj = mapgen.createSummit(cols, rows, conf);
        }
        else if (levelType === 'crypt') {
            mapObj = mapgen.createCryptNew(cols, rows, conf);
        }
        else if (levelType === 'cave') {
            mapObj = mapgen.createCave(cols, rows, conf);
        }
        else if (levelType === 'castle') {
            mapObj = mapgen.createCastle(cols, rows, conf);
        }
        else if (levelType === 'wall') {
            mapObj = mapgen.createWall(cols, rows, conf);
        }
        else if (levelType === 'arctic') {
            mapObj = mapgen.createArctic(cols, rows, conf);
        }
        else {
            mapObj = mapgen.getMap();
        }

        if (level === null) {
            if (mapObj) {
                level = new Level(mapObj.map);
            }
            else {
                const msg = JSON.stringify(conf);
                RG.err('FactoryBase', 'createLevel',
                    `mapObj is null. type: ${levelType}. ${msg}`);
            }
        }
        this.setLevelExtras(level!, mapObj);
        return level!;
    }

    public setLevelExtras(level: Level, mapObj: MapObj): void {
        const extras: any = {};
        const possibleExtras = ['rooms', 'corridors', 'vaults', 'houses',
            'paths'];
        possibleExtras.forEach(extra => {
            if (mapObj.hasOwnProperty(extra)) {
                extras[extra] = (mapObj as any)[extra];
            }
        });
        level.setExtras(extras);
    }

    public createHouseElements(level: Level, mapObj: MapObj): void {
        if (mapObj.houses) {
            const houses = mapObj.houses;
            for (let i = 0; i < houses.length; i++) {
                const doorXY = houses[i].door;
                const door = new ElementDoor(true);
                level.addElement(door, doorXY[0], doorXY[1]);
            }
        }
    }

    /* Creates a shop and a shopkeeper into a random house in the given level.
     * Level should already contain empty houses where the shop is created at
     * random. */
    public createShops(level: Level, mapObj: MapObj, conf): void {
        this._verif.verifyConf('createShops', conf, ['nShops']);
        const dungPopul = new DungeonPopulate();
        level.addExtras('houses', mapObj.houses);
        dungPopul.createShops(level, conf);
    }
    /* Creates trainers for the given level. */
    public createTrainers(level: Level, conf): void {
        const dungPopul = new DungeonPopulate();
        dungPopul.createTrainers(level, conf);
    }

}
