$(document).ready(function() {
    var card = $('.ui.card')
    var title = []
    var running;

    // Dimmer
    var image = function(id, name) {
        card.find('.image').html('<video width="290" src="motion/' + name.replace('.jpg', '-HD.mp4') + '" poster="motion/' + name + '" controls preload="none"/>');
        card.find('.header').html(name.slice(0, 10).replace(/-/ig, '/'));

        card.find('.date').html(name.split('.').shift().slice(11).replace('-', ':').replace('-', '.'))

        card.find('.trash').off()
        card.find('.trash').click(function() {
            $('.dimmer').dimmer('hide')
            $('.ui.basic.modal').modal({
                onDeny    : function(){
                  return true;
                },
                onApprove : function() {
                  $.get('/api/remove/' + name, function(err) {
                    if (!err) {
                        $('.' + id).remove();
                    }
                  })
                }
              }).modal('show')
        })

        card.find('.save').off()
        card.find('.save').click(function() {
            $('.dimmer').dimmer('hide')
            $('.ui.basic.modal').modal({
                onDeny    : function(){
                  return true;
                },
                onApprove : function() {
                  $.get('/api/keep/' + name.replace('.jpg', ''), function(err) {})
                }
              }).modal('show')
        })
    }

    // button per motion
    var button_motion = function(id, name) {
        hour = name.split('.')[0].split('-').slice(3, 5).join(':')
        $('.ui.container').append('<button class="ui inverted button ' + id + '">' + hour + '</button>')
        $('button').last().click(function() {
            image(id, name)
            $('.dimmer').dimmer('show')
        })
    }

    // Divider per day
    var divider = function(day) {
        $('.ui.container').append('<div class="ui inverted horizontal divider">' + day + '</div>')
    }

    // creation process
    var create = function(filesArray) {
        // filter story title
        filesArray.forEach(function(file) {
            if (file.match(/(\d+-){5}\d+\.jpg$/)) {
                var id = file.split('.')[0].replace(/-/ig, '')
                title.push([parseInt(id), file])
            }
        })

        // sort by date / story
        title = title.sort(function(a, b) {
            return parseInt(a[0]) < parseInt(b[0]) ? 1 : -1
        })

        var day;
        // append
        title.forEach(function(infos) {
            if (!day || infos[1].indexOf(day) === -1) {
                day = infos[1].split('.')[0].split('-').slice(0, 3).join('-')
                divider(day)
            }
            button_motion(infos[0], infos[1])
        })
    }

    // set motion record button status
    var status = function(started) {
        $(started ? '.green' : '.red').removeClass(started ? 'green' : 'red').addClass(started ? 'red' : 'green');
        $('.labeled.button').find('.button').html(started ?
            '<i class="stop icon"></i> Stop' :
            '<i class="play icon"></i> Start');
        $('.labeled.button').find('.label').html(started ? 'started' : 'stopped');
    }

    // retrieve list of motion
    $.get('/api/list', function(data) {
        if (!data.error && data.files) {
            create(data.files)
        }
    })

    // get status of motion record
    $.get('/api/status', function(started) {
        running = started
        status(started)
    })

    // set motion record status (start / stop)
    $('.labeled.button').find('.button').click(function() {
        $(this).find('i').removeClass('play stop').addClass('spinner loading')
        $.get('/api/' + (running ? 'stop' : 'start'), function(err) {
            console.log(err)
            running = !running
            status(running)
        })
    })
})
