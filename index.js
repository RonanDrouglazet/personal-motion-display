$(document).ready(function() {
    var template = $('.ui.card').remove()
    var title = []
    var video = {}
    var fps = 12

    var image = function(story, name) {
        var v = template.clone().attr('id', story);
        v.find('.image').append('<img src="motion/' + name + '" />');
        v.find('.header').html([
            story.slice(0, 4),
            story.slice(4, 6),
            story.slice(6, 8)].join('/') + ' - ' + story.slice(8));

        var hour = name.match(/(?:\d+)-(?:\d{8})(\d{6})/)[1]
        v.find('.date').html([hour.slice(0, 2), hour.slice(2, 4)].join('h ') + 'mn ' + hour.slice(4, 6) + 's')
        v.find('.description').html((video[story].list.length * (1 / fps)).toFixed(1) + 's')
        v.find('a.play').click(function() { load(story) })
        $('.ui.cards').append(v);
        v.find('.progress').hide();
    }

    var create = function(filesArray) {
        var story
        // filter story title
        filesArray.forEach(function(img) {
            if (img.match(/jpg$/)) {
                var s = img.match(/(\d+)-(\d{8})/)
                var num = s[1]
                var day = s[2]

                if (story !== day + num) {
                    story = day + num
                    title.push([story, img])
                    video[story] = {list: [{name: img}]}
                } else {
                    video[story].list.push({name: img})
                }
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

    var load = function(story) {
        video[story].toLoad = 0;
        video[story].loaded = 0;

        video[story].list.forEach(function(image) {
            if (!image.dom) {
                video[story].toLoad++;
                image.dom = document.createElement('img');
                image.dom.src = 'motion/' + image.name;
                image.dom.onload = progress.bind(this, story);
            }
        })

        if (video[story].toLoad) {
            $('#' + story).find('i.play').removeClass('play').addClass('spinner loading');
        } else {
            play(story);
        }
    }

    var progress = function(story) {
        video[story].loaded++

        $('#' + story).find('.progress').show().progress({
          percent: (video[story].loaded * 100) / video[story].toLoad
        });

        if (video[story].loaded === video[story].toLoad) {
            //done
            play(story);
        }
    }

    var play = function(story) {
        $('#' + story).find('i.spinner').removeClass('spinner loading').addClass('pause');

        if (!video[story].canvas) {
            var img = $('#' + story).find('img');
            video[story].canvas = document.createElement('canvas');
            video[story].canvas.width = img.width();
            video[story].canvas.height = img.height();
            video[story].context = video[story].canvas.getContext('2d');
            img.replaceWith(video[story].canvas);
        }


        video[story].head = 0;

        var playInterval = setInterval(function() {
            video[story].context.drawImage(video[story].list[video[story].head].dom, 0, 0, video[story].canvas.width, video[story].canvas.height);
            video[story].head++;

            if (video[story].head === video[story].list.length) {
                clearInterval(playInterval);
                playInterval = null;
                $('#' + story).find('i.pause').removeClass('pause').addClass('play');
            }
        }, 1000 / fps)
    }

    $.get('/api/list', function(data) {
        if (!data.error && data.files) {
            create(data.files)
        }
    })
})
