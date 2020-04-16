// 用于拼接korok服务端程序
const WebSocket = require('faye-websocket'),
    http = require('http'),
    EventEmitter = require('events');
const KorokLeaf = require("./KorokLeaf");

class KorokTree extends EventEmitter {
    // 默认端口
    port = 8811;
    // 存储leaf数组
    leafs = new Set()
    constructor() {
        super();

        // 本地的permit函数，默认全部同行
        // 可以替换本地函数后提供拦截功能
        this.onpermit = (e) => new Promise(res => res({ pass: true }));

        // 关闭修正
        this.on("leaf-close", (e) => {
            // 通知干掉相应id
            this.leafs.forEach(leaf => {
                leaf.ws.send(leaf._encry({
                    type: "deleteleaf",
                    data: {
                        id: e.leaf.id
                    }
                }));
            });
        });
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
                    let kt = new KorokLeaf({
                        request, socket, body,
                        tree: this
                    });

                    // 给其他leafs发送添加指令
                    this.leafs.forEach(leaf => {
                        leaf.ws.send(leaf._encry({
                            type: "addleaf",
                            data: {
                                id: kt.id
                            }
                        }));
                    });

                    // 新增leafs
                    this.leafs.add(kt)
                }
            });

            server.listen(this.port);
        }
    }
}

module.exports = KorokTree;