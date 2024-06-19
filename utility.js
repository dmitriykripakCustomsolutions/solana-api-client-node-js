function pause(milliseconds) {
    const start = Date.now();
    while (Date.now() - start < milliseconds) {
        // Do nothing
    }
}


module.exports = {
    pause
};