var express = require('express');
var bodyParser = require('body-parser');
// create app
var app = express();
// mount middlewares
app.use(express.static('../MyVideosApp/www'));
// mount middlewares
// - CORS
app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', "*");
    res.header('Access-Control-Allow-Methods', 'OPTIONS,GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method == 'OPTIONS') {
        res.status(200).send();
    } else {
        next();
    }
});
app.use(express.static('../MyVideosApp/www'));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(function(req, res, next) {
    console.log(req.method + ':' + req.url);
    if (!req.url.startsWith('/myvideos') ||
        (req.url === '/myvideos/sessions') ||
        (req.url === '/myvideos/users' && req.method === 'POST')) {
        next();
    } else if (!req.query.token) {
        res.send(401, 'Token missing');
    } else if (!db[req.query.token]) {
        res.send(401, 'Invalid token');
    } else {
        next();
    }
});

app.listen(8080);
console.log('HTTP server running');

var db = {};

///////////////////SECURITY///////////////////
app.use(function(req, res, next) {
    console.log(req.method + ':' + req.url);
    if (!req.url.startsWith('/myvideos') ||
        (req.url === '/myvideos/sessions') ||
        (req.url === '/myvideos/users' && req.method === 'POST')) {
        next();
    } else if (!req.query.token) {
        res.send(401, 'Token missing');
    } else if (!db[req.query.token]) {
        res.send(401, 'Invalid token');
    } else {
        next();
    }
});
// define routes
// sessions
app.post('/myvideos/sessions', function(req, res) {
    console.log('POST /myvideos/sessions');
    if (!req.body.email || !req.body.password) res.send(400, 'Missing data');
    else {
        for (var id in db) {
            if (db[id].email === req.body.email &&
                db[id].password === req.body.password) {
                res.send({ userId: id, token: id });
                return;
            }
        }
        res.send(401);
    }
});



//////////////////// USERS ////////////////////

//getAllUsers
app.get('/myvideos/users', function(req, res) {
    console.log('GET /myvideos/user/');
    var users = [];
    for (var id in db) {
        users.push({
            id: db[id].id,
            email: db[id].email,
            name: db[id].name,
            surname: db[id].surname
        });
    }
    res.send(users);
});

//saveNewUser
app.post('/myvideos/users', function(req, res) {
    console.log('POST /myvideos/users');
    if (!req.body.email || !req.body.password ||
        !req.body.name || !req.body.surname)
        res.send(400, 'Missing data');
    else {
        var userId = String(Date.now());
        db[userId] = {
            id: userId,
            email: req.body.email,
            password: req.body.password,
            name: req.body.name,
            surname: req.body.surname,
            videos: {},
            playlists: {}
        };
        res.send({
            id: userId,
            name: db[userId].name,
            surname: db[userId].surname
        });
    }
});

//getUserById
app.get('/myvideos/users/:userId', function(req, res) {
    console.log('GET /myvideos/users/' + req.params.userId);
    var userId = req.params.userId;
    if (!userId) res.send(400, 'Missing parameter');
    else if (!db[userId]) res.send(404, 'User not found');
    else {
        res.send({
            id: userId,
            email: db[userId].email,
            name: db[userId].name,
            surname: db[userId].surname
        });
    }
});

//updateUserById
app.put('/myvideos/users/:userId', function(req, res) {
    console.log('PUT /myvideos/users/' + req.params.userId);
    var userId = req.params.userId;
    if (!userId) res.send(400, 'Missing parameter');
    else if (!db[userId]) res.send(404, 'User not found');
    else {
        db[userId].email = req.body.email || db[userId].email;
        db[userId].password = req.body.password || db[userId].password;
        db[userId].name = req.body.name || db[userId].name;
        db[userId].surname = req.body.surname || db[userId].surname;
        res.send({
            id: userId,
            email: db[userId].email,
            name: db[userId].name,
            surname: db[userId].surname
        });
    }
});

//deleteUserByid
app.delete('/myvideos/users/:userId', function(req, res) {
    console.log('DELETE /myvideos/users/' + req.params.userId);
    var userId = req.params.userId;
    if (!userId) res.send(400, 'Missing parameter');
    else if (!db[userId]) res.send(404, 'User not found');
    else {
        delete db[userId];
        res.send(204);
    }
});




//////////////////////// VIDEOS //////////////////////////
//getAllVideosFromUser
//Aqui tengo que añadir la posibilidad de realizar un filtro de los videos que me traigo!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
app.get('/myvideos/users/:userId/videos', function(req, res) {
    console.log('GET /myvideos/user/' + req.params.userId + '/videos');
    var userId = req.params.userId;
    if (!userId) res.send(400, 'Missing parameter');
    else if (!db[userId]) res.send(404, 'User not found');
    else {
        var videos = [];
        for (var id in db[userId].videos) videos.push(db[userId].videos[id]);
        if (req.query.q) {
            let _videos = videos.filter((video) => {
                return video.title.indexOf(req.query.q) !== -1;
            })
            res.send(_videos)
        } else {
            res.send(videos);
        }
    }
});

//addNewVideoToUser
app.post('/myvideos/users/:userId/videos', function(req, res) {
    console.log('POST /myvideos/user/' + req.params.userId + '/videos');
    var userId = req.params.userId;
    if (!userId) res.send(400, 'Missing parameter');
    else if (!db[userId]) res.send(404, 'User not found');
    else if (!req.body.type || !req.body.url || !req.body.title)
        res.send(400, 'Missing data');
    else {
        var video = {
            id: String(Date.now()),
            type: req.body.type,
            url: req.body.url,
            title: req.body.title,
            date: Date.now()
        };
        if (req.body.description) video.description = req.body.description;
        if (req.body.thumbnail) video.thumbnail = req.body.thumbnail;
        if (req.body.tags) video.tags = req.body.tags;
        if (req.body.width) video.width = req.body.width;
        if (req.body.height) video.height = req.body.height;
        db[userId].videos[video.id] = video;
        res.send(video);
    }
});

//getVideoFromUser
app.get('/myvideos/users/:userId/videos/:videoId', function(req, res) {
    console.log('GET /myvideos/users/' + req.params.userId + '/videos/' +
        req.params.videoId);
    var userId = req.params.userId;
    var videoId = req.params.videoId;
    if (!userId || !videoId) res.send(400, 'Missing parameter');
    else if (!db[userId]) res.send(404, 'User not found');
    else if (!db[userId].videos[videoId]) res.send(404, 'Video not found');
    else res.send(db[userId].videos[index]);
});

//updateVideoToUser
app.put('/myvideos/users/:userId/videos/:videoId', function(req, res) {
    console.log('PUT /myvideos/users/' + req.params.userId + '/videos/' +
        req.params.videoId);
    var userId = req.params.userId;
    var videoId = req.params.videoId;
    if (!userId || !videoId) res.send(400, 'Missing parameter');
    else if (!db[userId]) res.send(404, 'User not found');
    else if (!db[userId].videos[videoId]) res.send(404, 'Video not found');
    else {
        if (req.body.type) db[userId].videos[videoId].type = req.body.type;
        if (req.body.url) db[userId].videos[videoId].url = req.body.url;
        if (req.body.title) db[userId].videos[videoId].title = req.body.title;
        if (req.body.description)
            db[userId].videos[videoId].description = req.body.description;
        if (req.body.thumbnail)
            db[userId].videos[videoId].thumbnail = req.body.thumbnail;
        if (req.body.tags) db[userId].videos[videoId].tags = req.body.tags;
        if (req.body.width) db[userId].videos[videoId].width = req.body.width;
        if (req.body.height) db[userId].videos[videoId].height = req.body.height;
        res.send(db[userId].videos[videoId]);
    }
});

//deleteVideoOfUser
app.delete('/myvideos/users/:userId/videos/:videoId', function(req, res) {
    console.log('DELETE /myvideos/users/' + req.params.userId + '/videos/' +
        req.params.videoId);
    var userId = req.params.userId;
    var videoId = req.params.videoId;
    if (!userId || !videoId) res.send(400, 'Missing parameter');
    else if (!db[userId]) res.send(404, 'User not found');
    else if (!db[userId].videos[videoId]) res.send(404, 'Video not found');
    else {
        delete db[userId].videos[videoId];
        res.send(204);
    }
});



/////////////////////////// PLAYLISTS ////////////////////////////////////

//GetAllPlaylistsOfUser
app.get('/myvideos/users/:userId/playlists', function(req, res) {
    console.log('GET /myvideos/user/' + req.params.userId + '/playlists');
    var userId = req.params.userId;
    if (!userId) res.send(400, 'Missing parameter');
    else if (!db[userId]) res.send(404, 'User not found');
    else {
        var playlists = [];
        for (var id in db[userId].playlists) {
            var playlist = {
                id: db[userId].playlists[id].id,
                title: db[userId].playlists[id].title,
                description: db[userId].playlists[id].description,
                date: db[userId].playlists[id].date
            };
            if (db[userId].playlists[id].thumbnail)
                playlist.thumbnail = db[userId].playlists[id].thumbnail;
            playlist.count = Object.keys(db[userId].playlists[id].videos).length;
            playlists.push(playlist);
        }
        res.send(playlists);
    }
});

//AdNewPlaylistToUser
app.post('/myvideos/users/:userId/playlists', function(req, res) {
    console.log('POST /myvideos/user/' + req.params.userId + '/playlists');
    var userId = req.params.userId;
    if (!userId) res.send(400, 'Missing parameter');
    else if (!db[userId]) res.send(404, 'User not found');
    else if (!req.body.title || !req.body.description)
        res.send(400, 'Missing data');
    else {
        var playlist = {
            id: String(Date.now()),
            title: req.body.title,
            description: req.body.description,
            date: Date.now(),
            videos: {}
        };
        if (req.body.thumbnail) playlist.thumbnail = req.body.thumbnail;
        db[userId].playlists[playlist.id] = playlist;
        var ret = {
            id: playlist.id,
            title: playlist.title,
            description: playlist.description,
            date: playlist.date
        };
        if (playlist.thumbnail) ret.thumbnail = playlist.thumbnail;
        res.send(ret);
    }
});


//AdNewPlaylistToUser
app.get('/myvideos/users/:userId/playlists/:playlistId', function(req, res) {
    console.log('GET /myvideos/users/' + req.params.userId + '/playlists/' +
        req.params.playlistId);
    var userId = req.params.userId;
    var playlistId = req.params.playlistId;
    if (!userId || !playlistId) res.send(400, 'Missing parameter');
    else if (!db[userId]) res.send(404, 'User not found');
    else if (!db[userId].playlists[playlistId])
        res.send(404, 'Playlist not found');
    else {
        var playlist = {
            id: db[userId].playlists[playlistId].id,
            title: db[userId].playlists[playlistId].title,
            description: db[userId].playlists[playlistId].description,
            date: db[userId].playlists[playlistId].date
        };
        if (db[userId].playlists[playlistId].thumbnail)
            playlist.thumbnail = db[userId].playlists[playlistId].thumbnail;
        res.send(playlist);
    }
});

//UpdatePlaylistOfUser
app.put('/myvideos/users/:userId/playlists/:playlistId', function(req, res) {
    console.log('PUT /myvideos/users/' + req.params.userId + '/playlists/' +
        req.params.playlistId);
    var userId = req.params.userId;
    var playlistId = req.params.playlistId;
    if (!userId || !playlistId) res.send(400, 'Missing parameter');
    else if (!db[userId]) res.send(404, 'User not found');
    else if (!db[userId].playlists[playlistId])
        res.send(404, 'Playlist not found');
    else {
        if (req.body.title) db[userId].playlists[playlistId].title = req.body.title;
        if (req.body.description)
            db[userId].playlists[playlistId].description = req.body.description;
        if (req.body.thumbnail)
            db[userId].playlists[playlistId].thumbnail = req.body.thumbnail;
        var playlist = {
            id: db[userId].playlists[playlistId].id,
            title: db[userId].playlists[playlistId].title,
            description: db[userId].playlists[playlistId].description,
            date: db[userId].playlists[playlistId].date
        };
        if (db[userId].playlists[playlistId].thumbnail)
            playlist.thumbnail = db[userId].playlists[playlistId].thumbnail;
        res.send(playlist);
    }
});

//deletePlaylistOfUser
app.delete('/myvideos/users/:userId/playlists/:playlistId', function(req, res) {
    console.log('DELETE /myvideos/users/' + req.params.userId + '/playlists/' +
        req.params.playlistId);
    var userId = req.params.userId;
    var playlistId = req.params.playlistId;
    if (!userId || !playlistId) res.send(400, 'Missing parameter');
    else if (!db[userId]) res.send(404, 'User not found');
    else if (!db[userId].playlists[playlistId])
        res.send(404, 'Playlist not found');
    else {
        delete db[userId].playlists[playlistId];
        res.send(204);
    }
});

//addVideoToPlaylistOfUser
app.post('/myvideos/users/:userId/playlists/:playlistId/videos', function(req,
    res) {
    console.log('POST /myvideos/users/' + req.params.userId + '/playlists/' +
        req.params.playlistId + '/videos');
    var userId = req.params.userId;
    var playlistId = req.params.playlistId;
    if (!userId || !playlistId) res.send(400, 'Missing parameter');
    else if (!db[userId]) res.send(404, 'User not found');
    else if (!req.body.id || !req.body.type) res.send(400, 'Missing data');
    else if (!db[userId].playlists[playlistId])
        res.send(404, 'Playlist not found');
    else {
        db[userId].playlists[playlistId].videos[req.body.id] = {
            id: req.body.id,
            type: req.body.type
        };
        res.send(204);
    }
});

//getAllVideosOfUserPlaylist
app.get('/myvideos/users/:userId/playlists/:playlistId/videos', function(req,
    res) {
    console.log('GET /myvideos/users/' + req.params.userId + '/playlists/' +
        req.params.playlistId + '/videos');
    var userId = req.params.userId;
    var playlistId = req.params.playlistId;
    if (!userId || !playlistId) res.send(400, 'Missing parameter');
    else if (!db[userId]) res.send(404, 'User not found');
    else if (!db[userId].playlists[playlistId])
        res.send(404, 'Playlist not found');
    else {
        var videos = [];
        for (var id in db[userId].playlists[playlistId].videos) {
            if (db[userId].playlists[playlistId].videos[id].type === 'local') {
                if (db[userId].videos[id] != null) {
                    videos.push(db[userId].videos[id]);
                } else {
                    delete db[userId].playlists[playlistId].videos[id];
                }
            } else videos.push(db[userId].playlists[playlistId].videos[id]);
        }
        res.send(videos);
    }
});

//deleteVideoOfPlaylistOfUser
app.delete('/myvideos/users/:userId/playlists/:playlistId/videos/:videoId',
    function(req, res) {
        console.log('GET /myvideos/users/' + req.params.userId + '/playlists/' +
            req.params.playlistId + '/videos/' + req.params.videoId);
        var userId = req.params.userId;
        var playlistId = req.params.playlistId;
        var videoId = req.params.videoId;
        if (!userId || !playlistId || !videoId) res.send(400, 'Missing parameter');
        else if (!db[userId]) res.send(404, 'User not found');
        else if (!db[userId].playlists[playlistId])
            res.send(404, 'Playlist not found');
        else if (!db[userId].playlists[playlistId].videos[videoId])
            res.send(404, 'Video not found');
        else {
            delete db[userId].playlists[playlistId].videos[videoId];
            res.send(204);
        }
    });

//updateOrderVideosOfPlaylistOfUser