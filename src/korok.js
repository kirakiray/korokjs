// common Korok
const KOROKID = Symbol("korokId");
const STATE = Symbol("state");
const PTIMER = Symbol("p_timer");
const LEAFS = Symbol("leafs");

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

    // 初始化
    init() {
        // 多窗口数据数据同步库
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