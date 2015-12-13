$(document).ready(function() {
    var template = $('.ui.card').remove()
    var title = []
    var video = {}
    var fps = 12
    var running;

    var image = function(id, name) {
        var v = template.clone().attr('id', name);
        v.find('.image').append('<video width="290" src="motion/' + name.replace('.jpg', '-HD.mp4') + '" poster="motion/' + name + '" controls preload="none"/>');
        v.find('.header').html(name.slice(0, 10).replace(/-/ig, '/'));

        v.find('.date').html(name.split('.').shift().slice(11).replace('-', ':').replace('-', '.'))
        $('.ui.cards').append(v);

        v.find('.checkbox')
          .checkbox({
            onChecked: function() {
              v.find('video').attr('src', 'motion/' + name.replace('.jpg', '-HD.mp4'))
            },
            onUnchecked: function() {
              v.find('video').attr('src', 'motion/' + name.replace('.jpg', '-SD.mp4'))
            }
          })
        
        v.find('.trash').click(function() {
            $('.ui.basic.modal').modal({
                onDeny    : function(){
                  return true;
                },
                onApprove : function() {
                  $.get('/api/remove/' + name, function(err) {
                    if (!err) {
                        v.remove();
                    }
                  })
                }
              }).modal('show')
        })

        v.find('.save').click(function() {
            $('.ui.basic.modal').modal({
                onDeny    : function(){
                  return true;
                },
                onApprove : function() {
                  $.get('/api/keep/' + name.replace('.jpg', ''), function(err) {
                    if (!err) {
                        v.find('.save').remove();
                    }
                  })
                }
              }).modal('show')
        })
    }

    var create = function(filesArray) {
        // filter story title
        filesArray.forEach(function(file) {
            if (file.match(/jpg$/)) {
                var id = file.split('.')[0].replace(/-/ig, '')
                title.push([parseInt(id), file])
            }
        })

        // sort by date / story
        title = title.sort(function(a, b) {
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
