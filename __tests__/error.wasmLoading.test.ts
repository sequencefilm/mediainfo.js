import mediaInfoFactory from '..'
import { expectToBeError } from './utils'

beforeEach(() => {
  // Suppress the console.error noise emscripten prints when the wasm module
  // fails to load.
  jest.spyOn(console, 'error').mockImplementation(() => null)
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('Error on WASM loading', () => {
  it('should return error via callback', (done) => {
    mediaInfoFactory(
      { locateFile: () => 'file_does_not_exist.wasm' },
      () => {
        done.fail('Resolve callback should not fire')
      },
      (error) => {
        try {
          expectToBeError(error)
          expect(error.message).toMatch('no such file')
          done()
        } catch (assertionError) {
          done(assertionError)
        }
      }
    )
  })

  it('should return error via Promise', async () => {
    expect.assertions(2)
    try {
      await mediaInfoFactory({ locateFile: () => 'file_does_not_exist.wasm' })
    } catch (error) {
      expectToBeError(error)
      expect(error.message).toMatch('no such file')
    }
  })
})
