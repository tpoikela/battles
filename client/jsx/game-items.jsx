
const React = require('react');

const GameItemSlot = require('./game-item-slot');

/** Component which shows the inventory items.*/
var GameItems = React.createClass({

    render: function() {
        var inv = this.props.inv;
        var item = inv.first();
        var items = [];
        var setSelectedItem = this.props.setSelectedItem;
        var totalWeight = inv.getWeight() + this.props.eqWeight;
        totalWeight = totalWeight.toFixed(2);
        var maxWeight = this.props.maxWeight;

        var key = 0;
        while (item !== null && typeof item !== "undefined") {
            var type = item.getType();
            var we = item.getWeight();
            items.push(<GameItemSlot key={key} setSelectedItem={setSelectedItem} item={item} />);
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
