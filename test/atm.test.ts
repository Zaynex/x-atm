import ATM, { AsyncTask } from '../src/atm'

const wait = (timer: number) =>
  new Promise(resolve => {
    setTimeout(() => {
      resolve()
    }, timer)
  })

async function asyncTask() {
  await wait(1000)
  await '3123'
}

async function randomTask() {
  await wait(3000)
  if(Math.random() * 10 < 5) {
    throw false
  }
  await true
}
/**
 * ATM test
 */

describe('ATM query', () => {
  test('query', () => {
    const atm = new ATM()
    const query = atm.query()
    expect(query.count).toBe(0)
    expect(query.failed).toBe(0)
    expect(query.finished).toBe(0)
  })
})

describe('ATM push', () => {
  const atm = new ATM()
  test('push task', () => {
    atm.push(asyncTask)
    expect(atm.query().count).toBe(1)
    expect(atm.query().failed).toBe(0)
    expect(atm.query().finished).toBe(0)
  })
})

describe('ATM reset', () => {
  const atm = new ATM()
  test('reset force', () => {
    atm.push(asyncTask)
    atm.push(asyncTask)
    atm.reset(true)
    expect(atm.query().count).toBe(0)
  })
  test('reset normal', () => {
    atm.push(asyncTask)
    atm.push(asyncTask)
    atm.reset()
    expect(atm.query().count).toBe(2)
  })
})

describe('ATM start', () => {

  test('start normal', () => {
    const atm = new ATM()
    expect(atm.start()).toBeInstanceOf(ATM)
  })

  test('check resolve task', () => {
    let i = 0;
    const resolve = () => {
      expect(i).toBe(3)
    }
    const atm = new ATM({resolve})
    let task: AsyncTask = asyncTask
    task.resolve = (value) => {
      i++
      expect(atm.query().finished).toBe(i)
    }
    atm.push(task)
    atm.push(task)
    atm.push(task)
    atm.start()
  })

  test('strict', () => {
    let atm: ATM;
    const resolve = () => {
      expect(atm.query().failed).toBe(0)
    }
    const reject = () => {
      expect(atm.query().failed).toBeGreaterThanOrEqual(1)
    }
    atm = new ATM({strict: true, maxRetry: 4, resolve, reject})
    for(let i = 0; i < 10; i++) {
      let asyncTask:AsyncTask = randomTask
      asyncTask.reject = (reason, {retryCount}) => {
        expect(reason).toBe(false)
        expect(retryCount).toBeLessThan(4)
      }
      atm.push(randomTask)
    }
    atm.start();
  })
})
