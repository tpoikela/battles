/* Contains code for handling plugin loading/removing and status management. */

/* Each plugin is associated with an entry which stores the plugin code. */
export class PluginEntry {

    constructor(json) {
        this._enabled = false;
        this._type = json.type;
        this._data = json.data;
        this._name = json.name;
        this._description = json.description;
        this._status = 'UNLOADED';
        this._errorMsg = '';

        this._onLoad = json.onLoad;
        this._onRemove = json.onRemove;
    }

    getData() {return this._data;}

    hasError() {
        return (/ERROR/).test(this._status);
    }

    getErrorMsg() {
        return this._errorMsg;
    }

    disable() {
        if (this._enabled) {
            if (typeof this._onRemove === 'function') {
                try {
                    this._onRemove();
                    this._status = 'UNLOADED';
                    this._errorMsg = '';
                }
                catch (e) {
                    this._errorMsg = e.message;
                    this._status = 'REMOVE ERROR';
                }
            }
            this._enabled = false;
        }
    }

    enable() {
        if (!this._enabled) {
            if (typeof this._onLoad === 'function') {
                try {
                    this._onLoad();
                    this._status = 'LOADED';
                    this._errorMsg = '';
                }
                catch (e) {
                    this._errorMsg = e.message;
                    this._status = 'LOAD ERROR';
                }
            }
            this._enabled = true;
        }
    }

    getName() {
        return this._name;
    }

    isEnabled() {
        return this._enabled;
    }

}

/* Manager contains list of plugins that have been loaded. */
export default class PluginManager {

    constructor() {
        this._plugins = [];
        this._errorMsg = '';
    }

    readJSON(json) {
        const entry = new PluginEntry(json);
        this._plugins.push(entry);
        return entry;
    }

    /* Returns true if any of the plugins are enabled. */
    anyPluginsEnabled() {
        for (let i = 0; i < this._plugins.length; i++) {
            if (this._plugins[i].isEnabled()) {
                return true;
            }
        }
        return false;
    }

    findPlugin(name) {
        return this._plugins.find(p => p._name === name);
    }

    getPlugins() {
        return this._plugins.slice();
    }

    getPluginNames() {
        return this._plugins.map(p => p._name);
    }

    addPlugin(pluginData) {
        const entry = new PluginEntry(pluginData);
        this._plugins.push(entry);
        return entry;
    }

    deletePlugin(name) {
        const index = this._plugins.findIndex(p => p.getName() === name);
        if (index >= 0) {
            this._plugins[index].disable();
            this._plugins.splice(index, 1);
        }
    }

    disablePlugin(name) {
        const plugin = this.findPlugin(name);
        if (plugin) {
            plugin.disable();
        }
    }

    enablePlugin(name) {
        const plugin = this.findPlugin(name);
        if (plugin) {
            plugin.enable();
        }
    }

    /* Loads a script using eval. */
    loadScript(text) {
        try {
            /* eslint-disable */
            let pluginData = null;
            eval(text); // EVIL!!
            if (pluginData) {
                pluginData.data = text;
                this.addPlugin(pluginData);
                this._errorMsg = '';
            }
            else {
                this._errorMsg = 'no pluginData specified in the script';
            }
            /* eslint-enable */
        }
        catch (e) {
            this._errorMsg = e.message;
        }
    }
}
