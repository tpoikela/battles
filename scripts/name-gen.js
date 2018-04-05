
const ROT = require('../lib/rot');

const names =
`skruaw
zaiww
qooww
sqrurew
grerrow
greenaw
crenoo
skiccee
kesayeth
keeyeetook
sqrieh
quan
zhooth
gose
eabbiww
ghiyeath
sqellu
qoowawk
qratiba
scessane
zreew
ghiak
creaww
zriwoow
khiatuh
eabbuww
sqebbei
zhecak
sqetello
enibih
guawk
squaww
grieww
skarie
crayowk
gicci
cisiq
atiw
zesassuaw
skruassuashre
krook
skuan
geih
ebuth
skrielloo
sqille
qhara
gheabuawk
zashrobbei
sqriseessath
ciak
qeiw
reit
ena
scitath
kisha
enith
gannei
girriwian
qhullewi
`;

/* Name generator for generating unique names. */
const NameGen = function(data, opts = {}) {
    this.minInputLength = 7;
    this.minOutputLength = 4;
    this.maxOutputLength = 12;

    Object.keys(opts).forEach(key => {
        this[key] = opts[key];
    });

    this.gen = new ROT.StringGenerator();

    this.original = {};
    this.allGenerated = {};
    this.uniqueNames = {};

    let dataArr = data;
    if (typeof data === 'string') {
        dataArr = data.split('\n');
    }
    dataArr.forEach(name => {
        if (name.length >= this.minInputLength) {
            if (!this.original[name]) {
                this.gen.observe(name);
                this.original[name] = true;
            }
        }
    });

};

NameGen.prototype.genUniqueConstrained = function(maxTries = 100) {
    for (let i = 0; i < maxTries; i++) {
        const name = this.genUnique(maxTries);
        if (this.inConstraints(name)) {
            return name;
        }
        else {
            this.delete(name);
        }
    }
    return null;
};

NameGen.prototype.inConstraints = function(name) {
    return name.length >= this.minOutputLength &&
        name.length <= this.maxOutputLength;
};

/* Returns a unique name or null if unable to produce unique. */
NameGen.prototype.genUnique = function(maxTries = 100) {
    for (let i = 0; i < maxTries; i++) {
        const name = this.generate();
        if (this.isUnique(name)) {
            return name;
        }
    }
    return null;
};

/* Tries to generate a unique, but in case of failure still returns a
 * string. */
NameGen.prototype.genUniqueSafe = function(maxTries = 100) {
    let name = this.genUnique(maxTries);
    if (name === null) {
        name = this.generate();
    }
    return name;
};

NameGen.prototype.isUnique = function(name) {
    if (this.allGenerated[name] === 1) {
        return true;
    }
    return false;
};

NameGen.prototype.generate = function() {
    const name = this.gen.generate();
    if (!this.allGenerated[name]) {
        this.allGenerated[name] = 1;
    }
    else {
        this.allGenerated[name] += 1;
    }
    if (!this.uniqueNames[name]) {
        this.uniqueNames[name] = true;
    }
    return name;
};

NameGen.prototype.delete = function(name) {
    delete this.uniqueNames[name];
};

const nameGen = new NameGen(names);
const original = nameGen.original;

const numNames = 1000;
let numNewNames = 0;
for (let i = 0; i < numNames; i++) {
    // const newName = nameGen.generate();
    // const newName = nameGen.genUnique();
    const newName = nameGen.genUniqueConstrained();
    let suffix = '*';
    if (original[newName]) {
        suffix = '';
    }
    else {
        ++numNewNames;
    }
    console.log(newName + ' ' + suffix);
}

const uniqueNames = nameGen.uniqueNames;
const numUniqueNames = Object.keys(uniqueNames).length;
const ratioUnique = 100 * (numUniqueNames / numNames);
const ratioNew = 100 * (numNewNames / numNames);
console.log('Ratio of new names: ' + ratioNew + '%');
console.log('Ratio of unique names: ' + ratioUnique + '%');

