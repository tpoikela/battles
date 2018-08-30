/* For debugging various features of the game. Basically everything
 * requiring
 * manual testing is added to the end of create() function.
 */

const RG = require('../src/rg');
RG.Component = require('../src/component');
const Ability = require('../src/abilities');

const DebugGame = function(fact, parser) {
    this._fact = fact;
    this._parser = parser;
};

DebugGame.prototype.create = function(obj, game, player) {
    const parser = this._parser;
    const sqrPerItem = obj.sqrPerItem;
    obj.cols = 100;
    obj.rows = 100;
    const [pX, pY] = [50, 50];
    const level = this._fact.createLastBattle(game, obj);
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

module.exports = DebugGame;
