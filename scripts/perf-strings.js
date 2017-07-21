
const x = 80;
const y = 28;

/* Object for the string. */
function MyStr(str) {
    this.str = str;
}

const strObjs = {
    default: new MyStr('cell-item-default'),
    wall: new MyStr('cell-item-wall'),
    floor: new MyStr('cell-item-floor'),
    water: new MyStr('cell-item-water')
};

const numComp = 10000;

const arrWithObj = [];
const arrWithStr = [];
const arrWithObj2 = [];
const arrWithStr2 = [];

const keys = Object.keys(strObjs);

fillArrays(arrWithObj, arrWithStr);
fillArrays(arrWithObj2, arrWithStr2);

let strDiffs = 0;
const startStr = new Date();
for (let h = 0; h < numComp; h++) {
    for (let i = 0; i < x; i++) {
        for (let j = 0; j < y; j++) {
            if (arrWithStr[i][j] !== arrWithStr2[i][j]) {
                ++strDiffs;
            }
        }
    }
}
const endStr = new Date();

let objDiffs = 0;
const startObj = new Date();
for (let h = 0; h < numComp; h++) {
    for (let i = 0; i < x; i++) {
        for (let j = 0; j < y; j++) {
            if (arrWithObj[i][j] !== arrWithObj2[i][j]) {
                ++objDiffs;
            }
        }
    }
}
const endObj = new Date();

const strDurMs = endStr.getTime() - startStr.getTime();
const objDurMs = endObj.getTime() - startObj.getTime();

console.log(`Strings ${strDurMs} ms, Objects: ${objDurMs}`);
console.log(`Diffs: Strings: ${strDiffs}, Objects: ${objDiffs}`);

//---------------------------------------------------------------------------
// HELPER FUNCTIONS
//---------------------------------------------------------------------------
function getRandom() {
    const index = Math.floor(Math.random() * keys.length);
    const key = keys[index];
    return strObjs[key];
}

function fillArrays(arrWithObj, arrWithStr) {
    for (let i = 0; i < x; i++) {
        const objRow = [];
        const strRow = [];
        for (let j = 0; j < y; j++) {
            const obj = getRandom();
            objRow.push(obj);
            strRow.push(obj.str);
        }
        arrWithObj.push(objRow);
        arrWithStr.push(strRow);
    }
}
