import Map from './map';
import { Room, Corridor } from './features';
// import createGraph from 'ngraph.graph';
const createGraph = require('ngraph.graph');
import ug, {Graph} from 'ug-ts';

export interface Options {
    roomWidth: [number, number];
    roomHeight: [number, number];
    timeLimit: number
    corridorLength: [number, number];
    dugPercentage?: number;
    roomDugPercentage?: number;
}

/**
 * @class Dungeon map: has rooms and corridors
 * @augments ROT.Map
 */
export default abstract class Dungeon extends Map {
    _options: Options;
    _rooms: Room[];
    _corridors: Corridor[];
    _startRoom: Room;
    _extraRooms: Room[];
    _map: number[][];
    // _digCallback: (x:number, y:number, value: number) => void;


    _ngraph: any;
    _ugraph: Graph;

    constructor(width: number, height: number) {
        super(width, height);
        this._rooms = [];
        this._corridors = [];
        this._ngraph = createGraph();
        this._ugraph = new Graph();
        this._digCallback = this._digCallback.bind(this);
    }

    startRoom(room: Room) {
        this._startRoom = room;
    }

    _digCallback(x: number, y: number, value: number) {
        throw Error('_digCallback must be done in derived class');
    }

    /* Places/carves first room, and extraRooms added with that. */
    _firstRoom(): void {
        let room = this._startRoom;
        if (!room) {
            const cx = Math.floor(this._width/2);
            const cy = Math.floor(this._height/2);
            room = Room.createRandomCenter(cx, cy, this._options);
        }
        // this._rooms.push(room);
        this._addRoom(room);
        room.create(this._digCallback);
        if (this._extraRooms) {
            this._extraRooms.forEach(extraRoom => {
                // this._rooms.push(extraRoom);
                this._addRoom(room);
                extraRoom.create(this._digCallback);
            });
        }
    }

    _addRoom(room: Room): void {
        this._rooms.push(room);
        this._ngraph.addNode(room.getName(), room);
        this._ugraph.createNode(room.getName(), room);
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

    /**
	 * Get all generated rooms
	 * @returns {ROT.Map.Feature.Room[]}
	 */
    getRooms(): Room[] { return this._rooms; }

    /**
	 * Get all generated corridors
	 * @returns {ROT.Map.Feature.Corridor[]}
	 */
    getCorridors(): Corridor[] { return this._corridors; }
}
