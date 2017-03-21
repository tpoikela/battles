
const React = require('react');

/** Component for displaying in-game messages.*/
var GameMessages = React.createClass({

    styleToClassName: {
        prim: "text-primary",
        info: "text-info",
        warn: "text-warning",
        danger: "text-danger",
        success: "text-success",
    },

    shouldComponentUpdate: function(nextProps, nextState) {
        return nextProps.message.length > 0;
    },

    render: function() {
        var message = this.props.message;
        var styles = this.styleToClassName;
        var seenCells = this.props.visibleCells;

        var msgList = message.map( function(val, itemIndex) {
            var className = styles[val.style];
            var index = 1;

            if (!val.hasOwnProperty("seen")) {
                if (val.hasOwnProperty("cell")) {
                    index = seenCells.indexOf(val.cell);
                    if (index >= 0) val.seen = true;
                }
            }

            if (index >= 0 || val.seen) {
                return (<span key={itemIndex} className={className}>{val.msg}.</span>);
            }
        });

        return (
            <div className="game-messages">{msgList}</div>
        );
    },

});

module.exports = GameMessages;
