
const React = require('react');

const GameItemSlot = require('./game-item-slot');

/** Component which shows the inventory items.*/
const GameItems = React.createClass({

    propTypes: {
        inv: React.PropTypes.object,
        setSelectedItem: React.PropTypes.func.isRequired,
        maxWeight: React.PropTypes.number,
        eqWeight: React.PropTypes.number
    },

    render: function() {
        const inv = this.props.inv;
        const items = [];
        const setSelectedItem = this.props.setSelectedItem;
        let totalWeight = inv.getWeight() + this.props.eqWeight;
        totalWeight = totalWeight.toFixed(2);
        const maxWeight = this.props.maxWeight;

        let item = inv.first();
        let key = 0;
        while (item !== null && typeof item !== 'undefined') {
            items.push(<GameItemSlot
                item={item}
                key={key}
                setSelectedItem={setSelectedItem}
            />);
            item = inv.next();
            ++key;
        }
        return (
            <div>
                <p>Items: {totalWeight} kg (max {maxWeight} kg)</p>
                {items}
            </div>
        );
    }

});

module.exports = GameItems;
