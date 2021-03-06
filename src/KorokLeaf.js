// common KorokLeaf
const CONNECTTYPE = Symbol("connectType");
const LEAFID = Symbol("leafId");

// 兄弟辈的数据更新
class KorokLeaf extends SimpleEvent {
    constructor(opt, korok) {
        super();
        // 当前连接状态
        this[CONNECTTYPE] = "ws";
        this[LEAFID] = opt.id;
        this.korok = korok;

        this[INFOS] = {};
    }

    get id() {
        return this[LEAFID];
    }

    get infos() {
        return new Proxy(this[INFOS], {
            get(obj, prop) {
                return obj[prop];
            },
            set() {
                return true;
            }
        });
    }

    // 发送数据
    async send(data) {
        let { korok } = this;
        if (this[CONNECTTYPE] == "ws" && korok) {
            korok.socket.send(await korok._encry({
                type: "repost",
                leafIds: [this[LEAFID]],
                data: data
            }));
        }
    }
}