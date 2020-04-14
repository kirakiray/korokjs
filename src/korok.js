

((root, factory) => {
    "use strict"
    if (typeof exports === 'object') {
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        define(factory);
    } else {
        root.Korok = factory();
    }
})(this, () => {
    "use strict";

    class Korok {
        constructor() {
            // 远程链接地址
            this.url = "localhost:8811";
        }

        // 初始化
        init() {
            // 多窗口数据数据同步库
            const socket = this.socket = new WebSocket(`ws://${this.url}`);

            socket.onopen = (e) => {
                socket.send('Hello Server!');
            }

            socket.onmessage = (e) => {
                console.log('Message from server ', e.data);
            }
        }
    }

    return Korok;
});