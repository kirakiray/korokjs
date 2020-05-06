// common SimpleEvent
const EVENTMAP = Symbol("eventMap");
const ISONE = Symbol("isOneEvent");
class SimpleEvent {
    constructor() {
        this[EVENTMAP] = new Map();
    }

    // 模拟事件机制
    // 注册事件
    on(eventName, func, isOnce) {
        let e_arr = this[EVENTMAP].get(eventName);
        if (!e_arr) {
            e_arr = []
            this[EVENTMAP].set(eventName, e_arr);
        }
        e_arr.push({
            func,
            once: isOnce === ISONE ? true : false
        });
    }

    // 一次性注册事件
    one(eventName, func) {
        this.on(eventName, func, ISONE);
    }

    // 发送事件
    emit(eventName, data) {
        let e_arr = this[EVENTMAP].get(eventName);

        e_arr && e_arr.slice().forEach(e => {
            // 去除一次性事件
            if (e.once) {
                let targetIndex = e_arr.findIndex(e2 => e2 == e);
                if (targetIndex > -1) {
                    e_arr.splice(targetIndex, 1);
                }
            }

            e.func(data);
        });
    }

    // 取消事件
    off(eventName, func) {
        let e_arr = this[EVENTMAP].get(eventName);

        if (e_arr) {
            let id = e_arr.findIndex(e => e.func === func);
            if (id > -1) {
                e_arr.splice(id, 1);
            }
        }
    }
}