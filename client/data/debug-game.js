/* For debugging various features of the game. Basically everything
 * requiring
 * manual testing is added to the end of create() function.
 */

const RG = require('../src/rg');
RG.Component = require('../src/component');
const Ability = require('../src/abilities');
const Texts = require('../data/texts');

const RNG = RG.Random.getRNG();
const Stairs = RG.Element.Stairs;

const DebugGame = function(fact, parser) {
    this._fact = fact;
    this._parser = parser;
};

DebugGame.prototype.createArena = function(obj, game, player) {
    const parser = this._parser;
    const sqrPerItem = obj.sqrPerItem;
    obj.cols = 100;
    obj.rows = 100;
    const [pX, pY] = [50, 50];
    const level = this.createLastBattle(game, obj);
    level.addActor(player, pX, pY);

    const spirit = this._parser.createActor('Wolf spirit');
    spirit.get('Stats').setStrength(500);
    level.addActor(spirit, 2, 1);

    const gem = new RG.Item.SpiritGem('Lesser gem');
    level.addItem(gem);

    const pickaxe = this._parser.createActualObj('items', 'Pick-axe');
    level.addItem(pickaxe, 2, 2);

    const poison = this._parser.createActualObj('items',
        'Potion of frost poison');
    poison.count = 5;
    level.addItem(poison, 2, 2);
    const curePoison = this._parser.createActualObj('items',
        'Potion of cure poison');
    level.addItem(curePoison, 3, 2);

    const rifle = this._parser.createActualObj('items', 'Rifle');
    const ammo = this._parser.createActualObj('items', 'Steel bullet');
    ammo.setCount(100);
    level.addItem(rifle, 1, 1);
    level.addItem(ammo, 1, 1);

    // Test for shops
    const keeper = this._parser.createActualObj('actors', 'shopkeeper');
    const gold = new RG.Item.GoldCoin();
    gold.count = 50;
    keeper.getInvEq().addItem(gold);
    level.addActor(keeper, 2, 2);

    const shopElem = new RG.Element.Shop();
    const shopCell = level.getMap().getCell(3, 3);
    shopCell.setProp('elements', shopElem);
    const soldItem = this._parser.createActualObj('items',
        'Ruby glass sword');
    soldItem.add('Unpaid', new RG.Component.Unpaid());
    shopCell.setProp('items', soldItem);
    shopElem.setShopkeeper(keeper);

    const numFree = level.getMap().getFree().length;
    const itemsPerLevel = Math.round(numFree / sqrPerItem);

    const itemConf = {
        itemsPerLevel,
        func: (item) => (item.value <= 2500),
        maxValue: 2500,
        food: () => true,
        gold: () => false
    };
    this._fact.addNRandItems(level, this._parser, itemConf);

    const cols = level.getMap().cols;
    const rows = level.getMap().rows;

    const boss = this._parser.createActor('Thabba, Son of Ice');
    level.addActor(boss, cols - 2, rows - 2);

    const cryomancer = this._parser.createActor('Cryomancer');
    level.addActor(cryomancer, 1, rows - 2);

    const spiritPot = this._parser.createActualObj(
        'items', 'Potion of spirit form');
    player.getInvEq().addItem(spiritPot);

    const potStr = this._parser.createItem('Potion of strength');
    player.getInvEq().addItem(potStr);

    // BladeMaster components
    player.add('Attacker', new RG.Component.Attacker());
    player.add('Defender', new RG.Component.Defender());
    player.add('MasterEquipper', new RG.Component.MasterEquipper());
    player.add('BiDirStrike', new RG.Component.BiDirStrike());
    player.add('CounterAttack', new RG.Component.BiDirStrike());

    // Marksman components
    player.add(new RG.Component.ThroughShot());

    const winCond = new RG.Game.WinCondition('Kill a keeper');
    winCond.addActorKilled(keeper);

    game.addPlayer(player);

    const eq = player.getInvEq().getEquipment();
    eq.addSlot('spiritgem', new RG.Inv.EquipSlot(eq, 'spiritgem'));
    const gem1 = this._parser.createItem('Lesser spirit gem');
    const gem2 = this._parser.createItem('Greater spirit gem');
    player.getInvEq().addItem(gem1);
    player.getInvEq().addItem(gem2);
    player.add(new RG.Component.SpiritItemCrafter());

    const exploreElem = new RG.Element.Exploration();
    exploreElem.setExp(100);
    level.addElement(exploreElem, 1, 20);

    const trainer = this.createTrainer();
    level.addActor(trainer, 1, 2);

    const coins = new RG.Item.GoldCoin();
    coins.count = 600;
    player.getInvEq().addItem(coins);

    // if (!player.getBook()) {
        const spellbook = new RG.Spell.SpellBook(player);
        player.setBook(spellbook);
        RG.Spell.addAllSpells(spellbook);
        player.add(new RG.Component.SpellPower());
        player.get('SpellPower').setPP(100);
    // }

    const vActor = new RG.Actor.Virtual('spawner');
    const spawnBrain = new RG.Brain.Spawner(vActor);
    spawnBrain.setConstraint({op: 'lt', prop: 'danger', value: 10});
    vActor.setBrain(spawnBrain);
    level.addVirtualProp(RG.TYPE_ACTOR, vActor);

    const fire = this._parser.createActor('Fire');
    const fadingComp = new RG.Component.Fading();
    fadingComp.setDuration(20);
    fire.add(fadingComp);
    level.addActor(fire, 7, 1);

    const thunderbird = this._parser.createActor('thunderbird');
    level.addActor(thunderbird, 20, 1);

    const firekit = parser.createEntity('firemaking kit');
    player.getInvEq().addItem(firekit);

    player.add(new RG.Component.Coldness());
    player.get('SpellPower').setPP(100);
    player.get('SpellPower').setMaxPP(100);

    const itemRand = new RG.Factory.ItemRandomizer();
    const runeProt = parser.createItem('rune of protection');
    itemRand.adjustItem(runeProt, 100);
    player.getInvEq().addItem(runeProt);

    const runeDig = parser.createItem('rune of tunneling');
    itemRand.adjustItem(runeDig, 100);
    player.getInvEq().addItem(runeDig);

    const runeForce = parser.createItem('rune of force');
    itemRand.adjustItem(runeForce, 100);
    player.getInvEq().addItem(runeForce);

    const lever = new RG.Element.Lever();
    level.addElement(lever, 2, 1);
    for (let i = 0; i < 3; i++) {
        const leverDoor = new RG.Element.LeverDoor();
        lever.addTarget(leverDoor);
        level.addElement(leverDoor, 3 + i, 1);
    }

    // For testing actor abilities and camouflage
    const abilities = player.get('Abilities');
    const camouflage = new Ability.Camouflage();
    abilities.addAbility(camouflage);
    const sharpener = new Ability.Sharpener();
    abilities.addAbility(sharpener);

    this.addGoblinWithLoot(level);

    const runeOfCtrl = parser.createItem('rune of control');
    itemRand.adjustItem(runeOfCtrl, 250);
    player.getInvEq().addItem(runeOfCtrl);

    const runeOfVenom = parser.createItem('rune of venom');
    itemRand.adjustItem(runeOfVenom, 150);
    player.getInvEq().addItem(runeOfVenom);

    const runeOfPoisonClouds = parser.createItem('rune of poison clouds');
    itemRand.adjustItem(runeOfPoisonClouds, 150);
    player.getInvEq().addItem(runeOfPoisonClouds);

    const voidDagger = parser.createItem('Void dagger');
    player.getInvEq().addItem(voidDagger);

    player.getInvEq().unequipItem('hand', 1, 0);
    player.getInvEq().equipItem(voidDagger);

    const voidElem = parser.createActor('void elemental');
    level.addActor(voidElem, pX + 1, pY + 1);

    player.getInvEq().addItem(parser.createItem('Boots of flying'));

    const regen = new RG.Component.RegenEffect();
    regen.setPP(2);
    regen.setWaitPP(0);
    regen.setMaxWaitPP(0);
    player.add(regen);

    level.getMap().setBaseElemXY(pX - 1, pY - 1, RG.ELEM.WATER);

    return game;
};

DebugGame.prototype.createTrainer = function() {
    const human = this._parser.createActor('fighter');
    human.setName('Old trainer');
    const trainComp = new RG.Component.Trainer();
    trainComp.getChatObj().setTrainer(human);
    human.add(trainComp);
    return human;
};

DebugGame.prototype.addGoblinWithLoot = function(level) {
    const goblin = this._parser.createActor('goblin');
    goblin.setName('goblin with loot');
    const loot = new RG.Component.Loot(new RG.Item.Weapon('sword'));
    goblin.add(loot);

    /* Should fix this TODO
    const ssCorner = new RG.Element.Stairs('stairs', level, level);
    level.addStairs(ssCorner, level.getMap().cols - 2, level.getMap().rows - 2);
    const ssLoot = new RG.Element.Stairs('stairs', level, level);
    const lootCompStairs = new RG.Component.Loot(ssLoot);
    goblin.add(lootCompStairs );
    ssLoot.connect(ssCorner);
    */
    level.addActor(goblin, 2, 10);
};


DebugGame.prototype.createDebugBattle = function(obj, game, player) {
    const battle = new RG.Game.Battle('Battle of ice kingdoms');
    const army1 = new RG.Game.Army('Blue army');
    const army2 = new RG.Game.Army('Red army');
    this.addActorsToArmy(army1, 10, 'warlord');
    this.addActorsToArmy(army2, 10, 'Winter demon');

    const battleLevel = RG.FACT.createLevel('arena', 60, 30);
    battle.setLevel(battleLevel);
    battle.addArmy(army1, 1, 1);
    battle.addArmy(army2, 1, 2);
    game.addBattle(battle);

    game.addPlayer(player);
    return game;
};

DebugGame.prototype.addActorsToArmy = (army, num, name) => {
    for (let i = 0; i < num; i++) {
        const actor = this._parser.createActualObj('actors', name);
        actor.setFOVRange(10);
        army.addActor(actor);
    }
};

DebugGame.prototype.createOneDungeonAndBoss = function(obj, game, player) {
    const {cols, rows, nLevels, sqrPerActor, sqrPerItem} = obj;
    let levelCount = 1;
    const levels = ['rooms', 'rogue', 'digger'];

    // For storing stairs and levels
    const allStairsDown = [];
    const allLevels = [];

    const branch = new RG.World.Branch('StartBranch');

    const itemConstraint = maxValue => item => item.value <= maxValue;
    // Generate all game levels
    for (let nl = 0; nl < nLevels; nl++) {

        const nLevelType = RNG.randIndex(levels);
        let levelType = levels[nLevelType];
        if (nl === 0) {levelType = 'ruins';}
        const level = this._fact.createLevel(levelType, cols, rows);
        branch.addLevel(level);

        const numFree = level.getMap().getFree().length;
        const actorsPerLevel = Math.round(numFree / sqrPerActor);
        const itemsPerLevel = Math.round(numFree / sqrPerItem);

        const potion = new RG.Item.Potion('Healing potion');
        level.addItem(potion);
        const missile = this._parser.createActualObj('items', 'Shuriken');
        missile.count = 20;
        level.addItem(missile);

        const maxValue = 20 * (nl + 1);
        const itemConf = {
            itemsPerLevel, func: itemConstraint(maxValue),
            maxValue,
            food: () => true
        };
        this._fact.addNRandItems(level, this._parser, itemConf);

        const actorConf = {
            actorsPerLevel,
            maxDanger: nl + 1
        };
        this._fact.addNRandActors(level, this._parser, actorConf);

        allLevels.push(level);
    }

    // Create the final boss
    const lastLevel = allLevels.slice(-1)[0];
    const bossCell = lastLevel.getFreeRandCell();
    const summoner = this._fact.createActor('Summoner',
        {hp: 100, att: 10, def: 10});
    summoner.setType('summoner');
    summoner.get('Experience').setExpLevel(10);
    summoner.setBrain(new RG.Brain.Summoner(summoner));
    lastLevel.addActor(summoner, bossCell.getX(), bossCell.getY());

    const townLevel = this.createLastBattle(game, {cols: 80, rows: 60});
    townLevel.setLevelNumber(levelCount++);

    branch.connectLevels();
    game.addPlace(branch);

    const finalStairs = new Stairs(true, allLevels[nLevels - 1], townLevel);
    const stairsLoot = new RG.Component.Loot(finalStairs);
    summoner.add('Loot', stairsLoot);
    allStairsDown.push(finalStairs);

    const lastStairsDown = allStairsDown.slice(-1)[0];
    const townStairsUp = new Stairs(false, townLevel, lastLevel);
    const rStairCell = townLevel.getFreeRandCell();
    townLevel.addStairs(townStairsUp, rStairCell.getX(), rStairCell.getY());
    townStairsUp.setTargetStairs(lastStairsDown);
    lastStairsDown.setTargetStairs(townStairsUp);

    // Create townsfolk for the extra level
    for (let i = 0; i < 10; i++) {
        const name = 'Townsman';
        const human = this._fact.createActor(name, {brain: 'Human'});
        human.setType('human');
        const cell = townLevel.getFreeRandCell();
        townLevel.addActor(human, cell.getX(), cell.getY());
    }

    // Restore player position or start from beginning
    if (obj.loadedLevel !== null) {
        const loadLevel = obj.loadedLevel;
        if (loadLevel <= nLevels) {
            allLevels[loadLevel - 1].addActorToFreeCell(player);
        }
        else {
            allLevels[0].addActorToFreeCell(player);
        }
    }
    game.addPlayer(player, {place: 'StartBranch'});
    return game;
};


DebugGame.prototype.createLastBattle = function(game, obj) {
    const levelConf = RG.Factory.cityConfBase({});
    levelConf.parser = this._parser;

    levelConf.nShops = 3;
    const shopFunc = item => item.type === RNG.arrayGetRand(RG.SHOP_TYPES);
    levelConf.shopFunc.push(shopFunc);
    levelConf.shopFunc.push(shopFunc);

    const level = this._fact.createLevel('town', obj.cols, obj.rows, levelConf);
    this._listener = new ActorKillListener(this, game, level);

    this._fact.createHumanArmy(level, this._parser);

    level.setOnFirstEnter(() => {
        const demonEvent = new RG.Time.OneShotEvent(
            this._fact.createDemonArmy.bind(this._fact, level, this._parser),
            100 * 20,
            'Demon hordes are unleashed from the unsilent abyss!');
        game.addEvent(demonEvent);
    });

    level.setOnEnter( () => {
        this._savedPlayerFOV = game.getPlayer().getFOVRange();
        game.getPlayer().setFOVRange(20);
    });
    level.setOnExit( () => {
        game.getPlayer().setFOVRange(this._savedPlayerFOV);
    });

    game.addLevel(level);
    return level;
};

const ActorKillListener = function(parent, game, level) {

    // Needed for adding monsters and events
    this._game = game;
    this._level = level;

    this._maxBeasts = 0;
    this._maxDemons = 0;
    this._beastsKilled = 0;
    this._demonsKilled = 0;

    this.hasNotify = true;
    this.notify = function(evtName, obj) {
        if (evtName === RG.EVT_ACTOR_CREATED) {
            if (obj.hasOwnProperty('msg') && obj.msg === 'DemonSpawn') {
                const actorCreated = obj.actor;
                if (actorCreated.getName() === 'Winter demon') {
                    ++this._maxDemons;
                }
                if (actorCreated.getName() === 'Blizzard beast') {
                    ++this._maxBeasts;
                }
            }
        }
        else if (evtName === RG.EVT_ACTOR_KILLED) {
            const actor = obj.actor;
            if (actor.getName() === 'Winter demon') {
                ++this._demonsKilled;
                if (this._demonsKilled === this._maxDemons) {
                    this.allDemonsKilled();
                }
                RG.debug(this,
                    'A winter demon was slain! #' + this._demonsKilled);
                RG.debug(this, 'Max demons: ' + this._maxDemons);
            }
            else if (actor.getName() === 'Blizzard beast') {
                ++this._beastsKilled;
                if (this._beastsKilled === this._maxBeasts) {
                    this.allBeastsKilled();
                }
            }
        }
    };
    RG.POOL.listenEvent(RG.EVT_ACTOR_CREATED, this);
    RG.POOL.listenEvent(RG.EVT_ACTOR_KILLED, this);

    this.addSnow = (level, ratio) => {
        const map = level.getMap();
        RG.Map.Generator.addRandomSnow(map, ratio);
    };

    /* Called after all winter demons have been slain.*/
    this.allDemonsKilled = () => {
        RG.gameMsg(
            "Humans have vanquished all demons! But it's not over..");
        const windsEvent = new RG.Time.OneShotEvent(
            this.addSnow.bind(this, this._level, 0.2), 20 * 100,
            "Winds are blowing stronger. You feel it's getting colder"
        );
        this._game.addEvent(windsEvent);
        const stormEvent = new RG.Time.OneShotEvent(
            () => {}, 35 * 100, Texts.battle.eyeOfStorm);
        this._game.addEvent(stormEvent);
        const beastEvent = new RG.Time.OneShotEvent(
            parent.createBeastArmy.bind(parent, this._level, this._parser),
            50 * 100,
            'Winter spread by Blizzard Beasts! Hell seems to freeze.');
        this._game.addEvent(beastEvent);
    };

    this.allBeastsKilled = () => {
        RG.gameMsg(Texts.battle.beastsSlain);
        // DO a final message of game over
        // Add random people to celebrate
        const msgEvent = new RG.Time.OneShotEvent(() => {}, 10 * 100,
            Texts.battle.enemiesDead);
        this._game.addEvent(msgEvent);
        const msgEvent2 = new RG.Time.OneShotEvent(() => {}, 20 * 100,
            'Battles in the North will continue soon in larger scale...');
        this._game.addEvent(msgEvent2);
    };
}; // const ActorKillListener


module.exports = DebugGame;
