
import RG from './rg';
import {TCoord, ZoneConf} from './interfaces';
import {Lore, createLoreObj, formatMsg} from '../data/lore';
import {Random} from './random';

const dbg = require('debug');
const debug = dbg('bitn:ow-lore');

const RNG = Random.getRNG();

/* This class is used to create the lore information required to create the
 * corresponding components. It also extracts surrounding zones for given zone,
 * to create the lore info.
 */
export class OWLore {

    // Indicates that x,y knows about [[x0, y0] ... [xN, yN]]
    public hasInfoAbout: {[key: string]: TCoord[]};

    // Indicates that x,y is known to [[x0, y0] ... [xN, yN]]
    public isKnownBy: {[key: string]: TCoord[]};

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
        const zonesByXY = Object.keys(this.zonesByXY);
        zonesByXY.forEach((key: string) => {
            const zones: ZoneConf[] = this.zonesByXY[key];
            const xy = this.toCoord(key);
            if (!this.hasInfoAboutXY(xy)) {return;}

            zones.forEach((knowerZone: ZoneConf) => {
                let knownXY: TCoord[] = this.hasInfoAbout[key];

                // NOTE: This loop has perf issue, if all coords are iterated
                // through
                knownXY = [RNG.arrayGetRand(knownXY)];

                knownXY.forEach((c: TCoord) => {
                    const rXY = c;
                    const zoneList: ZoneConf[] = this.zonesByXY[this.getKey(rXY)];
                    if (!zoneList) {return;}

                    zoneList.forEach((sz: ZoneConf) => {
                        const knownZone: ZoneConf = sz;
                        const dir = RG.getTextualDir(rXY, xy);
                        const msg = this.formatRespMsg(dir, knownZone);
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

            });

            // Add info to cities about these zones (if they are non-cities)
            zones.forEach((knownZone: ZoneConf) => {
                const isEpic = knownZone.isEpic;
                let knowers = this.isKnownBy[key];
                if (knowers.length > 2) {
                    knowers = [RNG.arrayGetRand(knowers), RNG.arrayGetRand(knowers)];
                }

                knowers.forEach((c: TCoord) => {
                    const keyXY = this.getKey(c);
                    const zoneList: ZoneConf[] = this.zonesByXY[keyXY];
                    if (!zoneList) {return;}

                    zoneList.forEach((sz: ZoneConf) => {
                        const knowerZone: ZoneConf = sz;
                        const dir = RG.getTextualDir(xy, c);
                        let msg = this.formatRespMsg(dir, knownZone);
                        if (isEpic) {
                            msg += ' They say a great adventure awaits there.';
                        }
                        const metaData = this.getZoneMeta(knownZone);
                        const loreObj = createLoreObj(msg, 'location', metaData);

                        // console.log('Adding loreObj', loreObj, 'to ZoneConf ' + sz.name);

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
            });

        });
        debug(`buildLore END. ${this.nAddedCompsTo}/${this.nZones} zones have addComp`);
    }


    public formatRespMsg(dir: string, zoneConf: ZoneConf): string {
        // const choices: ILoreEntry = Lore.getRand('typesDirections');
        // const templ: string = RNG.arrayGetRand(choices.text);
        const templ: string = Lore.getRandText('typesDirections');
        const namePre = this.getNamePre(zoneConf);
        const namePost = this.getNamePost(zoneConf);
        return formatMsg(templ, {dir, name: zoneConf.name, namePre, namePost});
    }

    public getNamePre(zoneConf: ZoneConf): string {
        return zoneConf.isEpic ? 'an ancient place called ' : '';
    }

    public getNamePost(zoneConf: ZoneConf): string {
        return RG.isSuccess(0.05) ? ' where shadows lie' : '';
    }

    public debugPrint(): void {
        debug.enabled = true; // Don't remove
        debug(this.zonesByXY);
        debug.enabled = false; // Don't remove
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
