// common Korok
const KOROKID = Symbol("korokId");
const STATE = Symbol("state");
const PTIMER = Symbol("p_timer");
const LEAFS = Symbol("leafs");
const INFOS = Symbol("infos");
const AESKEY = Symbol("aeskey");
const STARTAES = Symbol("startAes");

const aesKey = { "alg": "A256CBC", "ext": true, "k": "ibJDVo9mj-bWVDtY_ed8GwvlOfFuCsTpJYq4W6U-x1Q", "key_ops": ["encrypt", "decrypt"], "kty": "oct" };
const iv = new Uint8Array([94, 206, 139, 176, 239, 198, 216, 25, 191, 15, 7, 167, 122, 45, 38, 155]);

class Korok extends SimpleEvent {
    constructor(opts = {}) {
        let defaults = {
            encryption: true
        };
        Object.assign(defaults, opts);
        super();
        // 远程链接地址
        this.url = "localhost:8811";
        this[KOROKID] = "";
        // 状态
        this[STATE] = "pendding";
        // 同辈
        this[LEAFS] = [];
        // 自有信息
        this[INFOS] = new Proxy({
            ua: ""
        }, {
            get(obj, prop) {
                return obj[prop];
            },
            set: (obj, prop, value) => {
                // 禁用set
                obj[prop] = value;

                let data = {
                    [prop]: value
                };

                // 更新leafs上的数据
                this.leafs.find(e => e.id === this.id)[INFOS][prop] = value;

                // 发送信息
                this.socket && (async () => {
                    this.socket.send(await this._encry({
                        type: "setInfos",
                        data
                    }));
                })()

                return true;
            }
        });

        if (defaults.encryption) {
            this.encryption = true;

            this[AESKEY] = "";

            // 设置生成key
            this[STARTAES] = crypto.subtle.importKey("jwk",
                aesKey,
                "AES-CBC",
                true,
                ["encrypt", "decrypt"]);
        }
    }

    get id() {
        return this[KOROKID];
    }

    // 当前状态
    get state() {
        return this[STATE];
    }

    // 所有leafs数据
    get leafs() {
        return this[LEAFS].slice();
    }

    // 除了自己的leafs
    get sibling() {
        return this[LEAFS].filter(e => e.id !== this.id);
    }

    get infos() {
        return this[INFOS]
    }

    // 初始化
    async init() {
        // 多窗口数据数据同步库
        const socket = this.socket = new WebSocket(/^ws/.test(this.url) ? this.url : `ws://${this.url}`);
        socket.binaryType = "arraybuffer";

        socket.onmessage = async (e) => {
            let d = await this._decry(e.data);

            switch (d.type) {
                case "init":
                    this[KOROKID] = d.id;
                    this[STATE] = "finish";
                    d.leafs.forEach(opt => {
                        this[LEAFS].push(new KorokLeaf(opt, this));
                    });
                    this.emit("finish");

                    // 添加私有信息
                    this.infos.ua = navigator.userAgent;
                    break;
                case "msg":
                    let opt2 = {
                        data: d.data
                    };
                    d.from && (opt2.from = this[LEAFS].find(e => e.id == d.from));
                    this.emit("msg", opt2);
                    break;
                case "addleaf":
                    this[LEAFS].push(new KorokLeaf(d.data, this));
                    this.emit("leafs-change", {
                        type: "addleaf",
                        id: d.data.id
                    });
                    break;
                case "deleteleaf":
                    let targetId = this[LEAFS].findIndex(e => e.id == d.data.id);
                    let removeLeaf;
                    if (targetId >= 0) {
                        removeLeaf = this[LEAFS].splice(targetId, 1)[0];
                    }
                    this.emit("leafs-change", {
                        type: "deleteleaf",
                        leaf: removeLeaf
                    });
                    break;
                case "updateleaf":
                    let targetData = this.leafs.find(e => e.id === d.id);

                    targetData && Object.assign(targetData[INFOS], d.data);

                    this.emit("leafs-change", {
                        type: "updateleaf",
                        leaf: targetData,
                        prop: d.prop,
                        value: d.value
                    });
                    break;
                case "pong":
                    // 不作操作
                    break;
                default:
                    console.log("Unknown type => ", d);
            }
        }

        socket.onclose = (e) => {
            if (this[STATE] != "error") {
                this[STATE] = "close";
                clearInterval(this[PTIMER]);
            }
        }

        socket.onerror = (e) => {
            this[STATE] = "error";
            clearInterval(this[PTIMER]);
        }

        // 日常pingpang操作
        this[PTIMER] = setInterval(async () => {
            socket.send(await this._encry({
                type: "ping"
            }));
        }, 30000);
    }

    // 加密操作
    async _encry(obj) {
        // 转换为字符串
        let str = JSON.stringify(obj);

        if (this.encryption) {
            // 加密内容
            let encryBuffer = await crypto.subtle.encrypt(
                {
                    name: "AES-CBC",
                    iv
                },
                await (this[AESKEY] || this[STARTAES]),
                new TextEncoder().encode(str)
            )

            return encryBuffer;
        } else {
            // 转buffer
            return (new TextEncoder().encode(str)).buffer;
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
                await (this[AESKEY] || this[STARTAES]),
                buffer
            );

            let jsonStr = new TextDecoder().decode(decrypted);
            return JSON.parse(jsonStr);
        } else {
            let str = new TextDecoder().decode(buffer);
            return JSON.parse(str);
        }

    }
    // 发送数据
    async send(data) {
        this.socket.send(await this._encry({
            type: "msg",
            data
        }));
    }
}