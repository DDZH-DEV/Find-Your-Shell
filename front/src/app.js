import Alpine from "alpinejs"; 
import home from "./libs/index"; 
import util from "./libs/util";
import config from "./config";
import extend from "./libs/extend";

let app = {};

app=Object.assign(app,home,config,extend);

window.app = app;
window.util=util;
window.Alpine = Alpine;
Alpine.start();

