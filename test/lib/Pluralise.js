const test = require('tape')
const Pluralise = require('../../lib/util/Pluralise')

test('Pluralise', t => {
  t.plan(5)

  const oneThing = ['just one']
  const moreThanOneThing = ['more', 'than', 'one', 'thing']

  const singular = Pluralise.word('thing', oneThing)
  const plural = Pluralise.word('thing', moreThanOneThing)
  const pluralWithEs = Pluralise.word('finch', moreThanOneThing)

  const is = Pluralise.isAre(oneThing)
  const are = Pluralise.isAre(moreThanOneThing)

  t.strictEquals(singular, 'thing', 'singular is correct')
  t.strictEquals(plural, 'things', 'plural is correct')
  t.strictEquals(pluralWithEs, 'finches', 'plural with -es is correct')
  t.strictEquals(is, 'is', '‘is’ is returned as expected')
  t.strictEquals(are, 'are', '‘are’ is returned as expected')

  t.end()
})
