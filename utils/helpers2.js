const { setTimeout: sleep } = require('timers/promises');

const randomChoice = (array) => {
    return array[Math.floor(Math.random() * array.length)];
}

const randomInt = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const randomSleep = async (min, max) => {
    (min && !max) ? await sleep(min * 1000) : await sleep(randomInt(min * 1000, max * 1000));
}

module.exports = {
    randomChoice,
    randomInt,
    randomSleep,
    sleep,
}