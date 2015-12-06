$(document).ready(function() {
    var template = $('.ui.card').remove()
    var title = []
    var video = {}
    var fps = 12
    var running;

    var image = function(id, name) {
        var v = template.clone().attr('id', id);
        v.find('.image').append('<img src="motion/' + name + '" />');
        v.find('.header').html(name.slice(0, 10).replace(/-/ig, '/'));

        v.find('.date').html(name.split('.').shift().slice(11).replace('-', ':').replace('-', '.'))
        $('.ui.cards').append(v);
    }

    var cvideo = function(name) {
        var v = template.clone().attr('id', name);
        v.find('.image').append('<video width="280" src="motion/' + name + '" controls/>');
        v.find('.header').html(name);
        $('.ui.cards').append(v);
        v.find('.progress').hide();
    }

    var create = function(filesArray) {
        // filter story title
        filesArray.forEach(function(file) {
            if (file.match(/jpg$/)) {
                var id = file.split('.')[0].replace('-', '')
                title.push([parseInt(id), file])
            } /*else if (file.match(/mp4$/)) {
                cvideo(file)
            }*/
        })
        // sort by date / story
        title = title.sort(function(a, b) {
            console.log(a[0])
            return parseInt(a[0]) < parseInt(b[0]) ? 1 : -1
        })
        // append
        title.forEach(function(infos) {
            image(infos[0], infos[1])
        })
    }

    var status = function(started) {
        $(started ? '.green' : '.red').removeClass(started ? 'green' : 'red').addClass(started ? 'red' : 'green');
        $('.labeled.button').find('.button').html(started ? 
            '<i class="stop icon"></i> Stop' :
            '<i class="play icon"></i> Start');
        $('.labeled.button').find('.label').html(started ? 'started' : 'stopped');
    }

    $.get('/api/list', function(data) {
        if (!data.error && data.files) {
            create(data.files)
        }
    })

    $.get('/api/status', function(started) {
        running = started
        status(started)
    })

    $('.labeled.button').find('.button').click(function() {
        $(this).find('i').removeClass('play stop').addClass('spinner loading')
        $.get('/api/' + (running ? 'stop' : 'start'), function(err) {
            console.log(err)
            running = !running
            status(running)
        })
    })
})
