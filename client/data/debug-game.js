
const RG = require('../src/rg');
RG.Component = require('../src/component');

const DebugGame = function(fact, parser) {
    const _fact = fact;
    const _parser = parser;

    this.create = function(obj, game, player) {
        const sqrPerItem = obj.sqrPerItem;
        obj.cols = 100;
        obj.rows = 100;
        const level = _fact.createLastBattle(game, obj);

        const spirit = new RG.Actor.Spirit('Wolf spirit');
        spirit.get('Stats').setStrength(500);
        level.addActor(spirit, 2, 1);

        const gem = new RG.Item.SpiritGem('Lesser gem');
        level.addItem(gem);

        const pickaxe = _parser.createActualObj('items', 'Pick-axe');
        level.addItem(pickaxe, 2, 2);

        const poison = _parser.createActualObj('items',
            'Potion of frost poison');
        poison.count = 5;
        level.addItem(poison, 2, 2);
        const curePoison = _parser.createActualObj('items',
            'Potion of cure poison');
        level.addItem(curePoison, 3, 2);

        const rifle = _parser.createActualObj('items', 'Rifle');
        const ammo = _parser.createActualObj('items', 'Steel bullet');
        ammo.setCount(100);
        level.addItem(rifle, 1, 1);
        level.addItem(ammo, 1, 1);

        // Test for shops
        const keeper = _parser.createActualObj('actors', 'shopkeeper');
        const gold = new RG.Item.GoldCoin();
        gold.count = 50;
        keeper.getInvEq().addItem(gold);
        level.addActor(keeper, 2, 2);
        const shopElem = new RG.Element.Shop();
        const shopCell = level.getMap().getCell(3, 3);
        shopCell.setProp('elements', shopElem);
        const soldItem = _parser.createActualObj('items', 'Ruby glass sword');
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
        _fact.addNRandItems(level, _parser, itemConf);

        const cols = level.getMap().cols;
        const rows = level.getMap().rows;

        const boss = _parser.createActor('Thabba, Son of Ice');
        level.addActor(boss, cols - 2, rows - 2);

        const cryomancer = _parser.createActor('Cryomancer');
        level.addActor(cryomancer, 1, rows - 2);

        const spiritPot = _parser.createActualObj(
            'items', 'Potion of spirit form');
        player.getInvEq().addItem(spiritPot);

        const potStr = _parser.createItem('Potion of strength');
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
        const gem1 = _parser.createItem('Lesser spirit gem');
        const gem2 = _parser.createItem('Greater spirit gem');
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

        if (!player.getBook()) {
            const spellbook = new RG.Spell.SpellBook(player);
            player.setBook(spellbook);
            RG.Spell.addAllSpells(this._spellbook);
            player.add(new RG.Component.SpellPower());
            player.get('SpellPower').setPP(100);
        }

        const vActor = new RG.Actor.Virtual('spawner');
        const spawnBrain = new RG.Brain.Spawner(vActor);
        spawnBrain.setConstraint({op: 'lt', prop: 'danger', value: 10});
        vActor.setBrain(spawnBrain);
        level.addVirtualProp(RG.TYPE_ACTOR, vActor);

        const fire = _parser.createActor('Fire');
        const fadingComp = new RG.Component.Fading();
        fadingComp.setDuration(20);
        fire.add(fadingComp);
        level.addActor(fire, 7, 1);

        const thunderbird = _parser.createActor('thunderbird');
        level.addActor(thunderbird, 20, 1);

        return game;
    };

    this.createTrainer = function() {
        const human = _parser.createActor('fighter');
        human.setName('Old trainer');
        const trainComp = new RG.Component.Trainer();
        trainComp.getChatObj().setTrainer(human);
        human.add(trainComp);
        return human;
    };
};

module.exports = DebugGame;
