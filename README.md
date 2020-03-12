# Async Task Manager
> A JavaScript library for controlling asynchronous parallelism.

*其他语言版本： [简体中文](README.zh.md)*

## Background
`x-atm` is designed to help you control asynchronous tasks.
For example, in parallel file uploading, most browsers only support 6 paralle http requests. If you don't control async tasks(http request), it will block the request stack, and cause performance problem. But with `x-atm`, we can control the number of asynchronous requests to improve the upload efficiency.

## Basic usage
```javascript
const ATM = require('x-atm');
function handleAll() {
  console.log("all task resolved");
}

let task = new ATM({maxParallel: 4,resolve: handleAll, strict: true});
const asyncTask = (index) => {
  return new Promise((resolve, reject) => {
    let random = parseInt(Math.random() * 10000);
    setTimeout(() => {
      if (random > 5000) {
        resolve('value is ' + random + ' current task ' + index);
      } else {
        reject('reason is ' + random + ' current task ' + index);
      }
    }, random);
  });
}
asyncTask.resolve = console.log
asyncTask.reject = console.log
for(let i = 0; i < 10; i++) {
  task.push(asyncTask);
}

task.start();
```