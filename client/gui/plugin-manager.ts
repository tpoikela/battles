/* Contains code for handling plugin loading/removing and status management. */

export interface PluginData {
    [key: string]: any;
}

/* Each plugin is associated with an entry which stores the plugin code. */
export class PluginEntry {

    public _enabled: boolean;
    public _type: string;
    public _data: PluginData;
    public _name: string;
    public _description: string;
    public _status: string;
    public _errorMsg: string;

    public _onLoad: () => void;
    public _onRemove: () => void;

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

    public getData() {return this._data;}

    public hasError() {
        return (/ERROR/).test(this._status);
    }

    public getErrorMsg() {
        return this._errorMsg;
    }

    public disable() {
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

    public enable() {
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

    public getName() {
        return this._name;
    }

    public isEnabled() {
        return this._enabled;
    }

}

/* Manager contains list of plugins that have been loaded. */
export default class PluginManager {
    public _plugins: PluginEntry[];
    public _errorMsg: string;

    constructor() {
        this._plugins = [];
        this._errorMsg = '';
    }

    public readJSON(json) {
        const entry = new PluginEntry(json);
        this._plugins.push(entry);
        return entry;
    }

    /* Returns true if any of the plugins are enabled. */
    public anyPluginsEnabled() {
        for (let i = 0; i < this._plugins.length; i++) {
            if (this._plugins[i].isEnabled()) {
                return true;
            }
        }
        return false;
    }

    public findPlugin(name) {
        return this._plugins.find(p => p._name === name);
    }

    public getPlugins() {
        return this._plugins.slice();
    }

    public getPluginNames() {
        return this._plugins.map(p => p._name);
    }

    public addPlugin(pluginData) {
        const entry = new PluginEntry(pluginData);
        this._plugins.push(entry);
        return entry;
    }

    public deletePlugin(name) {
        const index = this._plugins.findIndex(p => p.getName() === name);
        if (index >= 0) {
            this._plugins[index].disable();
            this._plugins.splice(index, 1);
        }
    }

    public disablePlugin(name) {
        const plugin = this.findPlugin(name);
        if (plugin) {
            plugin.disable();
        }
    }

    public enablePlugin(name) {
        const plugin = this.findPlugin(name);
        if (plugin) {
            plugin.enable();
        }
    }

    /* Loads a script using eval. */
    public loadScript(text) {
        try {
            /* eslint-disable */
            const pluginData = null;
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
