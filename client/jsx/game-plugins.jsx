
import React from 'react';
import PropTypes from 'prop-types';

const checkbox = (name, cb, isChecked) => (
    <input checked={isChecked} name={name} onChange={cb} type='checkbox'/>
);

const deleteButton = (cb) => (
    <button className='btn btn-danger' onClick={cb}>Delete</button>
);

export default class GamePlugins extends React.Component {

    render() {
        const {plugins} = this.props;
        const pluginList = this.renderPluginList(plugins);

        return (
            <div className='plugin-manager'>
                <h2>Plugin manager</h2>
                <p>You can enable/disable loaded plugins from here.</p>
                {pluginList}
            </div>
        );
    }

    onDelete(pluginName) {
        this.props.pluginManager.deletePlugin(pluginName);
        this.props.updatePluginList();
    }

    onChange(evt) {
        const isChecked = evt.target.checked;
        const pluginName = evt.target.name;
        console.log('pluginName', pluginName);
        console.log('evt.target.value', evt.target.value);
        console.log('evt.target.checked:', isChecked);
        if (isChecked) {
            this.props.pluginManager.enablePlugin(pluginName);
        }
        else {
            this.props.pluginManager.disablePlugin(pluginName);
        }
        this.props.updatePluginList();
    }

    renderPluginList(list) {
        const pluginListElem = list.map(plugin => {
            const pluginName = plugin.getName();
            const cb = this.onChange.bind(this);
            const deleteCb = this.onDelete.bind(this, pluginName);
            const isChecked = plugin.isEnabled();

            return (
            <tr key={pluginName}>
                <td>{checkbox(pluginName, cb, isChecked)}</td>
                <td>{pluginName}</td>
                <td>{plugin._description}</td>
                <td>{plugin._type}</td>
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

GamePlugins.propTypes = {
    plugins: PropTypes.array.isRequired,
    pluginManager: PropTypes.object.isRequired,
    updatePluginList: PropTypes.func.isRequired
};
