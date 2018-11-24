
import {expect} from 'chai';
import * as RG from '../../../client/src/battles';
import {PluginManager} from '../../../client/gui/plugin-manager';
import fs = require('fs');

describe('PluginManager', () => {

    let manager: PluginManager = null;

    beforeEach(() => {
        manager = new PluginManager();
    });

    it('can load external plugins from JSON', () => {
        const pluginJSON = {
            type: 'items',
            name: 'Creates a new weapon',
            data: [
                {name: 'Big sword', base: 'MeleeWeaponBase',
                    damage: '10d10'
                }
            ]
        };
        manager.readJSON(pluginJSON);

        const plugins = manager.getPlugins();
        expect(plugins).to.have.length(1);

        const parser = RG.ObjectShell.getParser();
        const bigSword = parser.createItem('Big sword');
        expect(bigSword.getType()).to.equal('weapon');
    });

    it('an load external plugins from script', () => {
        const allFiles = fs.readdirSync('plugin-examples');
        const jsPlugins = allFiles.filter(fname => /\.js$/.test(fname));

        jsPlugins.forEach(fname => {
            const pluginCode = fs.readFileSync('plugin-examples/' + fname);
            manager.loadScript(pluginCode.toString());

            const err = manager.getError();
            expect(err, 'No plugin error  while loading').to.equal('');

            let plugins = manager.getPlugins();
            expect(plugins).to.have.length(1);

            const plugin = plugins[0];

            plugin.enable();
            expect(plugin.isEnabled()).to.equal(true);

            plugin.disable();
            expect(plugin.isEnabled()).to.equal(false);

            manager.deletePlugin(plugin.getName());

            plugins = manager.getPlugins();
            expect(plugins).to.have.length(0);
        });
    });

    it('can be serialized and re-loaded with plugins', () => {
        const pluginCode = fs.readFileSync('plugin-examples/woodcutting.js');
        manager.loadScript(pluginCode.toString());
        const jsonPlugin = {
            type: 'actors',
            data: [{name: 'kobold'}]
        };
        manager.readJSON(jsonPlugin);

        manager.enableAll();
        const json = manager.toJSON();
        manager.disableAll();
        // TODO
        //
        const newPm = PluginManager.fromJSON(json);

        const plugins = newPm.getPlugins();
        expect(plugins).to.have.length(1);
    });

});
