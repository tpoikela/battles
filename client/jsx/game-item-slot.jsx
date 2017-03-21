
const React = require('react');

/** Component stores one item, renders its description and selects it if
 * clicked.*/
var GameItemSlot = React.createClass({

    setSelectedItem: function() {
        this.props.setSelectedItem(this.props.item);
    },

    render: function() {
        var item = this.props.item;
        var itemString = item.toString();
        return (
            <div className="inv-item-slot" onClick={this.setSelectedItem}>{itemString}</div>
        );
    }

});

module.exports = GameItemSlot;
