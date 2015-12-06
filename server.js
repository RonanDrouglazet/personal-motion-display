var express = require("express"),
fs = require("fs"),
http = require("http"),
cp = require("child_process");

var app = express();

app.get("/api/list", function(req, res) {
    fs.readdir(__dirname + "/motion", function(err, data) {
        res.send({files: data, error: err});
    });
})

app.get("/api/status", function(req, res) {
    cp.exec("status motionrecord", function(err, stdo, stde) {
        res.send(stdo.indexOf('stop') !== -1)
    })
})

app.get("/api/start", function(req, res) {
    cp.exec("start motionrecord", function(err) {
        res.send(err);
    })
})

app.get("/api/stop", function(req, res) {
    cp.exec("stop motionrecord", function(err) {
        res.send(err);
    })
})

app.use("/", express.static(__dirname + "/"));
app.use("/motion", express.static(__dirname + "/motion/"));

app.listen(process.env.PORT || 8080);
console.log("now listening on port ", (process.env.PORT || 8080));
