
/* Code for handling keycode stuff. */

const KeyCode = {};

/* Get the keycode from an event. */
KeyCode.getKeyCode = function(evt) {
    const keyCode = typeof evt.which === 'number' ? evt.which : evt.keyCode;
    return keyCode;
};

module.exports = KeyCode;
