var express = require("express"),
fs = require("fs"),
http = require("http"),
cp = require("child_process");

var app = express();

app.get("/api/list", function(req, res) {
    fs.readdir(__dirname + "/../motion", function(err, data) {
        res.send({files: data, error: err});
    });
})

app.get("/api/status", function(req, res) {
    http.get('http://localhost:8080', function(data) {
        res.send(true)
    }).on('error', function(e) {
        res.send(false)
    })
})

app.get("/api/start", function(req, res) {
    cp.exec("motion", function(err) {
        res.send(err);
    })
})

app.get("/api/stop", function(req, res) {
    cp.exec("service motion stop", function(err) {
        res.send(err);
    })
})

app.use("/", express.static(__dirname + "/"));
app.use("/motion", express.static(__dirname + "/../motion/"));
app.use("/motion", express.static(__dirname + "/motion/"));

app.listen(process.env.PORT || 8080);
console.log("now listening on port ", (process.env.PORT || 8080));
