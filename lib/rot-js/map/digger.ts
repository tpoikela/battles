import { CreateCallback } from './map';
import Dungeon from './dungeon';
import { Room, Corridor, FeatureConstructor } from './features';

import RNG from '../rng';
import { DIRS } from '../constants';

type FeatureType = 'room' | 'corridor';
const FEATURES = {
    'room': Room,
    'corridor': Corridor
}

interface Options {
    roomWidth: [number, number];
    roomHeight: [number, number];
    corridorLength: [number, number];
    dugPercentage: number;
    timeLimit: number
}

/**
 * Random dungeon generator using human-like digging patterns.
 * Heavily based on Mike Anderson's ideas from the "Tyrant" algo, mentioned at
 * http://www.roguebasin.roguelikedevelopment.org/index.php?title=Dungeon-Building_Algorithm.
 */
export default class Digger extends Dungeon {
    _options: Options;
    _featureAttempts: number;
    _map: number[][];
    _walls: { [key:string]: number };
    _dug: number;
    _features: { [key:string]: number };
    _startRoom: Room;
    _extraRooms: Room[];

    constructor(width: number, height: number, options: Partial<Options> = {}) {
        super(width, height);

        this._options = Object.assign({
            roomWidth: [3, 9], /* room minimum and maximum width */
            roomHeight: [3, 5], /* room minimum and maximum height */
            corridorLength: [3, 10], /* corridor minimum and maximum length */
            dugPercentage: 0.2, /* we stop after this percentage of level area has been dug out */
            timeLimit: 1000 /* we stop after this much time has passed (msec) */
        }, options);

        this._features = {
            'room': 4,
            'corridor': 4
        };
        this._map = [];
        this._featureAttempts = 20; /* how many times do we try to create a feature on a suitable wall */
        this._walls = {}; /* these are available for digging */
        this._dug = 0;

        this._digCallback = this._digCallback.bind(this);
        this._canBeDugCallback = this._canBeDugCallback.bind(this);
        this._isWallCallback = this._isWallCallback.bind(this);
        this._priorityWallCallback = this._priorityWallCallback.bind(this);
    }

    startRoom(room: Room) {
        this._startRoom = room;
    }

    addRoom(room: Room) {
        if (!this._startRoom) {
            this._startRoom = room;
        }
        else {
            if (!this._extraRooms) {this._extraRooms = [];}
            this._extraRooms.push(room);
        }
    }

    create(callback?: CreateCallback) {
        this._rooms = [];
        this._corridors = [];
        this._map = this._fillMap(1);
        this._walls = {};
        this._dug = 0;
        const area = (this._width-2) * (this._height-2);

        this._firstRoom();

        const t1 = Date.now();

        let priorityWalls;
        do {
            priorityWalls = 0;
            const t2 = Date.now();
            if (t2 - t1 > this._options.timeLimit) { break; }

            /* find a good wall */
            const wall = this._findWall();
            if (!wall) { break; } /* no more walls */

            const parts = wall.split(',');
            const x = parseInt(parts[0]);
            const y = parseInt(parts[1]);
            const dir = this._getDiggingDirection(x, y);
            if (!dir) { continue; } /* this wall is not suitable */

    //		console.log("wall", x, y);

            /* try adding a feature */
            let featureAttempts = 0;
            do {
                featureAttempts++;
                if (this._tryFeature(x, y, dir[0], dir[1])) { /* feature added */
                    //if (this._rooms.length + this._corridors.length == 2) { this._rooms[0].addDoor(x, y); } /* first room oficially has doors */
                    this._removeSurroundingWalls(x, y);
                    this._removeSurroundingWalls(x-dir[0], y-dir[1]);
                    break;
                }
            } while (featureAttempts < this._featureAttempts);

            for (const id in this._walls) {
                if (this._walls[id] > 1) { priorityWalls++; }
            }

        } while (this._dug/area < this._options.dugPercentage || priorityWalls); /* fixme number of priority walls */

        this._addDoors();

        if (callback) {
            for (let i=0;i<this._width;i++) {
                for (let j=0;j<this._height;j++) {
                    callback(i, j, this._map[i][j]);
                }
            }
        }

        this._walls = {};
        this._map = [];

        return this;
    }

    _digCallback(x: number, y: number, value: number) {
        if (value == 0 || value == 2) { /* empty */
            this._map[x][y] = 0;
            this._dug++;
        } else { /* wall */
            this._walls[x+','+y] = 1;
        }
    }

    _isWallCallback(x: number, y: number) {
        if (x < 0 || y < 0 || x >= this._width || y >= this._height) { return false; }
        return (this._map[x][y] == 1);
    }

    _canBeDugCallback(x: number, y: number) {
        if (x < 1 || y < 1 || x+1 >= this._width || y+1 >= this._height) { return false; }
        return (this._map[x][y] == 1);
    }

    _priorityWallCallback(x: number, y: number) { this._walls[x+','+y] = 2; };

    _firstRoom() {
        let room = this._startRoom;
        if (!room) {
            const cx = Math.floor(this._width/2);
            const cy = Math.floor(this._height/2);
            room = Room.createRandomCenter(cx, cy, this._options);
        }
        this._rooms.push(room);
        room.create(this._digCallback);
        if (this._extraRooms) {
            this._extraRooms.forEach(extraRoom => {
                this._rooms.push(extraRoom);
                extraRoom.create(this._digCallback);
            });
        }
    }

    /**
	 * Get a suitable wall
	 */
    _findWall() {
        const prio1 = [];
        const prio2 = [];
        for (const id in this._walls) {
            const prio = this._walls[id];
            if (prio == 2) {
                prio2.push(id);
            } else {
                prio1.push(id);
            }
        }

        const arr = (prio2.length ? prio2 : prio1);
        if (!arr.length) { return null; } /* no walls :/ */

        const id = RNG.getItem(arr.sort()) as string; // sort to make the order deterministic
        delete this._walls[id];

        return id;
    }

    /**
	 * Tries adding a feature
	 * @returns {bool} was this a successful try?
	 */
    _tryFeature(x: number, y: number, dx: number, dy: number) {
        const featureName = RNG.getWeightedValue(this._features) as FeatureType;
        const ctor = FEATURES[featureName] as FeatureConstructor;
        const feature = ctor.createRandomAt(x, y, dx, dy, this._options);

        if (!feature.isValid(this._isWallCallback, this._canBeDugCallback)) {
    //		console.log("not valid");
    //		feature.debug();
            return false;
        }

        feature.create(this._digCallback);
    //	feature.debug();

        if (feature instanceof Room) { this._rooms.push(feature); }
        if (feature instanceof Corridor) {
            feature.createPriorityWalls(this._priorityWallCallback);
            this._corridors.push(feature);
        }

        return true;
    }

    _removeSurroundingWalls(cx: number, cy: number) {
        const deltas = DIRS[4];

        for (let i=0;i<deltas.length;i++) {
            const delta = deltas[i];
            let x = cx + delta[0];
            let y = cy + delta[1];
            delete this._walls[x+','+y];
            x = cx + 2*delta[0];
            y = cy + 2*delta[1];
            delete this._walls[x+','+y];
        }
    }

    /**
	 * Returns vector in "digging" direction, or false, if this does not exist (or is not unique)
	 */
    _getDiggingDirection(cx: number, cy: number) {
        if (cx <= 0 || cy <= 0 || cx >= this._width - 1 || cy >= this._height - 1) { return null; }

        let result = null;
        const deltas = DIRS[4];

        for (let i=0;i<deltas.length;i++) {
            const delta = deltas[i];
            const x = cx + delta[0];
            const y = cy + delta[1];

            if (!this._map[x][y]) { /* there already is another empty neighbor! */
                if (result) { return null; }
                result = delta;
            }
        }

        /* no empty neighbor */
        if (!result) { return null; }

        return [-result[0], -result[1]];
    }

    /**
	 * Find empty spaces surrounding rooms, and apply doors.
	 */
    _addDoors() {
        const data = this._map;
        function isWallCallback(x: number, y: number) {
            return (data[x][y] == 1);
        };
        for (let i = 0; i < this._rooms.length; i++ ) {
            const room = this._rooms[i];
            room.clearDoors();
            room.addDoors(isWallCallback);
        }
    }
}
