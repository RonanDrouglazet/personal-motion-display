$(document).ready(function() {
    var template = $('.ui.card').remove()

    var image = function(name) {
        var v = template.clone();
        v.find('.image').append('<img src="motion/' + name + '" />');
        $(document.body).append(v);
    }

    var create = function(filesArray) {
        filesArray.forEach(function(name) {
            if (name.match(/jpg$/)) {
                image(name)
            }
        })
    }

    $.get('/api/list', function(data) {
        if (!data.error && data.files) {
            create(data.files)
        }
    })
})
