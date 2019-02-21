
import RG from './rg';
import {FromJSON} from './game.fromjson';

interface Storage {
    setItem: (key: string, data: string) => void;
    getItem: (key: string) => string;
}

/* An object for saving the game in specified storage (local/etc..) or restoring
* the game from saved format. GUI should use this object. */
export class GameSave {
    private _storageRef: Storage;
    private _dungeonLevel: number;
    // Contains names of players for restore selection
    private _playerList: string;

    constructor() {
        this._storageRef = null;
        this._dungeonLevel = null;
        // Contains names of players for restore selection
        this._playerList = '_battles_player_data_';
    }

    setStorage(stor: Storage) {this._storageRef = stor;}

    getDungeonLevel(): number {return this._dungeonLevel;}

    /* Main function which saves the full game.*/
    save(game, conf): void {
        this.savePlayer(game, conf);
    }

    /* Restores game/player with the given name.*/
    restore(name): any {
        if (!RG.isNullOrUndef([name])) {
            const game = this.restorePlayer(name);
            return game;
        }
        else {
            RG.err('GameSave', 'restore', 'No name given (or null/undef).');
        }
        return null;
    }

    /* Returns a list of saved players.*/
    getPlayersAsList(): string[] {
        const dbObj = this.getPlayersAsObj();
        if (dbObj !== null) {
            return Object.keys(dbObj).map((val) => dbObj[val]);
        }
        else {
            return [];
        }
    }

    /* Returns an object containing the saved players.*/
    getPlayersAsObj() {
        this._checkStorageValid();
        const dbString = this._storageRef.getItem(this._playerList);
        return JSON.parse(dbString);
    }

    /* Deletes given player from the list of save games.*/
    deletePlayer(name) {
        this._checkStorageValid();
        let dbString = this._storageRef.getItem(this._playerList);
        const dbObj = JSON.parse(dbString);
        if (dbObj.hasOwnProperty(name)) {
            delete dbObj[name];
        }
        dbString = JSON.stringify(dbObj);
        this._storageRef.setItem(this._playerList, dbString);
    }

    /* Saves a player object. */
    savePlayer(game, conf) {
        this._checkStorageValid();
        const player = game.getPlayer();
        if (!RG.isNullOrUndef([player])) {
            const name = player.getName();
            this._savePlayerInfo(name, player.toJSON(), conf);
        }
        else {
            RG.err('GameSave', 'savePlayer',
                'Cannot save null player. Forgot game.addPlayer?');
        }
    }

    /* Restores a player with given name. */
    restorePlayer(name) {
        this._checkStorageValid();
        const playersObj = this.getPlayersAsObj();
        if (playersObj.hasOwnProperty(name)) {
            const dbString = this._storageRef.getItem('_battles_player_' + name);
            const dbObj = JSON.parse(dbString);
            const fromJSON = new FromJSON();
            const game = fromJSON.createGame(dbObj.game);
            this._dungeonLevel = fromJSON.getDungeonLevel();
            return game;
        }
        else {
            RG.err('GameSave', 'restorePlayer',
                'No player |' + name + '| found from the list.');
            return null;
        }
    }

    /* Saves name and level of the player into a list of players/save games.*/
    _savePlayerInfo(name, obj, conf) {
        let dbString = this._storageRef.getItem(this._playerList);
        let dbObj = JSON.parse(dbString);
        if (dbObj === null) {dbObj = {};}
        const expComp: any = Object.values(obj.components).find(
            (c: any) => c.setType === 'Experience');
        dbObj[name] = {
            name,
            expLevel: expComp.setExpLevel,
            dungeonLevel: obj.dungeonLevel
        };
        // Capture also game config settings (cols,rows,loot etc)
        for (const p in conf) {
            if (p) {dbObj[name][p] = conf[p];}
        }
        dbString = JSON.stringify(dbObj);
        this._storageRef.setItem(this._playerList, dbString);
    }

    _checkStorageValid() {
        if (RG.isNullOrUndef([this._storageRef])) {
            throw new Error('GameSave you must setStorage() first.');
        }
    }

}
