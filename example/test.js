const ATM = require('../dist/atm.umd.js');
function handleAll() {
  console.log("all task resolved");
}
function handleResolve(data) {
  console.log("task resolved", data);
  return data;
}
function handleReject(reason) {
  console.log("task reject" + reason);
  return reason;
}

let task = new ATM(4, true, handleAll);
function MockTest() {
  for (let i = 0; i < 10; i++) {
    task.push(signleTask);
  }
  // index 是根据插入的队列顺序获取的
  // 不能直接在 promise 后面跟 then 否则的话会阻断 task 内恢复操作的管理
  function signleTask(index) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        let random = Math.random() * 10;
        if (random > 5) {
          resolve(random + 'current task ' + index);
        } else {
          reject(random + 'current task ' + index);
        }
      }, index * 1000);
    });
  }
  signleTask.resolve = handleResolve;
  signleTask.reject = handleReject;
  signleTask.maxCall = 2;
  task.start();
}

MockTest();