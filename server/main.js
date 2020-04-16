const KorokTree = require("../korokTree");

// 初始化
let forest = new KorokTree();

forest.on("msg", (e) => {
    e.leaf.send({
        stat: "收到了",
        d: e.data
    });
});

forest.init();