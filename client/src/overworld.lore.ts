
import RG from './rg';
import {TCoord, ZoneConf} from './interfaces';
import {Lore, createLoreObj, ILoreEntry, format} from '../data/lore';
import {Random} from './random';

const dbg = require('debug');
const debug = dbg('bitn:ow-lore');

const RNG = Random.getRNG();

export class OWLore {

    // Indicates that x,y knows about [[x0, y0] ... [xN, yN]]
    public hasInfoAbout: {[key: string]: TCoord[]};

    // Indicates that x,y is known to [[x0, y0] ... [xN, yN]]
    public isKnownBy: {[key: string]: any[]};

    // Keeps track of visited x,y locations for building
    public xyVisited: {[key: string]: boolean};

    public zonesByXY: {[key: string]: ZoneConf[]};

    public nZones: number;
    public nAddedCompsTo: number;

    constructor() {
        this.hasInfoAbout = {};
        this.isKnownBy = {};
        this.xyVisited = {};
        this.zonesByXY = {};
        this.nZones = 0;
        this.nAddedCompsTo = 0;
    }

    public getKey(coord: TCoord): string {
        return coord[0] + ',' + coord[1];
    }

    public toCoord(cstr: string): TCoord {
        const arr = cstr.split(',');
        return [parseInt(arr[0], 10), parseInt(arr[1], 10)];
    }

    public addVisited(coord: TCoord): void {
        this.xyVisited[this.getKey(coord)] = true;
    }

    public isVisited(coord: TCoord): boolean {
        return this.xyVisited[this.getKey(coord)];
    }

    public addXYKnownBy(xy: TCoord, lXlY: TCoord): void {
        const keyKnown = this.getKey(xy);
        const keyInfoSrc = this.getKey(lXlY);
        if (!this.isKnownBy[keyKnown]) {
            this.isKnownBy[keyKnown] = [];
        }
        this.isKnownBy[keyKnown].push(lXlY);

        if (!this.hasInfoAbout[keyInfoSrc]) {
            this.hasInfoAbout[keyInfoSrc] = [];
        }
        this.hasInfoAbout[keyInfoSrc].push(xy);
    }

    public hasInfoAboutXY(xy: TCoord): boolean {
        return this.hasInfoAbout.hasOwnProperty(this.getKey(xy));
    }

    public addZone(xy: TCoord, zoneConf: ZoneConf): void {
        const key = this.getKey(xy);
        if (!this.zonesByXY[key]) {
            this.zonesByXY[key] = [];
        }
        this.zonesByXY[key].push(zoneConf);
        ++this.nZones;
        debug(`addZone ${zoneConf.name} to ${key}, nZones: ${this.nZones}`);
    }

    /* Builds the config for adding Lore components based on zoneConfs, and
     * known relationships between the zones. */
    public buildLore(): void {
        Object.keys(this.zonesByXY).forEach((key: string) => {
            const zones: ZoneConf[] = this.zonesByXY[key];
            const xy = this.toCoord(key);
            if (!this.hasInfoAboutXY(xy)) {return;}

            zones.forEach((knowerZone: ZoneConf) => {
                const knownXY: TCoord[] = this.hasInfoAbout[key];
                const rXY = RNG.arrayGetRand(knownXY);

                const zoneList: ZoneConf[] = this.zonesByXY[this.getKey(rXY)];
                if (!zoneList) {return;}

                const knownZone: ZoneConf = RNG.arrayGetRand(zoneList);
                const dir = RG.getTextualDir(rXY, xy);
                const msg = this.formatMsg(dir, knownZone);
                const metaData = this.getZoneMeta(knownZone);
                const loreObj = createLoreObj(msg, 'sideQuest', metaData);
                if (knowerZone.addComp) {
                    knowerZone.addComp.push(loreObj);
                }
                else {
                    knowerZone.addComp = [loreObj];
                }

                ++this.nAddedCompsTo;

                // TODO something about
                if (debug.enabled) {
                    this.dbg('knowerZone:', knowerZone.name,
                        knowerZone.x, knowerZone.y,
                        JSON.stringify(knowerZone.addComp));
                }
            });

        });
        debug(`buildLore END. ${this.nAddedCompsTo}/${this.nZones} zones have addComp`);
    }


    public formatMsg(dir: string, zoneConf: ZoneConf): string {
        // const choices: ILoreEntry = Lore.getRand('typesDirections');
        // const templ: string = RNG.arrayGetRand(choices.text);
        const templ: string = Lore.getRandText('typesDirections');
        const namePre = this.getNamePre(zoneConf);
        const namePost = this.getNamePost(zoneConf);
        return format(templ, {dir, name: zoneConf.name, namePre, namePost});
    }

    public getNamePre(zoneConf: ZoneConf): string {
        return zoneConf.isEpic ? 'an ancient place called ' : '';
    }

    public getNamePost(zoneConf: ZoneConf): string {
        return RG.isSuccess(0.05) ? ' where shadows lie' : '';
    }

    public debugPrint(): void {
        debug.enabled = true;
        debug(this.zonesByXY);
        debug.enabled = false;
    }

    public getZoneMeta(zone: ZoneConf): object {
        const {name, x, y, levelX, levelY, owX, owY} = zone;
        return {name, x, y, levelX, levelY, owX, owY};
    }

    public toString(): string {
        const res = 'OverWorld Lore:\n';
        return res;
    }

    public dbg(...args: any[]): void {
        debug(...args);
    }
}
