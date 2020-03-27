global.window = global;
global.actionMixer = {action: 0};
global.atob = function(a) {
    return Buffer.from(a).toString('base64');
};
global.btoa = function(b) {
    Buffer.from(b64Encoded, 'base64').toString();
};
global.account = {
    hasDLC: () => true,
    hasDLCBonus: () => true
};
global.playSound = () => {};
