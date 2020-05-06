// 用于拼接korok服务端程序
const WebSocket = require('faye-websocket'),
    EventEmitter = require('events'),
    { crypto } = require("./webcrypto");

const getRandom = () => Math.random().toString(32).slice(2) + Math.random().toString(32).slice(2);

const aesKey = { "alg": "A256CBC", "ext": true, "k": "ibJDVo9mj-bWVDtY_ed8GwvlOfFuCsTpJYq4W6U-x1Q", "key_ops": ["encrypt", "decrypt"], "kty": "oct" };
const iv = new Uint8Array([94, 206, 139, 176, 239, 198, 216, 25, 191, 15, 7, 167, 122, 45, 38, 155]);

class KorokLeaf extends EventEmitter {
    constructor({ request, socket, body, tree, encryption = true, defaultAes }) {
        super();

        this.tree = tree;

        var ws = this.ws = new WebSocket(request, socket, body);

        // 初始化相应数据
        this.id = getRandom();

        if (encryption) {
            // 是否加密数据
            this.encryption = true;

            this.aesKey = "";

            // 初始aes
            this.startAes = crypto.subtle.importKey("jwk", defaultAes || aesKey,
                "AES-CBC",
                true,
                ["encrypt", "decrypt"])
        }


        ws.onopen = async (e) => {
            // 发送初始配置数据
            ws.send(await this._encry({
                type: "init",
                // 当前id
                id: this.id,
                // 所有同辈数据
                leafs: Array.from(tree.leafs).map(e => {
                    return { id: e.id };
                })
            }));
        }

        ws.on('message', async (e) => {
            let d = await this._decry(e.data);

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
                    ws.send(await this._encry({
                        type: "pong"
                    }));
                    break;
                case "repost":
                    // 转发接口数据
                    let { leafIds, data } = d;
                    leafIds && leafIds.forEach(async leafId => {
                        let targetLeaf = Array.from(tree.leafs).find(e => e.id == leafId);

                        if (!targetLeaf) {
                            return
                        }

                        // 数据转发
                        targetLeaf.ws.send(await targetLeaf._encry({
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
                    Array.from(tree.leafs).forEach(async leaf => {
                        // 信息更新到所有的节点上
                        (this.id != leaf.id) && leaf.ws.send(await leaf._encry({
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
    async send(data) {
        this.ws.send(await this._encry({
            type: "msg",
            data
        }));
    }
    // 加密数据
    async _encry(data) {
        // let str = JSON.stringify(data);
        // let ab = new TextEncoder().encode(str);
        // return Buffer.from(ab);
        // 转换为字符串
        let str = JSON.stringify(data);

        if (this.encryption) {
            // 加密内容
            let encryBuffer = await crypto.subtle.encrypt(
                {
                    name: "AES-CBC",
                    iv
                },
                await (this.aesKey || this.startAes),
                new TextEncoder().encode(str)
            )

            return Buffer.from(encryBuffer);
        } else {
            // 转buffer
            return Buffer.from((new TextEncoder().encode(str)));
        }
    }
    // 解密数据
    async _decry(buffer) {
        if (this.encryption) {
            // 解密内容
            let decrypted = await crypto.subtle.decrypt(
                {
                    name: "AES-CBC",
                    iv
                },
                await (this.aesKey || this.startAes),
                buffer
            );

            let jsonStr = new TextDecoder().decode(decrypted);
            return JSON.parse(jsonStr);
        } else {
            let jsonStr = new TextDecoder().decode(buffer);
            return JSON.parse(jsonStr);
        }
    }
}

module.exports = KorokLeaf;