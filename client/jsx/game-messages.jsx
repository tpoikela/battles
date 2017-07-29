
const React = require('react');

/** Component for displaying in-game messages.*/
const GameMessages = React.createClass({

    styleToClassName: {
        prim: 'text-primary',
        info: 'text-info',
        descr: 'text-muted',
        warn: 'text-warning',
        danger: 'text-danger',
        success: 'text-success'
    },

    shouldComponentUpdate: function(nextProps) {
        return nextProps.message.length > 0;
    },

    propTypes: {
        message: React.PropTypes.array,
        visibleCells: React.PropTypes.array,
        saveInProgress: React.PropTypes.bool,
        showAll: React.PropTypes.bool
    },

    render: function() {
        const message = this.props.message;
        const styles = this.styleToClassName;
        const seenCells = this.props.visibleCells;
        const showAll = this.props.showAll;

        let msgList = <span>Saving the game...</span>;
        if (!this.props.saveInProgress) {
            msgList = message.map( function(val, itemIndex) {
                const className = styles[val.style];
                let index = 1;

                if (showAll) {
                    val.seen = true;
                }
                else if (!val.hasOwnProperty('seen')) {
                    if (val.hasOwnProperty('cell')) {
                        index = seenCells.indexOf(val.cell);
                        if (index >= 0) {val.seen = true;}
                    }
                }

                const count = val.count === 1 ? '' : ` (x${val.count})`;
                let fullMsg = `${val.msg}${count}`;

                if (!fullMsg.match(/.$/)) {
                    fullMsg += '.';
                }
                fullMsg += '. ';

                if (index >= 0 || val.seen) {
                    return (
                        <span
                            className={className}
                            key={itemIndex}
                        >
                            {fullMsg}
                        </span>
                    );
                }
                return null;
            });
        }

        return (
            <div className='game-messages'>{msgList}</div>
        );
    }

});

module.exports = GameMessages;
