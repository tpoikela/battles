
const RG = require('./rg');

const OW = {};

//---------------------------
// CONSTANT DEFINITIONS
//---------------------------

// Straight lines
OW.LL_WE = '\u2550'; // ═
OW.LL_NS = '\u2551'; // ║

// Corners
OW.CC_NW = '\u2554'; // ╔
OW.CC_NE = '\u2557'; // ╗
OW.CC_SW = '\u255A'; // ╚
OW.CC_SE = '\u255D'; // ╝

// Double cross
OW.XX = '\u256C'; // ╬
OW.EMPTY = 'e';

// NSEW

OW.TT_W = '\u2560'; // ╠
OW.TT_E = '\u2563'; // ╣
OW.TT_N = '\u2566'; // ╦
OW.TT_S = '\u2569'; // ╩
OW.TERM = '.';

// Features like cities etc.
OW.WCAPITAL = '\u2654';
OW.BCAPITAL = '\u265A';
OW.BTOWER = '\u265C';
OW.WTOWER = '\u2656';
OW.WDUNGEON = '\u2616';
OW.MOUNTAIN = '^'; // TODO find better char
// OW.VILLAGE = '\u27F0';
OW.BVILLAGE = '\u25B2';
OW.WVILLAGE = '\u25B3';
// const CITY = '\u1CC1';
OW.VTUNNEL = '|'; // Tunnel between two walls
OW.HTUNNEL = '-'; // Tunnel between two walls

OW.PROB_BVILLAGE = 0.25;

OW.biomeTypeMap = {
    arctic: 0,
    alpine: 1,
    tundra: 2,
    taiga: 3,
    forest: 4,
    grassland: 5
};

const elemStyles = RG.cellStyles.elements;
// These styles will be used to render the OW map
OW.classNames = {
  [OW.TERM]: elemStyles.floor,
  [OW.MOUNTAIN]: elemStyles.highrock,

  [OW.LL_WE]: elemStyles.mountain,
  [OW.LL_NS]: elemStyles.mountain,
  [OW.CC_NW]: elemStyles.mountain,
  [OW.CC_NE]: elemStyles.mountain,
  [OW.CC_SW]: elemStyles.mountain,
  [OW.CC_SE]: elemStyles.mountain,
  [OW.XX]: elemStyles.mountain,
  [OW.TT_W ]: elemStyles.mountain,
  [OW.TT_E ]: elemStyles.mountain,
  [OW.TT_N ]: elemStyles.mountain,
  [OW.TT_S ]: elemStyles.mountain,
  default: 'cell-element-ow'

};

OW.BIOME = {};
OW.BIOME.ALPINE = 'alpine';
OW.BIOME.ARCTIC = 'arctic';
OW.BIOME.TUNDRA = 'tundra';
OW.BIOME.TAIGA = 'taiga';

OW.ILLEGAL_POS = -1;
OW.CELL_ANY = 'OW.CELL_ANY'; // Used in matching functions only

// Can connect to east side
OW.E_HAS_CONN = [
    OW.XX, OW.TT_W, OW.TT_N, OW.TT_S, OW.CC_NW, OW.CC_SW, OW.LL_WE];

// Can connect to west side
OW.W_HAS_CONN = [
    OW.XX, OW.TT_E, OW.TT_N, OW.TT_S, OW.CC_NE, OW.CC_SE, OW.LL_WE];

// Can connect to north
OW.N_HAS_CONN = [
    OW.XX, OW.TT_S, OW.TT_W, OW.TT_E, OW.CC_SW, OW.CC_SE, OW.LL_NS];

// Can connect to south
OW.S_HAS_CONN = [
    OW.XX, OW.TT_N, OW.TT_W, OW.TT_E, OW.CC_NW, OW.CC_NE, OW.LL_NS];

OW.N_BORDER = [OW.LL_WE, OW.TT_N];
OW.S_BORDER = [OW.LL_WE, OW.TT_S];
OW.E_BORDER = [OW.LL_NS, OW.TT_E];
OW.W_BORDER = [OW.LL_NS, OW.TT_W];

OW.ALL_WALLS = [
    OW.XX, OW.TT_N, OW.TT_S, OW.TT_E, OW.TT_W,
    OW.CC_SW, OW.CC_NW, OW.CC_SE, OW.CC_NE,
    OW.LL_WE, OW.LL_NS
];

OW.ALL_WALLS_LUT = {};
OW.ALL_WALLS.forEach(tile => {OW.ALL_WALLS_LUT[tile] = tile;});

// const LINE_WE = [OW.LL_WE, OW.TT_N, OW.TT_S, OW.XX];
// const LINE_NS = [OW.LL_NS, OW.TT_E, OW.TT_W, OW.XX];

// Used for weighted randomisation of creating west-east walls,
// favors non-branching walls
OW.LINE_WE_WEIGHT = {
    [OW.LL_WE]: 10,
    [OW.TT_N]: 3,
    [OW.TT_S]: 3,
    [OW.XX]: 1
};

// Used for weighted randomisation of create north-south walls,
// favors non-branching walls
OW.LINE_NS_WEIGHT = {
    [OW.LL_NS]: 10,
    [OW.TT_E]: 3,
    [OW.TT_W]: 3,
    [OW.XX]: 1
};

// Connection mappings for different 'mountain' tiles
// If we have an empty cell (e), and neighbouring cell is of type 'first key',
// and this cell is located in the dir 'second key' of the empty cell,
// listed cells can be used as empty cell.
OW.CAN_CONNECT = {
    [OW.LL_WE]: {
        N: [], // ═
               // e

        S: [], // e
               // ═

        E: OW.E_HAS_CONN, // e═
        W: OW.W_HAS_CONN // ═e
    },
    [OW.LL_NS]: {
        N: OW.N_HAS_CONN, // ║
                       // e

        S: OW.S_HAS_CONN, // e
                       // ║
        E: [], // e║
        W: [] // ║e
    },

    // Corners
    [OW.CC_NW]: { // ╔
        N: OW.N_HAS_CONN, // ╔
                       // e
        S: [],
        E: [],
        W: OW.W_HAS_CONN // ╔e
    },
    [OW.CC_NE]: {
        N: OW.N_HAS_CONN,
        S: [],
        E: OW.E_HAS_CONN,
        W: []
    },
    [OW.CC_SW]: { // ╚
        N: [],
        S: OW.S_HAS_CONN,
        E: [], // e╚
        W: OW.W_HAS_CONN
    },
    [OW.CC_SE]: { // ╝
        N: [],
        S: OW.S_HAS_CONN,
        E: OW.E_HAS_CONN, // e╝
        W: [] // ╝e
    },

    [OW.XX]: { // ╬ connects to all dirs
        N: OW.N_HAS_CONN,
        S: OW.S_HAS_CONN,
        E: OW.E_HAS_CONN,
        W: OW.W_HAS_CONN
    },
    [OW.EMPTY]: {
        N: [],
        S: [],
        E: [],
        W: []
    },

    [OW.TT_W]: { // ╠
        N: OW.N_HAS_CONN,
        S: OW.S_HAS_CONN,
        E: [], // e╠
        W: OW.W_HAS_CONN // ╠e
    },
    [OW.TT_E]: { // ╣
        N: OW.N_HAS_CONN,
        S: OW.S_HAS_CONN,
        E: OW.E_HAS_CONN,
        W: []
    },
    [OW.TT_N]: { // ╦
        N: OW.N_HAS_CONN,
        S: [],
        E: OW.E_HAS_CONN,
        W: OW.W_HAS_CONN
    },
    [OW.TT_S]: { // ╩
        N: [],
        S: OW.S_HAS_CONN,
        E: OW.E_HAS_CONN,
        W: OW.W_HAS_CONN
    },
    [OW.TERM]: {
        N: [],
        S: [],
        E: [],
        W: []
    }
};

module.exports = OW;
