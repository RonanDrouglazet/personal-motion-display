var express = require('express'),
fs = require('fs'),
http = require('http'),
cp = require('child_process');

var convert = {
    now: null,
    list: []
}

var convert_process = function() {
    if (!convert.now && convert.list.length) {
        var name = convert.list.pop()
        var root = process.env.RECORDER ? process.env.RECORDER : __dirname
        var input = root + '/motion/' + name
        var dest = __dirname + '/motion/' + name
        var now = Date.now() + '.mp4'

        convert.now = name + ' - ' + new Date().toLocaleTimeString()
        console.log('process', input, 'to', dest)
        cp.exec('avconv -i ' + input + ' -y ' + now + ' && mv -f ' + now + ' ' + dest, function(err) {
            convert.now = null
            convert_process()
        })
    }
}

var app = express();

try {fs.mkdirSync(__dirname + '/motion')} catch(e) {}

// if RECORDER exist, redirect all cmd on it (except for convert and encoding)
if (process.env.RECORDER) {
    console.log('RECORDER detected:', process.env.RECORDER)
    app.use('/', (req, res, next) => {
        if (req.path.match(/api\/(list|status|start|stop|remove|keep|snapshot|infos)/)) {
            console.log('redirect to RECORDER:', process.env.RECORDER + req.path)
            res.redirect(process.env.RECORDER + req.path)
        } else {
            next()
        }
    })
}

app.get('/api/list', function(req, res) {
    fs.readdir(__dirname + '/motion', function(err, data) {
        res.send({files: data, error: err});
    })
})

app.get('/api/status', function(req, res) {
    cp.exec('status motionrecord', function(err, stdo, stde) {
        res.send(stdo.indexOf('stop') === -1)
    })
})

app.get('/api/encoding', function(req, res) {
    res.send(convert)
})

app.get('/api/start', function(req, res) {
    cp.exec('start motionrecord', function(err) {
        res.send(err);
    })
})

app.get('/api/stop', function(req, res) {
    cp.exec('stop motionrecord', function(err) {
        res.send(err);
    })
})

app.get('/api/remove/:name', function(req, res) {
    cp.exec('rm ' + __dirname + '/motion/' + req.params.name + '*', function(err) {
        res.send(err);
    })
})

app.get('/api/keep/:name', function(req, res) {
    var name = __dirname + '/motion/' + req.params.name + '* '
    cp.exec('mv -f ' + name + __dirname + '/keep/', function(err) {
        res.send(err);
    })
})

app.get('/api/snapshot/:type', function(req, res) {
    cp.exec('python ' + __dirname + '/' + req.params.type + '.py', function(err) {
        res.send(err)
    })
})

app.get('/api/infos/:name', function(req, res) {
    cp.exec('avprobe ' + __dirname + '/motion/' + req.params.name, function(err, stdo, stde) {
        res.send(stde)
    })
})

app.get('/api/convert/:name', function(req, res) {
    if (process.env.ENCODER) {
        console.log('redirect to ENCODER', process.env.ENCODER + req.path)
        res.redirect(process.env.ENCODER + req.path)
    } else {
        convert.list.push(req.params.name)
        convert_process()
    }
})

app.use('/', express.static(__dirname + '/'));
app.use('/motion', express.static(__dirname + '/motion/'));
app.use('/keep', express.static(__dirname + '/keep/'));

if (process.env.RECORDER || process.env.ENCODER) {
    console.log('/motion redirect')
    app.use('/motion', (req, res, next) => {
        if (!res.headersSent) {
            console.log('/motion redirect on', (process.env.RECORDER || process.env.ENCODER) + req.path)
            res.redirect((process.env.RECORDER || process.env.ENCODER) + req.path)
        } else {
            next()
        }
    })
}


app.listen(process.env.PORT || 8080);
console.log('now listening on port ', (process.env.PORT || 8080));
