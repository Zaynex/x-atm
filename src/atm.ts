const emptyFun = () => {}

export default class ATM {
  private maxParallel: number // max paralle, usually control the number of asynchronous tasks, eg: http requests
  private queueResolve: Function // all the tasks resolved
  private queueReject: Function
  private strict: boolean // if strict is true, it will re-execute the failed tasks after all tasks executed
  private taskQueue: Array<ATMTask> = [] // push the task into this takQueue
  private queueIndex = 0 // give one task a index according to the order of pushing
  private currTaskIndex = 0 // current task executed index
  private currTaskCount = 0 // current tasks count
  private _stop = false // stop helper
  private failedQueue: Array<ATMTask> = [] // failedQueue, push the failed task to this queue
  private maxRetry: number
  public maxTaskQueueLen = 100 // max taskQueue length
  public maxFailedQueueLen = 100 // max failedQueue length
  constructor(options: AtmOptions = {}) {
    this.maxParallel = options.maxParallel || 4
    this.strict = options.strict || false
    this.queueResolve = options.resolve || emptyFun
    this.queueReject = options.reject || emptyFun
    this.maxRetry = 3
  }

  reset(force?: Boolean): ATM {
    if (force) {
      this.taskQueue = []
    } else {
      if (this.taskQueue.length) {
        this.taskQueue.forEach(atmTask => atmTask.restart())
      }
    }
    this.currTaskIndex = 0
    this.failedQueue = []
    this.queueIndex = 0
    this._stop = false
    this.currTaskCount = 0
    return this
  }

  push(asyncTask: AsyncTask): ATM {
    if (this.taskQueue.length >= this.maxTaskQueueLen) {
      console.warn('Push asyncTask fail! Task The number of tasks exceeded the limit.')
      return this
    }
    if (asyncTask instanceof Function) {
      this.taskQueue.push(new ATMTask(asyncTask, false, this.queueIndex))
      this.queueIndex++
    }

    return this
  }

  start(): ATM {
    if (this._stop) return this
    let finalParallel = Math.min(this.taskQueue.length, this.maxParallel - this.currTaskCount)
    const begin = this.currTaskIndex
    const end = begin + finalParallel
    this.taskQueue.slice(begin, end).forEach(atmTask => {
      atmTask
        .task(atmTask.taskIndex)
        .then(
          (value: any) => this._resolve(atmTask, value),
          (reason: any) => this._reject(atmTask, reason)
        )
    })
    this.currTaskIndex += finalParallel - 1
    this.currTaskCount = finalParallel
    return this
  }

  stop(): ATM {
    this._stop = true
    return this
  }

  continue(): ATM {
    this._stop = false
    if (this.currTaskIndex < this.taskQueue.length) {
      this.start()
    } else {
      if (this.strict) {
        this.nextFailedQueue()
      }
    }
    return this
  }

  next(): ATM {
    this.currTaskIndex++
    const atmTask = this.taskQueue[this.currTaskIndex]
    if (!atmTask) return this
    this.currTaskCount++
    atmTask
      .task(atmTask.taskIndex)
      .then(
        (value: any) => this._resolve(atmTask, value),
        (reason: any) => this._reject(atmTask, reason)
      )
    return this
  }

  query(): Query {
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

  setParallel(parallel: number): ATM {
    this.maxParallel = parallel
    return this
  }

  setMaxTaskQueue(maxLen: number): ATM {
    this.maxTaskQueueLen = maxLen
    return this
  }

  setMaxFailedQueue(maxLen: number): ATM {
    this.maxFailedQueueLen = maxLen
    return this
  }

  private _resolve(atmTask: ATMTask | undefined, value: any) {
    if (!atmTask) return
    if (this._stop) return

    atmTask.finished = true
    atmTask.failed = false
    this.currTaskCount--
    if (atmTask.task.resolve) {
      const process = this.query()
      atmTask.task.resolve(value, {
        index: atmTask.taskIndex,
        retryCount: atmTask.retryCount,
        ...process
      })
    }
    if (this.currTaskIndex < this.taskQueue.length) {
      if (this.currTaskCount < this.maxParallel) {
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
    if (this._stop) return

    atmTask.finished = true
    atmTask.failed = true
    atmTask.retryCount += 1
    this.currTaskCount--

    // push to failedQueue before query
    if (this.strict) {
      if (atmTask.retryCount > this.maxRetry) {
        this._stop = true
        if (this.queueReject) {
          this.queueReject(
            `Task[${atmTask.taskIndex}] faild more than ${this.maxRetry} times in strict mode.`
          )
          return
        }
      } else {
        this.failedQueue.push(atmTask)
      }
    }

    if (atmTask.task.reject) {
      const process = this.query()
      atmTask.task.reject(reason, {
        index: atmTask.taskIndex,
        retryCount: atmTask.retryCount,
        ...process
      })
    }

    // if current task doesn't finish, continue
    if (this.currTaskIndex < this.taskQueue.length) {
      if (this.currTaskCount < this.maxParallel) {
        this.next()
      }
      return
    }

    // strict mode: task finished, but some task failed, retry it
    if (this.strict) {
      if (this.failedQueue.length) {
        this.nextFailedQueue()
        return
      }
    }

    this.checkQueueResolve()
  }

  private checkQueueResolve() {
    // auto clear
    let query = this.query()
    if (query.finished === query.count) {
      if (!this.strict || query.failed === 0) {
        this.queueResolve()
        this.reset(true)
      }
    }
  }

  private nextFailedQueue() {
    if (this._stop) return
    let failedQueueParalle = this.maxParallel - this.currTaskCount
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

export interface AtmOptions {
  maxParallel?: number
  resolve?: Function
  reject?: Function
  strict?: boolean
  maxRetry?: number
}
export interface AsyncTask {
  (taskIndex?: number): Promise<any>
  resolve?: PromiseHandler
  reject?: PromiseHandler
}

export interface PromiseHandler {
  (resolve: any, status: Status): void
}

interface Status extends Query {
  index: number
  retryCount: number
}
export interface Query {
  count: number
  finished: number
  failed: number
}

class ATMTask {
  task: AsyncTask
  finished: boolean
  taskIndex: number
  failed = false
  retryCount = 0
  constructor(task: AsyncTask, finished = false, taskIndex: number) {
    this.task = task
    this.finished = finished
    this.taskIndex = taskIndex
  }

  restart() {
    this.finished = false
    this.failed = false
    this.retryCount = 0
  }
}
