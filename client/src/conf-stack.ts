
import RG from './rg';

import dbg = require('debug');
const debug = dbg('bitn:ConfStack');

interface GlobalConf {
    [key: string]: any;
}

/* An Object for managing configuration/scope stacks when creating a world. */
export class ConfStack {

    public globalConf: GlobalConf;
    public scope: string[];
    public confStack: any[];

    constructor() {
        this.globalConf = {};
        this.scope = [];
        this.confStack = [];
    }

    public setGlobalConf(conf) {
        this.globalConf = conf;
    }

    public getGlobalConf(): GlobalConf {
        return this.globalConf;
    }

    public getScope(): string[] {
        return this.scope;
    }

    /* Pushes the hier name and configuration on the stack. Config can be
    * queried with getConf(). */
    public pushScope(conf): void {
        this.scope.push(conf.name);
        this.confStack.push(conf);
        this.dbg('Pushed scope: ' + conf.name);
    }

    /* Removes given config and the name it contains from stacks. Reports an
    * error if removed name does not match the name in conf. */
    public popScope(conf): void {
        const name = conf.name;
        const poppedName = this.scope.pop();
        if (poppedName !== name) {
            RG.err('Factory.ConfStack', 'popScope',
                `Popped: ${poppedName}, Expected: ${name}`);
        }
        else {
            const currConf = this.confStack.pop();
            this.dbg('Popped scope: ' + currConf.name);
        }
    }

    /* Returns a config value. */
    public getConf(keys: string): any {
        // First travel the config stack from the top
        for (let i = this.confStack.length - 1; i >= 0; i--) {
            this.dbg(`[${i}] looking for |${keys}|`);
            if (this.confStack[i].hasOwnProperty(keys)) {
                this.dbg(`  >> [${i}] Found key |${keys}|`);
                return this.confStack[i][keys];
            }
        }

        // If nothing found, try the global configuration
        if (this.globalConf.hasOwnProperty(keys)) {
            return this.globalConf[keys];
        }

        return null;
    }

    public dbg(msg: string): void {
        if (debug.enabled) {
            RG.diag(msg);
        }
    }

}
