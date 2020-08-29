Plugin examples for Battles
===========================

This folder contains some examples how to extend the Battles game functionality.
Plugins can be loaded after the game has been launched without modifying the 
original source code of the game. However, when wrongly coded, they can easily
crash the whole game.

Select `Plugin -> Load script` from the top menu. Then choose the plugin file
you want to load. After selecting the file, the Plugin Manager will appear
with the plugin UNLOADED. This means the file was evaluated properly and no
syntax errors were found.

To activate the plugin, you must tick the box under `Enabled` column. After
ticking the box, the status should change the LOADED. If not, something went
wrong when trying to load the plugin.

Testing your plugin
-------------------

Run `npm install` first.

You can test the plugin you have created using a script `bin/test-plugin.js`. 

To try it out, you can invoke the following:
```
bin/test-plugin.js -f plugin-examples/spell-void-bolt.js
```

See the example how to define the tests. In short, you need `pluginData.test`
function defined, and this will be executed as the test code. The test will also
use the in-game PluginManager to load the plugin first to make sure there are no
issues in loading.
