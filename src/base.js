

((root, factory) => {
    "use strict"
    if (typeof exports === 'object') {
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        define(factory);
    } else {
        root.Korok = factory();
    }
})(this, () => {
    "use strict";

    //<!--SimpleEvent-->

    //<!--Korok-->

    //<!--KorokLeaf-->

    Korok.version = "{{version}}";
    Korok.v = "{{versionCode}}";

    return Korok;
});