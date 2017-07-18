
const React = require('react');

/** A row component which holds a number of cells. {{{2 */
const GameRow = React.createClass({

    propTypes: {
        rowClasses: React.PropTypes.array,
        rowChars: React.PropTypes.array,
        onCellClick: React.PropTypes.func,
        y: React.PropTypes.number,
        startX: React.PropTypes.number,
        rowClass: React.PropTypes.string
    },

    shouldComponentUpdate: function(nextProps) {
        if (this.props.rowClass !== nextProps.rowClass) {
            return true;
        }

        if (this.props.rowClasses.length === nextProps.rowClasses.length) {
            if (this.props.rowChars.length === nextProps.rowChars.length) {

                const classesLen = this.props.rowClasses.length;
                for (let i = 0; i < classesLen; i++) {
                    if (this.props.rowClasses[i] !== nextProps.rowClasses[i]) {
                        return true;
                    }
                }

                const charsLen = this.props.rowChars.length;
                for (let j = 0; j < charsLen; j++) {
                    if (this.props.rowChars[j] !== nextProps.rowChars[j]) {
                        return true;
                    }
                }

            }
            return false;
        }
        return true;
    },

    onCellClick: function(x, y) {
        this.props.onCellClick(x, y);
    },

    render: function() {
        const y = this.props.y;
        const startX = this.props.startX;
        const rowClass = this.props.rowClass;

        const rowCells = this.props.rowClasses.map( (className, index) => {
            const cellChar = this.props.rowChars[index];
            const cellX = startX + index;

            return (
                <span
                    className={className}
                    key={index}
                    onClick={this.onCellClick.bind(this, cellX, y)}
                >
                    {cellChar}
                </span>
            );
        });


        return (
            <div className={rowClass}>
                {rowCells}
            </div>
        );
    }

}); // }}} GameRow

module.exports = GameRow;

