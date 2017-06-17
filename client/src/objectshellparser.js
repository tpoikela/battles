
const RG = require('./rg.js');
const ROT = require('../../lib/rot.js');

/* Object parser for reading game data. Game data is contained within shell
 * objects which are simply object literals without functions etc. */
RG.ObjectShellParser = function() {

    // NOTE: 'SHELL' means vanilla JS object, which has not been
    // created with new:
    //      SHELL:   var rat = {name: "Rat", type: "animal"};
    //      OBJECT: var ratObj = new RG.Actor.Rogue("rat");
    //              ratObj.setType("animal");
    //
    // Shells are used in external data file to describe game objects in a more
    // concise way. Game objects are created from shells by this object.

    // var categ = ['actors', 'effects', 'items', 'levels', 'dungeons'];

    // Stores the base shells
    var _base = {
        actors: {},
        effects: {},
        items: {},
        levels: {},
        dungeons: {}
    };

    var _db = {
        actors: {},
        effects: {},
        items: {},
        levels: {},
        dungeons: {}
    };

    var dbDanger = {}; // All entries indexed by danger
    var _dbByName = {}; // All entries indexed by name

    /* Maps obj props to function calls. Essentially this maps bunch of setters
     * to different names. Following formats supported:
     *
     * 1. {factory: funcObj, func: "setter"}
     *  Call obj["setter"]( funcObj(shell.field) )
     *
     * 2. {comp: "CompName", func: "setter"}
     *  Create component comp of type "CompName".
     *  Call comp["setter"]( shell.field)
     *  Call obj.add("CompName", comp)
     *
     * 3. {comp: "CompName"}
     *  Create component comp of type "CompName" with new CompName(shell.field)
     *  Call obj.add("CompName", comp)
     *
     * 4. "setter"
     *   Call setter obj["setter"](shell.field)
     * */
    var _propToCall = {
        actors: {
            type: 'setType',
            attack: {comp: 'Combat', func: 'setAttack'},
            defense: {comp: 'Combat', func: 'setDefense'},
            damage: {comp: 'Combat', func: 'setDamage'},
            speed: {comp: 'Stats', func: 'setSpeed'},

            strength: {comp: 'Stats', func: 'setStrength'},
            accuracy: {comp: 'Stats', func: 'setAccuracy'},
            agility: {comp: 'Stats', func: 'setAgility'},
            willpower: {comp: 'Stats', func: 'setWillpower'},

            hp: {comp: 'Health'},
            danger: {comp: 'Experience', func: 'setDanger'},
            brain: {func: 'setBrain', factory: RG.FACT.createBrain}
        },
        items: {
            // Generic item functions
            value: 'setValue',
            weight: {comp: 'Physical', func: 'setWeight'},

            armour: {
                attack: 'setAttack',
                defense: 'setDefense',
                protection: 'setProtection',
                armourType: 'setArmourType'
            },

            weapon: {
                damage: 'setDamage',
                attack: 'setAttack',
                defense: 'setDefense'
            },
            missile: {
                damage: 'setDamage',
                attack: 'setAttack',
                range: 'setAttackRange'
            },
            food: {
                energy: 'setEnergy'
            }
        },
        levels: {},
        dungeons: {}
    };

    // Internal cache for proc generation
    var _cache = {
        actorWeights: {}

    };

    //-----------------------------------------------------------------------
    // "PARSING" METHODS
    //-----------------------------------------------------------------------

    /* Parses all shell data, items, monsters, level etc.*/
    this.parseShellData = function(obj) {
        var keys = Object.keys(obj);
        for (var i = 0; i < keys.length; i++) {
            this.parseShellCateg(keys[i], obj[keys[i]]);
        }
    };

    /* Parses one specific shell category, ie items or monsters.*/
    this.parseShellCateg = function(categ, objsArray) {
        for (var i = 0; i < objsArray.length; i++) {
            this.parseObjShell(categ, objsArray[i]);
        }
    };

    /* Parses an object shell. Returns null for base objects, and
     * corresponding object for actual actors.*/
    this.parseObjShell = function(categ, obj) {
        if (this.validShellGiven(obj)) {
            // Get properties from base class
            if (obj.hasOwnProperty('base')) {
                var baseName = obj.base;
                if (this.baseExists(categ, baseName)) {
                    obj = this.extendObj(obj, this.getBase(categ, baseName));
                }
                else {
                    RG.err('ObjectParser', 'parseObjShell',
                        'Unknown base ' + baseName + ' specified for ' + obj);
                }
            }

            if (categ === 'actors') {this.addTypeIfUntyped(obj);}

            this.storeIntoDb(categ, obj);
            return obj;
        }
        else {
            return null;
        }
    };

    /* Checks that the object shell given is correctly formed.*/
    this.validShellGiven = function(obj) {
        if (!obj.hasOwnProperty('name')) {
            RG.err('ObjectShellParser', 'validShellGiven',
                "shell doesn't have a name.");
            return false;
        }
        // console.log("validShell ==> " + obj.name);
        return true;
    };

    /* If an object doesn't have type, the name is chosen as its type.*/
    this.addTypeIfUntyped = function(obj) {
        if (!obj.hasOwnProperty('type')) {
            obj.type = obj.name;
        }
    };

    /* Returns an object shell given category and name.*/
    this.get = function(categ, name) {
        return _db[categ][name];
    };

    /* Return specified base shell.*/
    this.getBase = function(categ, name) {
        return _base[categ][name];
    };

    this.setAsBase = function(categ, obj) {
        _base[categ][obj.name] = obj;
    };

    /* Stores the object into given category.*/
    this.storeIntoDb = function(categ, obj) {
        if (_db.hasOwnProperty(categ)) {
            this.setAsBase(categ, obj);

            if (!obj.hasOwnProperty('dontCreate')) {
                _db[categ][obj.name] = obj;
                if (_dbByName.hasOwnProperty(obj.name)) {
                    _dbByName[obj.name].push(obj);
                }
                else {
                    var newArr = [];
                    newArr.push(obj);
                    _dbByName[obj.name] = newArr;
                }
                if (obj.hasOwnProperty('danger')) {
                    var danger = obj.danger;
                    if (!dbDanger.hasOwnProperty(danger)) {
                        dbDanger[danger] = {};
                    }
                    if (!dbDanger[danger].hasOwnProperty(categ)) {
                        dbDanger[danger][categ] = {};
                    }
                    dbDanger[danger][categ][obj.name] = obj;
                }
            } // dontCreate
        }
        else {
            RG.err('ObjectParser', 'storeIntoDb',
                'Unknown category: ' + categ);
        }
        this.storeRenderingInfo(categ, obj);
    };

    /* Stores char/CSS className for the object for rendering purposes.*/
    this.storeRenderingInfo = function(categ, obj) {
        // console.log("\tStoring render information for " + obj.name);
        if (obj.hasOwnProperty('char')) {
            if (obj.hasOwnProperty('name')) {
                RG.addCharStyle(categ, obj.name, obj['char']);
            }
            else {
                RG.addCharStyle(categ, obj.type, obj['char']);
            }
        }
        if (obj.hasOwnProperty('className')) {
            if (obj.hasOwnProperty('name')) {
                RG.addCellStyle(categ, obj.name, obj.className);
            }
            else {
                RG.addCellStyle(categ, obj.type, obj.className);
            }
        }
    };

    /* Creates a component of specified type.*/
    this.createComponent = function(type, val) {
        switch (type) {
            case 'Combat': return new RG.Component.Combat();
            case 'Experience': return new RG.Component.Experience();
            case 'Health': return new RG.Component.Health(val);
            case 'Stats': return new RG.Component.Stats();
            default:
                if (RG.Component.hasOwnProperty(type)) {
                    return RG.Component[type]();
                }
                else {
                    RG.err('Factory', 'createComponent',
                        'Component |' + type + "| doesn't exist.");
                }
        }
        return null;
    };

    /* Returns an actual game object when given category and name. Note that
     * the blueprint must exist already in the database (blueprints must have
     * been parser before). */
    this.createActualObj = function(categ, name) {
        if (!this.dbExists(categ, name)) {
            RG.err('ObjectParser', 'createActualObj',
                'Categ: ' + categ + ' Name: ' + name + " doesn't exist.");
            return null;
        }

        var shell = this.get(categ, name);
        var propCalls = _propToCall[categ];
        var newObj = this.createNewObject(categ, shell);

        // If propToCall table has the same key as shell property, call
        // function in _propToCall using the newly created object.
        for (var p in shell) {

            // Called for basic type: actors, items...
            if (propCalls.hasOwnProperty(p)) {
                var funcName = propCalls[p];
                if (typeof funcName === 'object') {
                    if (funcName.hasOwnProperty('comp')) {
                        this.addCompToObj(newObj, funcName, shell[p]);
                    }
                    else if (funcName.hasOwnProperty('factory')) {
                        if (p === 'brain') {
                            var createdObj = funcName.factory(newObj, shell[p]);
                            newObj[funcName.func](createdObj);
                        }
                    }
                    else {
                        for (var f in funcName) {
                            let fName = funcName[f];
                            if (newObj.hasOwnProperty(fName)) {
                                newObj[fName](shell[p]);
                            }
                        }
                    }
                }
                else {
                    newObj[funcName](shell[p]);
                }
            }
            else { // Check for subtypes
                if (shell.hasOwnProperty('type')) {
                    if (propCalls.hasOwnProperty(shell.type)) {
                        var propTypeCalls = propCalls[shell.type];
                        if (propTypeCalls.hasOwnProperty(p)) {
                            var funcName2 = propTypeCalls[p];
                            if (typeof funcName2 === 'object') {
                                for (var f2 in funcName2) {
                                    const fName2 = funcName2[f2];
                                    // Should this be fName2, not fName?
                                    if (newObj.hasOwnProperty(fName2)) {
                                        newObj[funcName2[f2]](shell[p]);
                                    }
                                }
                            }
                            else {
                                newObj[funcName2](shell[p]);
                            }
                        }
                    }
                }
            }
        }

        if (shell.hasOwnProperty('use')) {this.addUseEffects(shell, newObj);}

        // TODO map different props to function calls
        return newObj;
    };

    /* If shell has 'use', this adds specific use effect to the item.*/
    this.addUseEffects = function(shell, newObj) {
        newObj.useFuncs = [];
        newObj.useItem = _db.effects.use.func.bind(newObj);
        if (typeof shell.use === 'object' && shell.use.hasOwnProperty('length')) {
            for (var i = 0; i < shell.use.length; i++) {
                _addUseEffectToItem(shell, newObj, shell.use[i]);
            }
        }
        else if (typeof shell.use === 'object') {
            for (var p in shell.use) {
                _addUseEffectToItem(shell, newObj, p);
            }
        }
        else {
            _addUseEffectToItem(shell, newObj, shell.use);
        }
    };

    var _addUseEffectToItem = function(shell, item, useName) {
        var useFuncName = useName;
        if (_db.effects.hasOwnProperty(useFuncName)) {
            var useEffectShell = _db.effects[useFuncName];
            var useFuncVar = useEffectShell.func;
            item.useFuncs.push(useFuncVar);

            if (useEffectShell.hasOwnProperty('requires')) {
                if (shell.use.hasOwnProperty(useName)) {
                    item.useArgs = {};
                    var reqs = useEffectShell.requires;
                    if (typeof reqs === 'object') {
                        for (var i = 0; i < reqs.length; i++) {
                            _verifyAndAddReq(shell.use[useName], item, reqs[i]);
                        }
                    }
                    else {
                        _verifyAndAddReq(shell.use[useName], item, reqs);
                    }
                }
                else {
                    RG.err('ObjectParser', 'addUseEffects',
                        "useEffect shell has 'requires'. Item shell 'use' must be an object.");
                }
            }
        }
        else {
            RG.err('ObjectParser', 'addUseEffects', 'Unknown effect: |' + useFuncName + '|');
        }
    };

    /* Verifies that the shell has all requirements, and adds them to the
     * object, into useArgs.reqName. */
    var _verifyAndAddReq = function(obj, item, reqName) {
        if (obj.hasOwnProperty(reqName)) {
            item.useArgs[reqName] = obj[reqName];
        }
        else {
            RG.err('ObjectParser', '_verifyAndAddReq',
                'Req |' + reqName + '| not specified in item shell. Item: ' + item);
        }
    };

    /* Adds a component to the newly created object, or updates existing
     * component if it exists already.*/
    this.addCompToObj = function(newObj, compData, val) {
        if (compData.hasOwnProperty('func')) {
            var fname = compData.func;
            var compName = compData.comp;
            if (newObj.has(compName)) {
                newObj.get(compName)[fname](val); // Call comp with setter (fname)
            }
            else { // Have to create new component
                var comp = this.createComponent(compName);
                comp[fname](val); // Then call comp setter
            }
        }
        else {
            newObj.add(compData.comp,
                this.createComponent(compData.comp, val));
        }

    };

    /* Creates actual game object from obj shell in given category.*/
    this.CreateFromShell = function(categ, obj) {
        return this.createActualObj(categ, obj.name);
    };

    /* Factory-method for creating the actual game objects.*/
    this.createNewObject = function(categ, obj) {
        switch (categ) {
            case RG.TYPE_ACTOR:
                var type = obj.type;
                if (type === 'spirit') {return new RG.Actor.Spirit(obj.name);}
                return new RG.Actor.Rogue(obj.name);
            case RG.TYPE_ITEM:
                var subtype = obj.type;
                switch (subtype) {
                    case 'armour': return new RG.Item.Armour(obj.name);
                    case 'food': return new RG.Item.Food(obj.name);
                    case 'missile': return new RG.Item.Missile(obj.name);
                    case 'potion': return new RG.Item.Potion(obj.name);
                    case 'spiritgem': return new RG.Item.SpiritGem(obj.name);
                    case 'weapon': return new RG.Item.Weapon(obj.name);
                    case 'tool': break;
                    default: {
                        const msg =
                            `Unknown subtype: ${subtype}, obj: ${JSON.stringify(obj)}`;
                        RG.err('', 'createNewObject', msg);
                    }
                }
                return new RG.Item.Base(obj.name); // generic, useless
            case 'levels':
                return RG.FACT.createLevel(obj.type, obj.cols, obj.rows);
            case 'dungeons': break;
            default: break;
        }
        return null;
    };

    /* Returns true if shell base exists.*/
    this.baseExists = function(categ, baseName) {
        if (_base.hasOwnProperty(categ)) {
            return _base[categ].hasOwnProperty(baseName);
        }
        return false;
    };

    /* Extends the given object shell with a given base shell.*/
    this.extendObj = function(obj, baseObj) {
        for (var prop in baseObj) {
            if (!obj.hasOwnProperty(prop)) {
                if (prop !== 'dontCreate') {
                    // console.log("\textendObj: Added " + prop + " to " + obj.name);
                    obj[prop] = baseObj[prop];
                }
            }
        }
        return obj;
    };

    //--------------------------------------------------------------------
    // Database get-methods
    //--------------------------------------------------------------------

    this.dbExists = function(categ, name) {
        if (_db.hasOwnProperty(categ)) {
            if (_db[categ].hasOwnProperty(name)) {return true;}
        }
        return false;
    };

    /* Returns entries from db based on the query. Returns null if nothing
     * matches.*/
    this.dbGet = function(query) {

        var name = query.name;
        var categ = query.categ;
        var danger = query.danger;
        // var type = query.type;

        // Specifying name returns an array
        if (typeof name !== 'undefined') {
            if (_dbByName.hasOwnProperty(name)) {return _dbByName[name];}
            else {return [];}
        }

        if (typeof danger !== 'undefined') {
            if (dbDanger.hasOwnProperty(danger)) {
                var entries = dbDanger[danger];
                if (typeof categ !== 'undefined') {
                    if (entries.hasOwnProperty(categ)) {
                        return entries[categ];
                    }
                    else {return {};}
                }
                else {
                    return dbDanger[danger];
                }
            }
            else {
                return {};
            }
        }
        else { // Fetch all entries of given category
            if (typeof categ !== 'undefined') {
                if (_db.hasOwnProperty(categ)) {
                    return _db[categ];
                }
            }
        }
        return {};

    };

    //----------------------------------------------------------------------
    // RANDOMIZED METHODS for procedural generation
    //----------------------------------------------------------------------

    /* Returns stuff randomly from db. For example, {categ: "actors", num: 2}
     * returns two random actors (can be the same). Ex2: {danger: 3, num:1}
     * returns randomly one entry which has danger 3.*/
    this.dbGetRand = function(query) {
        var danger = query.danger;
        var categ = query.categ;
        if (typeof danger !== 'undefined') {
            if (typeof categ !== 'undefined') {
                if (dbDanger.hasOwnProperty(danger)) {
                    var entries = dbDanger[danger][categ];
                    return this.getRandFromObj(entries);
                }
            }
        }
        return null;
    };

    /* Returns a property from an object, selected randomly. For example,
     * given object {a: 1, b: 2, c: 3}, may return 1,2 or 3 with equal
     * probability.*/
    this.getRandFromObj = function(obj) {
        var keys = Object.keys(obj);
        var len = keys.length;
        var randIndex = Math.floor( Math.random() * len);
        return obj[keys[randIndex]];
    };

    /* Filters given category with a function. Func gets each object as arg,
     * and must return either true or false.*/
    this.filterCategWithFunc = function(categ, func) {
        var objects = this.dbGet({categ: categ});
        var res = [];
        var keys = Object.keys(objects);

        for (var i = 0; i < keys.length; i++) {
            var name = keys[i];
            var obj = objects[name];
            var acceptItem = func(obj);
            if (acceptItem) {
                res.push(obj);
            }
        }
        return res;

    };

    /* Creates a random actor based on danger value or a filter function.*/
    this.createRandomActor = function(obj) {
        var randShell = null;
        if (obj.hasOwnProperty('danger')) {
            var danger = obj.danger;
            randShell = this.dbGetRand({danger: danger, categ: 'actors'});
            if (randShell !== null) {
                return this.CreateFromShell('actors', randShell);
            }
            else {
                return null;
            }
        }
        else if (obj.hasOwnProperty('func')) {
            var res = this.filterCategWithFunc('actors', obj.func);
            randShell = this.arrayGetRand(res);
            return this.CreateFromShell('actors', randShell);
        }
    };

    // Uses engine's internal weighting algorithm when givel a level number.
    // Note that this method can return null, if no correct danger level is
    // found. You can supply {func: ...} as a fallback solution.
    this.createRandomActorWeighted = function(min, max, obj) {
        var key = min + ',' + max;
        if (!_cache.actorWeights.hasOwnProperty(key)) {
            _cache.actorWeights[key] = RG.getDangerProb(min, max);
        }
        var danger = ROT.RNG.getWeightedValue(_cache.actorWeights[key]);
        var actor = this.createRandomActor({danger: danger});
        if (RG.isNullOrUndef([actor])) {
            if (!RG.isNullOrUndef([obj])) {
                return this.createRandomActor(obj);
            }
        }
        return actor;
    };

    /* Creates a random item based on a selection function.
     *
     * Example:
     *  var funcValueSel = function(item) {return item.value >= 100;}
     *  var item = createRandomItem({func: funcValueSel}); // Returns item with
     *  value > 100.
     *  */
    this.createRandomItem = function(obj) {
        if (obj.hasOwnProperty('func')) {
            var res = this.filterCategWithFunc('items', obj.func);
            var randShell = this.arrayGetRand(res);
            return this.CreateFromShell('items', randShell);
        }
        else {
            RG.err('ObjectParser', 'createRandomItem', 'No function given.');
        }
        return null;
    };

    /* Returns a random entry from the array.*/
    this.arrayGetRand = function(arr) {
        var len = arr.length;
        var randIndex = Math.floor(Math.random() * len);
        return arr[randIndex];
    };

};

module.exports = RG.ObjectShellParser;
