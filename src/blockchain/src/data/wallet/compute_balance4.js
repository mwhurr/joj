import {
  compose,
  curry,
  filter,
  flatMap,
  map,
  not,
  prop,
  reduce
} from '../../../../adt/dist/combinators'
import Money from '../value/Money'
import balanceOf from './balance_of'

const computeBalance = curry((address, ledger) =>
  compose(
    Money.round,
    reduce(Money.sum, Money.zero()),
    map(balanceOf(address)),
    flatMap(prop('pendingTransactions')),
    filter(
      compose(
        not,
        prop('isGenesis')
      )
    ),
    Array.from
  )(ledger)
)
export default computeBalance