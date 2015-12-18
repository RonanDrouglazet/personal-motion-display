$(document).ready(function() {
    var card = $('.ui.card')
    var title = []
    var running;

    // Dimmer
    var image = function(id, name) {
        card.find('.image').html('<video width="290" src="motion/' + name.replace('.jpg', '-HD.mp4') + '" poster="motion/' + name + '" controls preload="none"/>');

        $.get('/api/infos/' + name.replace('.jpg', '-HD.mp4'), function(infos) {
            var info = infos.match(/Duration\: 00\:(.+)\.\d+, s.+(bitrate.+\/s)\n/)
            card.find('.header').html('Duration: ' + info[1] + 's')
            card.find('.date').html(info[2])
        })

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

        card.find('.plug').off()
        card.find('.plug').click(function() {
            $('.dimmer').dimmer('hide')
            $('.ui.basic.modal').modal({
                onDeny    : function(){
                  return true;
                },
                onApprove : function() {
                  $.get('/api/convert/' + name.replace('.jpg', '-HD.mp4'), function(err) {})
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
        $('.startstop').removeClass(started ? 'green' : 'red').addClass(started ? 'red' : 'green');
        $('.startstop').html(started ?
            '<i class="stop icon"></i> Stop' :
            '<i class="play icon"></i> Start'
        );
    }

    // retrieve list of motion
    $.get('/api/list?' + Date.now(), function(data) {
        if (!data.error && data.files) {
            create(data.files)
        }
    })

    // get status of motion record
    $.get('/api/status?' + Date.now(), function(started) {
        running = started
        status(started)
    })

    // get status of motion record
    $.get('/api/encoding?' + Date.now(), function(encode) {
        console.log(encode)
        if (encode.now) {
            $('.message p').html(encode.now)
            $('.message').show()
        }
    })

    // set motion record status (start / stop)
    $('button.startstop').click(function() {
        $(this).find('i').removeClass('play stop').addClass('spinner loading')
        $.get('/api/' + (running ? 'stop' : 'start'), function(err) {
            console.log(err)
            running = !running
            status(running)
        })
    })

    // set capture button
    $('button.night').click(function() {
        $(this).find('i').removeClass('photo').addClass('spinner loading')
        $.get('/api/snapshot/night?' + Date.now(), function(err) {
            if (!err) {
                image(Date.now(), 'dark.jpg')
                $('.dimmer').dimmer('show')
            }
            $('button.night').find('i').removeClass('spinner loading').addClass('photo')
        })
    })

    $('button.day').click(function() {
        $(this).find('i').removeClass('photo').addClass('spinner loading')
        $.get('/api/snapshot/day?' + Date.now(), function(err) {
            if (!err) {
                image(Date.now(), 'day.jpg?' + Date.now())
                $('.dimmer').dimmer('show')
            }
            $('button.day').find('i').removeClass('spinner loading').addClass('photo')
        })
    })
})
