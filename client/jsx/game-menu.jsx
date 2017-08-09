
const React = require('react');

function padToWidth(w, text, marginLeft, padChar = '&nbsp;') {
    const textLen = text.length;
    const marginRight = w - textLen - marginLeft;
    return padChar.repeat(marginLeft) + text + padChar.repeat(marginRight);
}

function getPaddingLines(width, lineCount) {
    const padding = [];
    for (let i = 0; i < lineCount; i++) {
        const topElem = (
            <div className='cell-row-div-player-view' key={'id' + i}>
                <span className='cell-not-explored'
                    dangerouslySetInnerHTML={{__html: padToWidth(width, '', 0)}}
                />
            </div>
        );
        padding.push(topElem);
    }
    return padding;
}

/* Component is used to show in-game menus, for example when a player must
 * make a decision about something. */
class GameMenu extends React.Component {

    render() {
        const {menuObj, width, height} = this.props;

        const topLineCount = 3;
        const menuLineCount = Object.keys(menuObj).length;
        const bottomLineCount = height - topLineCount - menuLineCount;

        const paddingTop = getPaddingLines(width, topLineCount);
        const paddingBottom = getPaddingLines(width, bottomLineCount);

        const menuElem = Object.keys(menuObj).map(item => {
            const text = padToWidth(width, `[${item}] - ${menuObj[item]} `, 3);
            return (
                <div className='cell-row-div-player-view' key={item}>
                    <span className='game-menu-text-span'
                        dangerouslySetInnerHTML={{__html: text}}
                    />
                </div>
            );
        });

        return (
            <div
                className='game-board game-board-player-view'
            >
                {paddingTop}
                {menuElem}
                {paddingBottom}
            </div>
        );

    }
}

GameMenu.propTypes = {
    height: React.PropTypes.number,
    menuObj: React.PropTypes.object,
    width: React.PropTypes.number
};

module.exports = GameMenu;
