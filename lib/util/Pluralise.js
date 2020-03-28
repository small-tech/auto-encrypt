class Pluralise {

  static requiresEs (word) {
    // Note: this is not meant to be comprehensive. It doesn’t take into consideration
    // ===== any of the exceptions in English around pluralising with -es vs -s
    // (https://www.merriam-webster.com/words-at-play/how-to-use-plural-s-and-es-exceptions-grammar).
    // Since this is currently only used in a console.log statement, I feel we can get away
    // with it for now ;)
    return ['s', 'x', 'z', 'sh', 'ch'].reduce((boolState, currentSuffix) => boolState || word.endsWith(currentSuffix), /* start with */ false)
  }

  static isAre (array) {
    return array.length === 1 ? 'is' : 'are'
  }

  static word (word, array) {
    return array.length === 1 ? word : `${word}${this.requiresEs(word) ? 'es' : 's'}`
  }
}

module.exports = Pluralise
