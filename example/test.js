const ATM = require('../dist/atm.umd.js');
function handleAll() {
  console.log("all tasks resolved");
  // task.reset();
}

let task = new ATM(4, true, handleAll);
const asyncTask = (index) => {
  return new Promise((resolve, reject) => {
    let random = parseInt(Math.random() * 10000);
    setTimeout(() => {
      // if (random > 5000) {
        resolve('value is ' + random + ' current task ' + index);
      // } else {
      //   reject('reason is ' + random + ' current task ' + index);
      // }
    }, random / 10);
  });
}
asyncTask.resolve = console.log
asyncTask.reject = console.log
for(let i = 0; i < 10; i++) {
  task.push(asyncTask);
  asyncTask.displayName = i;
}

task.start().push(asyncTask)

setTimeout(() => {
  task.push(asyncTask)
  .push(asyncTask)
  .push(asyncTask)
  .push(asyncTask)
  .push(asyncTask)
  task.stop()
    .push(asyncTask)
    .push(asyncTask)
    .push(asyncTask)
    .push(asyncTask)
    .push(asyncTask)
  setTimeout(() => {
    console.log('continue');
    task.continue();
  }, 2000);
  task.push(asyncTask)
    .push(asyncTask)
    .push(asyncTask)
    .push(asyncTask)
    .push(asyncTask)
    .push(asyncTask)
    .push(asyncTask)
    .start();

}, 10000)