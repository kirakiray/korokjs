// common SimpleEvent
const EVENTMAP = Symbol("eventMap");
class SimpleEvent {
    constructor() {
        this[EVENTMAP] = new Map();
    }

    // 模拟事件机制
    // 注册事件
    on(eventName, func) {
        let e_arr = this[EVENTMAP].get(eventName);
        if (!e_arr) {
            e_arr = []
            this[EVENTMAP].set(eventName, e_arr);
        }
        e_arr.push({ func });
    }

    // 发送事件
    emit(eventName, data) {
        let e_arr = this[EVENTMAP].get(eventName);

        e_arr && e_arr.forEach(e => {
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