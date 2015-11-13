$(document).ready(function() {
    var template = $('.ui.card').remove()
    var video = {}
    var story

    var image = function(name) {
        var v = template.clone();
        v.find('.image').attr('id', story).append('<img src="motion/' + name + '" />');
        $(document.body).append(v);
    }

    var create = function(filesArray) {
        filesArray.forEach(function(name) {
            if (name.match(/jpg$/)) {
                var s = name.substr(0, 2)
                var i

                if (story !== s) {
                    story = s
                    video[story] = []
                    image(name)
                }

                i = {
                    name: name,
                    dom: new Image()
                }

                i.dom.src = 'motion/' + name

                video[story].push(i)
            }
        })
    }

    $.get('/api/list', function(data) {
        if (!data.error && data.files) {
            create(data.files)
        }
    })
})
