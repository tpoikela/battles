
/* Script demonstrates how to create new game using a script. This script is
 * loaded from top menu via 'Load from script'. These kinds of scripts must set
 * either levels or game variable. The full RG namespace is exposed to the
 * script so you can use any functions inside RG here. See client/src/battles
 * for full list of imported files.
 */

// Don't use var/let/const
levels = createLevels(1);

function createLevels(n) {
    const factLevel = new RG.FactoryLevel();
    // We can populate/edit the level here as we wish
    return [factLevel.createLevel('empty', 20, 20)];
}
