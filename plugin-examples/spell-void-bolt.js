
// RG.Spell is attached to the global object

const VoidBolt = RG.Spell.defineSpell('VoidBolt', RG.Spell.BoltBase);

VoidBolt.prototype._init = function(...args) {
    this.damageType = RG.RG.DMG.VOID;
    this.setPower(15);
};

VoidBolt.prototype.onHit = function(actor, src) {
    const dmgComp = new RG.Component.DirectDamage();
    dmgComp.setDamageType(RG.RG.DMG.VOID);
    dmgComp.setSource(src);
    dmgComp.setDamage(RG.Dice.getValue('4d4 + 2'));

    const dur = RG.Dice.getValue('1d6');
    RG.Component.addToExpirationComp(actor, dmgComp, dur);
};

/* Required for each plugin. */
pluginData = {
    type: 'spell',
    name: 'VoidBolt spell',
    onRemove: () => {
        RG.Spell.undefineSpell('VoidBolt');
    }
};

// Test section is optional, and can be executed with script
// bin/test-plugin.js -f <filename>
pluginData.test = (expect) => {
    const voidBolt = new VoidBolt();
    expect(voidBolt.getPower()).to.equal(15);
};
