var express = require("express"),
fs = require("fs");

var app = express();

app.get("/api/list", function(req, res) {
	fs.readdir(__dirname + "/../motion", function(err, data) {
		res.send({files: data, error: err});
	});
})

app.use("/", express.static(__dirname + "/"));
app.use("/motion", express.static(__dirname + "/../motion/"));

app.listen(process.env.PORT || 8080);
console.log("now listening on port ", (process.env.PORT || 8080));
