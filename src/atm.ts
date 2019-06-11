// Import here Polyfills if needed. Recommended core-js (npm i -D core-js)
// import "core-js/fn/array.find"
// ...
export default class ATM {
  private maxParalle: number // max paralle, usually control the number of asynchronous tasks, eg: http requests
  private queueResolve: Function // all the tasks resolved
  private strict: boolean // if strict is true, it will re-execute the failed tasks after all tasks executed
  private taskQueue: Array<ATMTask> = [] // push the task into this takQueue
  private queueIndex = 0 // give one task a index according to the order of pushing
  private currTaskIndex = 0 // current task executed index
  private currTaskCount = 0 // current tasks count
  private _stop = false // stop helper
  private executed = false // check if taskQueue is executed
  private failedQueue: Array<ATMTask> = [] // failedQueue, push the failed task to this queue
  public reset: (force?: boolean) => void
  constructor(maxParalle = 3, strict = true, queueResolve: Function) {
    this.maxParalle = maxParalle
    this.strict = strict
    this.queueResolve = queueResolve
    this.reset = (force = true) => {
      if (force) {
        this.taskQueue = []
      } else {
        if (this.taskQueue.length) {
          this.taskQueue.forEach(atmTask => atmTask.restart())
        }
      }
      this.currTaskIndex = 0
      this.currTaskCount = 0
      this._stop = false
      this.executed = false
      this.failedQueue = []
      this.queueIndex = 0
    }
    this.reset()
  }

  push(asyncTask: AsyncTask | AsyncTaskObj): void {
    if (this.executed) {
      console.warn("Unaviable push.Can't push asyncTask to queue when task start.")
      return
    }
    if (asyncTask instanceof Function) {
      this.taskQueue.push(new ATMTask(asyncTask, false, this.queueIndex))
      this.queueIndex++
    }
  }

  start() {
    if (this.executed) {
      console.warn('task already start.')
      return
    }

    this.executed = true
    let finalParalle = Math.min(this.taskQueue.length, this.maxParalle)
    this.taskQueue.slice(0, finalParalle).forEach(atmTask => {
      atmTask
        .task(atmTask.taskIndex)
        .then(
          (value: any) => this._resolve(atmTask, value),
          (reason: any) => this._reject(atmTask, reason)
        )
    })
    this.currTaskIndex = finalParalle - 1
    this.currTaskCount = finalParalle
  }

  stop() {
    this._stop = true
  }

  continue() {
    this._stop = false
    if (this.currTaskIndex < this.taskQueue.length) {
      this.next()
    } else {
      if (this.strict) {
        this.nextFailedQueue()
      }
    }
  }

  next() {
    this.currTaskIndex++
    const atmTask = this.taskQueue[this.currTaskIndex]
    if (!atmTask) return
    this.currTaskCount++
    atmTask
      .task(atmTask.taskIndex)
      .then(
        (value: any) => this._resolve(atmTask, value),
        (reason: any) => this._reject(atmTask, reason)
      )
  }

  query() {
    const taskQueueReducer = (key: 'finished' | 'failed') => {
      return this.taskQueue.reduce(function(accumulator: Array<ATMTask>, currentValue) {
        accumulator = currentValue[key] ? accumulator.concat(currentValue) : accumulator
        return accumulator
      }, [])
    }

    let finishedQueue = taskQueueReducer('finished')
    let failedQueue = taskQueueReducer('failed')
    return {
      finished: finishedQueue.length,
      failed: failedQueue.length,
      count: this.taskQueue.length
    }
  }

  private _resolve(atmTask: ATMTask | undefined, value: any) {
    if (!atmTask) return
    if (atmTask.task.resolve) {
      atmTask.task.resolve(value)
    }
    atmTask.finished = true
    atmTask.failed = false
    this.currTaskCount--

    if (this._stop) return
    if (this.currTaskIndex < this.taskQueue.length) {
      if (this.currTaskCount < this.maxParalle) {
        this.next()
      }
      return
    }

    if (this.strict) {
      if (this.failedQueue.length) {
        this.nextFailedQueue()
      }
    }

    this.checkQueueResolve()
  }

  private _reject(atmTask: ATMTask | undefined, reason: any) {
    if (!atmTask) return
    if (atmTask.task.reject) {
      atmTask.task.reject(reason)
    }

    atmTask.finished = true
    atmTask.failed = true
    this.currTaskCount--

    if (this.strict) {
      this.failedQueue.push(atmTask)
    }

    if (this._stop) return
    if (this.currTaskIndex < this.taskQueue.length) {
      if (this.currTaskCount < this.maxParalle) {
        this.next()
      }
      return
    }

    if (this.strict) {
      if (this.failedQueue.length) {
        this.nextFailedQueue()
        return
      }
    }

    this.checkQueueResolve()
  }

  private checkQueueResolve() {
    if (!this.queueResolve) return
    let query = this.query()
    if (query.finished === query.count) {
      if (!this.strict) {
        this.queueResolve()
        return
      }
      if (query.failed === 0) {
        this.queueResolve()
      }
    }
  }

  private nextFailedQueue() {
    if (this._stop) {
      return
    }
    let failedQueueParalle = this.maxParalle - this.currTaskCount
    for (let i = 0; i < failedQueueParalle; i++) {
      this.executeFailedTask()
    }
  }

  private executeFailedTask() {
    if (!this.failedQueue.length) return
    let atmTask = this.failedQueue.shift()
    if (!atmTask) return
    atmTask
      .task(atmTask.taskIndex)
      .then(
        (value: any) => this._resolve(atmTask, value),
        (reason: any) => this._reject(atmTask, reason)
      )
    this.currTaskCount++
  }
}

export interface AsyncTaskObj {
  (taskIndex?: number): Promise<any>
  resolve?: Function
  reject?: Function
}

export interface AsyncTask {
  (taskIndex?: number): Promise<any>
  resolve?: Function
  reject?: Function
}

class ATMTask {
  task: AsyncTask
  finished: boolean
  taskIndex: number
  failed = false
  constructor(task: AsyncTask, finished = false, taskIndex: number) {
    this.task = task
    this.finished = finished
    this.taskIndex = taskIndex
  }

  restart() {
    this.finished = false
  }
}
