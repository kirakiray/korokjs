// 用于拼接korok服务端程序
const WebSocket = require('faye-websocket'),
    EventEmitter = require('events');

const getRandom = () => Math.random().toString(32).slice(2) + Math.random().toString(32).slice(2);

class KorokLeaf extends EventEmitter {
    constructor({ request, socket, body, tree }) {
        super();

        this.tree = tree;

        var ws = this.ws = new WebSocket(request, socket, body);

        // 初始化相应数据
        this.id = getRandom();

        ws.onopen = (e) => {
            // 发送初始配置数据
            ws.send(this._encry({
                type: "init",
                // 当前id
                id: this.id,
                // 所有同辈数据
                leafs: Array.from(tree.leafs).map(e => {
                    return { id: e.id };
                })
            }));
        }

        ws.on('message', (e) => {
            let d = this._decry(e.data);

            switch (d.type) {
                case "msg":
                    let opt = {
                        data: d.data,
                        leaf: this
                    };
                    this.emit("msg", opt);
                    tree.emit("msg", opt);
                    break;
                case "ping":
                    ws.send(this._encry({
                        type: "pong"
                    }));
                    break;
                case "repost":
                    // 转发接口数据
                    let { leafIds, data } = d;
                    leafIds && leafIds.forEach(leafId => {
                        let targetLeaf = Array.from(tree.leafs).find(e => e.id == leafId);

                        if (!targetLeaf) {
                            return
                        }

                        // 数据转发
                        targetLeaf.ws.send(targetLeaf._encry({
                            type: "msg",
                            data,
                            from: this.id
                        }));
                    });
                    let opt2 = {
                        from: this,
                        to: leafIds,
                        data
                    };

                    this.emit("repost", opt2);
                    tree.emit("repost", opt2);
                    break;
                case "setInfos":
                    Array.from(tree.leafs).forEach(leaf => {
                        // 信息更新到所有的节点上
                        (this.id != leaf.id) && leaf.ws.send(leaf._encry({
                            type: "updateleaf",
                            id: this.id,
                            data: d.data
                        }));
                    })
                    break;
            }
        });

        // 失败后的方法
        let failFunc = (event) => {
            tree.leafs.delete(this);
            this.emit(event.type, {
                leaf: this
            });
            this.tree.emit("leaf-" + event.type, {
                leaf: this
            });
            tree = null;
        }
        ws.on('close', failFunc);
        ws.on('error', failFunc);
    }

    // 发送数据
    send(data) {
        this.ws.send(this._encry({
            type: "msg",
            data
        }));
    }
    // 加密数据
    _encry(data) {
        let str = JSON.stringify(data);
        let ab = new TextEncoder().encode(str);
        return new Buffer(ab);
    }
    // 解密数据
    _decry(buffer) {
        let jsonStr = new TextDecoder().decode(buffer);
        return JSON.parse(jsonStr);
    }
}

module.exports = KorokLeaf;