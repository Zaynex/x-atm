# 异步任务管理
> 管理并行异步任务的 JavaScript 库。

*Read this in other language: [English](README.md)*

## 背景：
在做文件并行上传的时候，由于大部分浏览器对并行请求数量的限制（一般是6个），我们不能一次性将所有的文件块同时发出请求，否则会阻塞浏览器的请求（达到6个之后，后续都会一直 pending）。一旦用户对当前页面进行其他操作而触发网络请求，而该请求会由于之前的请求未结束而 pending。因为请求没有被执行，可能视图层会一直处于加载状态，直到之前的请求结束才会处理该请求并更新视图，漫长的等待会对用户体验造成极大伤害。

因此，我们希望有一个队列管理的机制，可以帮我们限制每次并行的请求数量，每当上一个请求结束之后，马上执行下一个请求，保证每次可以并行一定的请求数，这样就可以最大程度保证文件并行上传的速度。

除此之外，我们可能还需要查询文件并行上传的进度，针对请求失败的文件块重传请求等等。


## ATM(Async Task Manager)

从文件并行上传的角度看（从满足业务需求出发，轮子才有意义嘛），一个异步任务管理的要求如下：
1. 设定最大的任务并行数
2. 每当任务完成后，马上加入下一个任务，以维持最大并行任务数
3. 支持查询请求进度
4. 支持任务失败后恢复执行（这是最大的亮点）

以上4点就是 ATM 设计的核心思想。

首先，我们来看看怎么使用。
假设我们有 10 个异步任务，每次并行4个异步任务。

```
const ATM = require('x-atm');
const task = new ATM({maxParallel: 4});
```

我们初始化一个 ATM 的实例：
第一个参数表示设定的最大任务并行数，
第二个参数，表示是否严格执行队列的任务直到任务完成。在需求层面可以理解为假设一个请求文件块上传失败了，是否再次执行该请求直到该文件块上传成功为止。

接下来，我们要模拟一个异步的任务。
```
const asyncTask = () => {
  return new Promise((resolve, reject) => {
    let random = parseInt(Math.random() * 10000);
    setTimeout(() => {
      if (random > 5000) {
        resolve('resolve, value is ' + random);
      } else {
        reject('reject, reason is ' + random);
      }
    }, random);
  });
}
```

注意两点：
1. 异步任务需要返回的是 promise
2. 我们用随机数是否大于 5000 来模拟异步任务成功或失败


我们一共有10个异步任务需要执行，把 10 个异步任务塞到队列里。
```
for(let i = 0; i < 10; i++) {
  task.push(asyncTask);
}
```

最后，执行该异步任务队列。
```
task.start();
```

注意，如果你希望在异步任务完成之后，进行一些处理，你可以直接在异步任务的函数名 resolve/reject 属性设置方法
```
asyncTask.resolve = console.log
asyncTask.reject = console.log
```

**不推荐在 asyncTask 里面的 promise 后面直接加 then, 因为如果在 asyncTask 中的 then 中已经被处理了，当 ATM 的队列里再进行 then 处理时可能会影响恢复队列的判断。**


完整的代码如下
```
const ATM = require('x-atm');
let task = new ATM({maxParallel: 4});

const asyncTask = () => {
  return new Promise((resolve, reject) => {
    let random = parseInt(Math.random() * 10000);
    setTimeout(() => {
      if (random > 5000) {
        resolve('resolve, value is ' + random);
      } else {
        reject('reject, reason is ' + random);
      }
    }, random);
  });
}
asyncTask.resolve = console.log;
asyncTask.reject = console.log;

for(let i = 0; i < 10; i++) {
  task.push(asyncTask);
}
task.start();
```

想要了解更多配置参数，请查看源码或查看仓库的 example。

此外，还有一些接口是例子中没有呈现但已经支持的
```
task.stop();     // 任务暂停
task.continue(); // 任务恢复
task.next();     // 暂停后可单独执行下一个任务
task.query();    // 查询任务执行进展，包括失败的任务，和以及执行的任务
task.reset();    // 清空任务队列，释放内存
```

## 用 ATM 管理执行需要懒加载的资源
其实只是把最大的并行数设置为1，那么就是退化的常见的文件分片上传需求。

当然重点要和大家分享的是，在某些时候，我们希望能够在浏览器空闲时可以手动控制加载一些资源（比如图片）

其执行的流程大致如下
1. 找到合适的时机（一般是 window.onload 或者 componentDidMount）
2. 设定异步任务队列并执行（比如加载 16个图片，每次并行加载3 个）

这样达到的效果是，既不超过浏览器并行请求限制，又在背后合理得加载资源。
下次用户点击时请求的图片资源由于早已经在缓存中，打开时就不会出现图片闪现或一块一块渲染出图片的视觉效果。

通过 ATM 来管理执行需要懒加载的资源，那简直就是完美到爆炸。


## 实现分析
源码采用 TypeScript 编写，抛去接口定义，源码估计也就 200 行左右。
推荐直接阅读源码，有任何问题也欢迎交流。
