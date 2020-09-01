
// RG global object is exposed to plugins
// RG.Spell is attached to the global object

const RGClass = RG.RG;
const BoltFromVoid = RG.Spell.defineSpell('BoltFromVoid', RG.Spell.BoltBase);

BoltFromVoid.prototype._init = function(...args) {
    this.damageType = RGClass.DMG.VOID;
    this.setPower(15);
};

BoltFromVoid.prototype.onHit = function(actor, src) {
    const dmgComp = new RG.Component.DirectDamage();
    dmgComp.setDamageType(RGClass.DMG.VOID);
    dmgComp.setSource(src);
    dmgComp.setDamage(RG.Dice.getValue('4d4 + 2'));

    const dur = RG.Dice.getValue('1d6');
    RG.Component.addToExpirationComp(actor, dmgComp, dur);
};

/* Required for each plugin. Dont' use const/let/var. */
pluginData = {
    type: 'spell',
    name: 'BoltFromVoid spell',

    // For cleanup, optional, but highly recommended
    onRemove: () => {
        RG.Spell.undefineSpell('BoltFromVoid');
    }
};

// Test section is optional, and can be executed with script
// bin/test-plugin.js -f <filename>
pluginData.test = (expect) => {
    const voidBolt = new BoltFromVoid();
    expect(voidBolt.getPower()).to.equal(15);
};
