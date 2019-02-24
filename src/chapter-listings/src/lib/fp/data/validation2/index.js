import { decorate } from '../contract'

// https://folktale.origamitower.com/docs/v2.3.0/migrating/from-data.validation/
export default class Validation {
  #tag = 'Validation'
  constructor (value) {
    this._val = value // detect if called from a derived, otherwise throw exception new.target ?
    if (![Success.name, Failure.name].includes(new.target.name)) {
      throw new Error(
        `Can't directly constructor a Validation. Please use constructor Validation.of`
      )
    }
  }

  get value () {
    return this._val
  }

  /**
   * Returns the success branch (right bias)
   *
   * @param {Object} a Any value
   * @return {Success} Success
   */
  static Success (a) {
    return Success.of(a)
  }

  /**
   * Returns the left (failure) branch
   *
   * @param {Array} b Array containing a failure validation message
   * @return {Success} Failure
   */
  static Failure (b) {
    return Failure.of(b)
  }

  get isSuccess () {
    return false
  }

  get isFailure () {
    return false
  }

  isEqual (otherValidation) {}

  unsafeGet () {
    return this.value
  }

  getOrElse () {}

  get [Symbol.for('implements')] () {
    return ['map', 'ap', 'flatMap']
  }
}

export class Success extends Validation {
  #tag = 'Success'
  constructor (a) {
    super(a)
  }

  static of (a) {
    return decorate(new Success(a))
  }

  get isSuccess () {
    return true
  }

  get tag () {
    return this.#tag
  }
}

export class Failure extends Validation {
  #tag = 'Failure'
  constructor (b) {
    super(b)
  }

  get isFailure () {
    return true
  }

  static of (b) {
    return decorate(new Failure(b))
  }

  unsafeGet () {
    throw new Error(`Can't extract the value of a Failure`)
  }

  get tag () {
    return this.#tag
  }
}
