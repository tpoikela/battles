
export class PluginEntry {

    constructor(json) {
        this._enabled = true;
        this._type = json.type;
        this._data = json.data;
        this._name = json.name;
        this._description = json.description;

        this._onLoad = json.onLoad;
        this._onRemove = json.onRemove;
    }

    getData() {return this._data;}

    disable() {
        if (this._enabled) {
            if (typeof this._onRemove === 'function') {
                this._onRemove();
            }
            this._enabled = false;
        }
    }

    enable() {
        if (!this._enabled) {
            if (typeof this._onLoad === 'function') {
                this._onLoad();
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

export default class PluginManager {

    constructor() {
        this._plugins = [];
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
}
