
import RG from '../src/rg';
import {Level} from '../src/level';
import {FactoryLevel} from '../src/factory.level';
import {ObjectShell} from '../src/objectshellparser';
import {color} from '../data/shell-utils';


export class ColorTestScreen {

    public static getConf(): any {
        return {
            colorMode: false,
            char: '#',
            propType: RG.TYPE_ITEM,
        };
    }

    public level: Level;

    constructor(conf) {
        let nsize = 200;
        if (conf.colorMode) {
            nsize = RG.COLORS.length + 10;
        }
        const factLevel = new FactoryLevel();
        this.level = factLevel.createLevel('empty', nsize, nsize);
        this.level.actorWarnLimit = 100000;

        if (conf.colorMode) {
            this.createColorMap(conf.char);
        }
        else {
            this.createObjectMap(conf.propType);
        }
    }


    public createColorMap(char: string): void {
        const parser = ObjectShell.getParser();
        parser.adjustColorsWhenNeeded = false;
        const cellMap = this.level.getMap();
        RG.COLORS.forEach((cfg: string, y: number) => {
            RG.COLORS.forEach((cbg: string, x: number) => {
                const name = 'colors--fg: ' + cfg + '_bg: ' + cbg;
                const shell = {
                    name, color: color(cfg, cbg),
                    type: 'colortest', char
                }
                parser.parseObjShell(RG.TYPE_ACTOR, shell);
                const actor = parser.createActor(name);
                this.level.addActor(actor, x, y);
            });
        });
        parser.adjustColorsWhenNeeded = true;
    }

    public createObjectMap(propType: string): void {
        const parser = ObjectShell.getParser();
        const cellMap = this.level.getMap();
        for (let x = 0; x < cellMap.cols; x++) {
            for (let y = 0; y < cellMap.rows; y++) {
                if (propType === RG.TYPE_ACTOR) {
                    const obj = parser.createRandomActor({func: () => true});
                    this.level.addActor(obj, x, y);
                }
                else {
                    const obj = parser.createRandomItem({func: () => true});
                    this.level.addItem(obj, x, y);
                }
            }
        }
    }
}
