const ATM = require('../dist/atm.umd.js')
function handleAll() {
  console.log('all tasks resolved')
}

let task = new ATM({
  strict: true,
  maxRetry: 5,
  resolve: handleAll,
  reject: handleRejct,
  maxParallel: 4
})

function handleRejct(e) {
  console.log(e)
}

const asyncTask = index => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const random = parseInt(Math.random() * 10 + 1)
      if (random > 5) {
        resolve('value is ' + random + ' current task ' + index)
      } else {
        reject('reason is ' + random + ' current task ' + index)
      }
    }, 1000)
  })
}
asyncTask.resolve = console.log
asyncTask.reject = console.log
for (let i = 0; i < 5; i++) {
  task.push(asyncTask)
}

task.start()

// setTimeout(() => {
//   task.push(asyncTask)
//   .push(asyncTask)
//   .push(asyncTask)
//   .push(asyncTask)
//   .push(asyncTask)
//     .push(asyncTask)
//     .push(asyncTask)
//     .push(asyncTask)
//     .push(asyncTask)
//     .push(asyncTask)
//     .start()
//   // setTimeout(() => {
//   //   console.log('continue');
//   //   task.continue();
//   // }, 2000);
//   // task.push(asyncTask)
//   //   .push(asyncTask)
//   //   .push(asyncTask)
//   //   .push(asyncTask)
//   //   .push(asyncTask)
//   //   .push(asyncTask)
//   //   .push(asyncTask)
//   //   .start();

// }, 10000)
