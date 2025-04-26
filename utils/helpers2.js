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

class BoolCache {
    constructor(maxSize = 10) {
        this.maxSize = maxSize;
        this.cache = [];
    }

    add(isSuccess) {
        this.cache.push(!!isSuccess);
        if (this.cache.length > this.maxSize) {
            this.cache.shift();
        }
    }

    getAll() {
        return [...this.cache];
    }

    clear() {
        this.cache = [];
    }

    getLast(count) {
        if (count <= 0) return [];
        return this.cache.slice(-count);
    }

    areLastAll(count, value = true) {
        const last = this.getLast(count);
        if (last.length < count) return false;
        return last.every(v => v === value);
    }
}

module.exports = {
    randomChoice,
    randomInt,
    randomSleep,
    sleep,
    BoolCache
}