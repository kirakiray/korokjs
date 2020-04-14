// 用于拼接korok服务端程序
const WebSocket = require('faye-websocket'),
    http = require('http'),
    EventEmitter = require('events');

class KorokForest extends EventEmitter {
    // 默认端口
    port = 8811;
    // 存储tree数组
    trees = []
    constructor() {
        super();

        // 本地的permit函数，默认全部同行
        // 可以替换本地函数后提供拦截功能
        this.onpermit = (e) => new Promise(res => res({ pass: true }));
    }
    // 初始化函数
    init() {
        if (!this._server) {
            // 自带的server
            const server = this._server = http.createServer();

            server.on('upgrade', async (request, socket, body) => {
                if (WebSocket.isWebSocket(request)) {
                    // 等待获取通信
                    let permitData = await this.onpermit({
                        request
                    });

                    if (!permitData || !permitData.pass) {
                        // 授权不通过
                        socket.end();
                        return;
                    }

                    // 记录发送数据
                    let kt = new KorokTree({ request, socket, body });
                    this.trees.push(kt)
                }
            });

            server.listen(this.port);
        }
    }
}

class KorokTree extends EventEmitter {
    constructor({ request, socket, body }) {
        super();

        var ws = this.ws = new WebSocket(request, socket, body);

        ws.on('message', (event) => {

        });

        ws.on('close', (event) => {
            console.log('close', event.code, event.reason);
            ws = null;
        });
    }

    // 发送数据
    send(data) {
        this.ws.send(JSON.stringify({
            type: "msg",
            data
        }));
    }
}

module.exports = KorokForest;