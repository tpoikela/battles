/* Code to generate more complex encounters than just a simple monster.
 * Contains also code to place the encounters inside the level in smarter
 * way than randomly.
 * */

type Level = import('./level').Level;
type ZoneBase = import('./world').ZoneBase;

export interface IEncConf {
    name: string;
    danger: number;
}

/* Contains info about generated encounter like actors and placement
 * recommendations. */
export class EncounterData {
}

export class EncounterGen {

    constructor(public level: Level, public conf: IEncConf, public zone?: ZoneBase) {
    }

    public genEncounter(): EncounterData {
        const encData = new EncounterData();
        return encData;
    }

}
