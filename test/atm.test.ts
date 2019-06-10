import ATM from '../src/atm'

/**
 * ATM test
 */
describe('ATM test', () => {
  it('ATMClass is instantiable', () => {
    expect(new ATM(3, true, () => {console.log('all task resolved')})).toBeInstanceOf(ATM)
  })
})
