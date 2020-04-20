// common Korok
const KOROKID = Symbol("korokId");
const STATE = Symbol("state");
const PTIMER = Symbol("p_timer");
const LEAFS = Symbol("leafs");
const INFOS = Symbol("infos");

class Korok extends SimpleEvent {
    constructor() {
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
                this.socket && this.socket.send(this._encry({
                    type: "setInfos",
                    data
                }));

                return true;
            }
        });
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
    init() {
        // 多窗口数据数据同步库
        debugger
        const socket = this.socket = new WebSocket(/^ws/.test(this.url) ? this.url : `ws://${this.url}`);

        socket.onmessage = (e) => {
            let d = this._decry(e.data);

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
        this[PTIMER] = setInterval(() => {
            socket.send(this._encry({
                type: "ping"
            }));
        }, 30000);
    }

    // 加密操作
    _encry(obj) {
        return JSON.stringify(obj);
    }
    // 解密数据
    _decry(str) {
        return JSON.parse(str);
    }
    // 发送数据
    send(data) {
        this.socket.send(this._encry({
            type: "msg",
            data
        }));
    }
}