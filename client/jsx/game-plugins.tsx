
import * as React from 'react';

interface IGamePluginsProps {
    plugins: object[];
    pluginManager: any;
    updatePluginList(): void;
}

interface IGamePluginsState {
    msg: string;
}

const checkbox = (name, cb, isChecked) => (
    <input checked={isChecked} name={name} onChange={cb} type='checkbox'/>
);

const deleteButton = (cb) => (
    <button className='btn-xs btn-danger' onClick={cb}>Delete</button>
);

export default class GamePlugins extends React.Component {

    public state: IGamePluginsState;
    public props: IGamePluginsProps;

    constructor(props: IGamePluginsProps) {
        super(props);
        this.state = {
            msg: ''
        };
    }

    render() {
        const {plugins} = this.props;
        const pluginListElem = this.renderPluginList(plugins);
        const msgElem = this.renderMsg();

        return (
            <div className='plugin-manager'>
                <h2>Plugin manager</h2>
                <p>You can enable/disable loaded plugins from here. Tick the
                box below to enable plugin loading.</p>
                {msgElem}
                <div>
                    <input
                        id='plugin-maybe-unsafe'
                        name='input-unsafe'
                        type='checkbox'
                    />
                    I understand the risk of loading scripts from untrusted
                    sources.
                </div>
                {pluginListElem}
            </div>
        );
    }

    onDelete(pluginName) {
        this.props.pluginManager.deletePlugin(pluginName);
        this.props.updatePluginList();
    }

    isUnsafeChecked(): boolean {
        const unsafeID = '#plugin-maybe-unsafe';
        const elem = (document.querySelector(unsafeID) as HTMLInputElement);
        return elem.checked;
    }

    onChange(evt: React.SyntheticEvent): void {
        const unsafeChecked = this.isUnsafeChecked();
        if (unsafeChecked) {
            const target = evt.target as HTMLInputElement;
            const isChecked = target.checked;
            const pluginName = target.name;

            if (isChecked) {
                this.props.pluginManager.enablePlugin(pluginName);
            }
            else {
                this.props.pluginManager.disablePlugin(pluginName);
            }
            this.setState({msg: ''});
            this.props.updatePluginList();
        }
        else {
            const msg = 'You must tick the box before loading plugins.';
            this.setState({msg});
        }
    }

    renderMsg() {
        if (this.state.msg === '') {return null;}
        return (
            <p className='text-danger'>{this.state.msg}</p>
        );
    }

    renderPluginList(list) {
        const pluginListElem = list.map(plugin => {
            const pluginName = plugin.getName();
            const cb = this.onChange.bind(this);
            const deleteCb = this.onDelete.bind(this, pluginName);
            const isChecked = plugin.isEnabled();
            const statusStyle = plugin.hasError() ? 'text-danger' : '';

            return (
            <tr key={pluginName}>
                <td>{checkbox(pluginName, cb, isChecked)}</td>
                <td>{pluginName}</td>
                <td>{plugin._description}</td>
                <td>{plugin._type}</td>
                <td><span className={statusStyle}>{plugin._status}</span></td>
                <td>{deleteButton(deleteCb)}</td>
            </tr>
            );
        });

        return (
            <table className='table table-dark plugin-table'>
                <thead>
                    <tr>
                        <th>Enabled</th>
                        <th>Name</th>
                        <th>Description</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th/>
                    </tr>
                </thead>
                <tbody>
                {pluginListElem}
                </tbody>
            </table>
        );
    }
}

