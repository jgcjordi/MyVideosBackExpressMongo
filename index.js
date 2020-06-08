var express = require('express');
var bodyParser = require('body-parser');

var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;

var db;

var init = () => {
    var url = 'mongodb://localhost:27017/myvideos';
    console.log('- connecting to dabatase');
    MongoClient.connect(url, (err, _db) => {
        if (err) {
            console.log(' - unable to open connection');
            process.exit();
        } else {
            console.log(' - connection opened');
            db = _db;
        }
    });
};
init();

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
    } else {
        db.collection('users').findOne({ _id: ObjectID.createFromHexString(req.query.token) },
            (err, doc) => {
                if (err) res.send(500);
                else if (!doc) res.send(401, 'Invalid token');
                else next();
            });
    }
});


// define routes
// sessions
app.post('/myvideos/sessions', function(req, res) {
    console.log('POST /myvideos/sessions');
    if (!req.body.email || !req.body.password) res.send(400, 'Missing data');
    else {
        db.collection('users').findOne({ email: req.body.email, password: req.body.password },
            (err, doc) => {
                if (err) res.send(500);
                else if (!doc) res.send(401);
                else res.send({
                    userId: doc._id.toHexString(),
                    token: doc._id.toHexString()
                });
            });
    }
});



//////////////////// USERS ////////////////////

//getAllUsers
app.get('/myvideos/users', function(req, res) {
    console.log('GET /myvideos/user/');
    db.collection('users').find().toArray((err, docs) => {
        if (err) res.send(500);
        else res.send(docs.map((doc) => {
            var user = {
                id: doc._id.toHexString(),
                email: doc.email,
                name: doc.name,
                surname: doc.surname
            };
            return user;
        }));
    });
});

//saveNewUser
app.post('/myvideos/users', function(req, res) {
    console.log('POST /myvideos/users');
    if (!req.body.email || !req.body.password || !req.body.name ||
        !req.body.surname)
        res.send(400, 'Missing data');
    else {
        var user = {
            email: req.body.email,
            password: req.body.password,
            name: req.body.name,
            surname: req.body.surname
        };
        db.collection('users').insertOne(user, (err, result) => {
            if (err) res.send(500);
            else res.send({
                id: result.insertedId.toHexString(),
                name: user.name,
                surname: user.surname,
                email: user.email
            });
        });
    }
});

//getUserById
app.get('/myvideos/users/:userId', function(req, res) {
    console.log('GET /myvideos/users/' + req.params.userId);
    var userId = req.params.userId;
    if (!userId) res.send(400, 'Missing parameter');
    else {
        db.collection('users').findOne({ _id: ObjectID.createFromHexString(userId) },
            (err, doc) => {
                if (err) res.send(500);
                else if (!doc) res.send(404, 'User not found');
                else {
                    var user = {
                        id: doc._id.toHexString(),
                        email: doc.email,
                        name: doc.name,
                        surname: doc.surname
                    };
                    res.send(user);
                }
            });
    }
});

//updateUserById
app.put('/myvideos/users/:userId', function(req, res) {
    console.log('PUT /myvideos/users/' + req.params.userId);
    var userId = req.params.userId;
    if (!userId) res.send(400, 'Missing parameter');
    else {
        db.collection('users').findOne({ _id: ObjectID.createFromHexString(userId) },
            (err, doc) => {
                if (err) res.send(500);
                else if (!doc) res.send(404, 'User not found');
                else {
                    var user = {
                        id: doc._id.toHexString(),
                        name: req.body.name || doc.name,
                        surname: req.body.surname || doc.surname,
                        email: req.body.email || doc.email,
                        password: req.body.password || doc.password
                    };
                    db.collection('users').updateOne({ _id: ObjectID.createFromHexString(userId) }, { $set: user },
                        (err, doc) => {
                            if (err) res.send(500, err);
                            else res.send(user);
                        });
                }
            });
    }
});

//deleteUserByid
app.delete('/myvideos/users/:userId', function(req, res) {
    console.log('DELETE /myvideos/users/' + req.params.userId);
    var userId = req.params.userId;
    if (!userId) res.send(400, 'Missing parameter');
    else {
        db.collection('users').deleteOne({ _id: ObjectID.createFromHexString(userId) },
            (err, result) => {
                if (err) res.send(500, err);
                else res.send(204);
            });
    }
});




//////////////////////// VIDEOS //////////////////////////
//getAllVideosFromUser
app.get('/myvideos/users/:userId/videos', function(req, res) {
    console.log('GET /myvideos/user/' + req.params.userId + '/videos');
    var userId = req.params.userId;
    if (!userId) res.send(400, 'Missing parameter');
    db.collection('users').findOne({ _id: ObjectID.createFromHexString(userId) }, (err, doc) => {
        if (err) res.send(500);
        else if (!doc) res.send(404, 'User not found');
        else if (!doc.videos) res.send([]);
        else {
            var videos = doc.videos;
            if (req.query.q) {
                let _videos = videos.filter((video) => {
                    return video.title.indexOf(req.query.q) !== -1;
                })
                res.send(_videos)
            } else {
                res.send(videos);
            }
        }
    })
});

//addNewVideoToUser
app.post('/myvideos/users/:userId/videos', function(req, res) {
    console.log('POST /myvideos/user/' + req.params.userId + '/videos');
    var userId = req.params.userId;
    if (!userId) res.send(400, 'Missing parameter');
    else if (!req.body.type || !req.body.url || !req.body.title)
        res.send(400, 'Missing data');
    else {
        db.collection('users').findOne({ _id: ObjectID.createFromHexString(userId) }, (err, doc) => {
            if (err) res.send(500)
            else if (!doc) res.send(404, 'User not found');
            else {
                var video = {
                    id: Date.now(),
                    type: req.body.type,
                    url: req.body.url,
                    title: req.body.title,
                    date: Date.now()
                };
                if (req.body.avatar) contact.avatar = req.body.avatar;
                if (req.body.description) video.description = req.body.description;
                if (req.body.thumbnail) video.thumbnail = req.body.thumbnail;
                if (req.body.tags) video.tags = req.body.tags;
                if (req.body.width) video.width = req.body.width;
                if (req.body.height) video.height = req.body.height;
                db.collection('users').update({ _id: ObjectID.createFromHexString(userId) }, { $push: { videos: video } }, (err, doc) => {
                    if (err) res.send(500, err);
                    else res.send(video);
                });
            }
        })
    }
});

//getVideoFromUser
app.get('/myvideos/users/:userId/videos/:videoId', function(req, res) {
    console.log('GET /myvideos/users/' + req.params.userId + '/videos/' +
        req.params.videoId);
    var userId = req.params.userId;
    var videoId = req.params.videoId;
    if (!userId || !videoId) res.send(400, 'Missing parameter');
    else {
        db.collection('users').findOne({ _id: ObjectID.createFromHexString(userId) }, (err, doc) => {
            if (err) res.send(500);
            else if (!doc) res.send(404, 'User not found');
            else {
                var index = doc.videos.findIndex(
                    (video) => video.id === Number(videoId));
                if (index === -1) res.send(404, 'Video not found');
                else {
                    var video = doc.videos[index];
                    res.send(video)
                }
            }
        })
    }
});

//updateVideoToUser
app.put('/myvideos/users/:userId/videos/:videoId', function(req, res) {
    console.log('PUT /myvideos/users/' + req.params.userId + '/videos/' +
        req.params.videoId);
    var userId = req.params.userId;
    var videoId = req.params.videoId;
    if (!userId || !videoId) res.send(400, 'Missing parameter');
    else {
        db.collection('users').findOne({ _id: ObjectID.createFromHexString(userId) }, (err, doc) => {
            if (err) res.send(500);
            else if (!doc) res.send(404, 'User not found');
            else {
                var index = doc.videos.findIndex(
                    (video) => video.id === Number(videoId));
                if (index === -1) res.send(404, 'Video not found');
                else {
                    var video = doc.videos[index];
                    if (req.body.type) video.type = req.body.type;
                    if (req.body.url) video.url = req.body.url;
                    if (req.body.title) video.title = req.body.title;
                    if (req.body.description) video.description = req.body.description;
                    if (req.body.thumbnail) video.thumbnail = req.body.thumbnail;
                    if (req.body.tags) video.tags = req.body.tags;
                    if (req.body.width) video.width = req.body.width;
                    if (req.body.height) video.height = req.body.height;
                    db.collection('users').update({ _id: ObjectID.createFromHexString(userId), "videos.id": Number(videoId) }, { $set: { "videos.$": video } },
                        (err, doc) => {
                            if (err) res.send(500, err);
                            else res.send(video);
                        });
                }
            }
        })
    }
});

//deleteVideoOfUser
app.delete('/myvideos/users/:userId/videos/:videoId', function(req, res) {
    console.log('DELETE /myvideos/users/' + req.params.userId + '/videos/' +
        req.params.videoId);
    var userId = req.params.userId;
    var videoId = req.params.videoId;
    if (!userId || !videoId) res.send(400, 'Missing parameter');
    else {
        db.collection('users').findOne({ _id: ObjectID.createFromHexString(userId) }, (err, doc) => {
            if (err) res.send(500);
            else if (!doc) res.send(404, 'User not found');
            else {
                var index = doc.videos.findIndex(
                    (video) => video.id === Number(videoId));
                if (index === -1) res.send(404, 'Video not found');
                else {
                    db.collection('users').update({ _id: ObjectID.createFromHexString(userId) }, { $pull: { videos: { id: Number(videoId) } } },
                        (err, doc) => {
                            if (err) res.send(500, err);
                            else res.send(204);
                        });
                }
            }
        })
    }
});



/////////////////////////// PLAYLISTS ////////////////////////////////////

//GetAllPlaylistsOfUser
app.get('/myvideos/users/:userId/playlists', function(req, res) {
    console.log('GET /myvideos/user/' + req.params.userId + '/playlists');
    var userId = req.params.userId;
    if (!userId) res.send(400, 'Missing parameter');
    db.collection('users').findOne({ _id: ObjectID.createFromHexString(userId) }, (err, doc) => {
        if (err) res.send(500);
        else if (!doc) res.send(404, 'User not found');
        else if (!doc.playlists) res.send([])
        else {
            var playlists = doc.playlists;
            for (var playlist of playlists) {
                if (playlist.videos) playlist.count = Object.keys(playlist.videos).length;
                else playlist.count = 0
            }
            res.send(playlists)
        }
    })
});

//AdNewPlaylistToUser
app.post('/myvideos/users/:userId/playlists', function(req, res) {
    console.log('POST /myvideos/user/' + req.params.userId + '/playlists');
    var userId = req.params.userId;
    if (!userId) res.send(400, 'Missing parameter');
    else if (!req.body.title || !req.body.description)
        res.send(400, 'Missing data');
    else {
        db.collection('users').findOne({ _id: ObjectID.createFromHexString(userId) }, (err, doc) => {
            if (err) res.send(500)
            else if (!doc) res.send(404, 'User not found');
            else {
                var playlist = {
                    id: Date.now(),
                    title: req.body.title,
                    description: req.body.description,
                    date: Date.now(),
                    videos: {}
                };
                if (req.body.thumbnail) playlist.thumbnail = req.body.thumbnail;
                db.collection('users').update({ _id: ObjectID.createFromHexString(userId) }, { $push: { playlists: playlist } }, (err, doc) => {
                    if (err) res.send(500, err);
                    else res.send(playlist);
                });
            }
        })
    }
});


//GetPlaylistOfUser
app.get('/myvideos/users/:userId/playlists/:playlistId', function(req, res) {
    console.log('GET /myvideos/users/' + req.params.userId + '/playlists/' +
        req.params.playlistId);
    var userId = req.params.userId;
    var playlistId = req.params.playlistId;
    if (!userId || !playlistId) res.send(400, 'Missing parameter');
    else {
        db.collection('users').findOne({ _id: ObjectID.createFromHexString(userId) }, (err, doc) => {
            if (err) res.send(500);
            else if (!doc) res.send(404, 'User not found');
            else {
                var index = doc.playlists.findIndex(
                    (playlist) => playlist.id === Number(playlistId));
                if (index === -1) res.send(404, 'Playlist not found');
                else {
                    var playlist = doc.playlists[index];
                    res.send(playlist)
                }
            }
        })
    }
});

//UpdatePlaylistOfUser
app.put('/myvideos/users/:userId/playlists/:playlistId', function(req, res) {
    console.log('PUT /myvideos/users/' + req.params.userId + '/playlists/' +
        req.params.playlistId);
    var userId = req.params.userId;
    var playlistId = req.params.playlistId;
    if (!userId || !playlistId) res.send(400, 'Missing parameter');
    else {
        db.collection('users').findOne({ _id: ObjectID.createFromHexString(userId) }, (err, doc) => {
            if (err) res.send(500);
            else if (!doc) res.send(404, 'User not found');
            else {
                var index = doc.playlists.findIndex(
                    (playlist) => playlist.id === Number(playlistId));
                if (index === -1) res.send(404, 'Playlist not found');
                else {
                    var playlist = doc.playlists[index];
                    if (req.body.title) playlist.title = req.body.title;
                    if (req.body.description) playlist.description = req.body.description;
                    if (req.body.thumbnail) playlist.thumbnail = req.body.thumbnail;
                    db.collection('users').update({ _id: ObjectID.createFromHexString(userId), "playlists.id": Number(playlistId) }, { $set: { "playlists.$": playlist } },
                        (err, doc) => {
                            if (err) res.send(500, err);
                            else res.send(playlist);
                        });
                }
            }
        })
    }
});

//deletePlaylistOfUser
app.delete('/myvideos/users/:userId/playlists/:playlistId', function(req, res) {
    console.log('DELETE /myvideos/users/' + req.params.userId + '/playlists/' +
        req.params.playlistId);
    var userId = req.params.userId;
    var playlistId = req.params.playlistId;
    if (!userId || !playlistId) res.send(400, 'Missing parameter');
    else {
        db.collection('users').findOne({ _id: ObjectID.createFromHexString(userId) }, (err, doc) => {
            if (err) res.send(500);
            else if (!doc) res.send(404, 'User not found');
            else {
                var index = doc.playlists.findIndex(
                    (playlist) => playlist.id === Number(playlistId));
                if (index === -1) res.send(404, 'Video not found');
                else {
                    db.collection('users').update({ _id: ObjectID.createFromHexString(userId) }, { $pull: { playlists: { id: Number(playlistId) } } },
                        (err, doc) => {
                            if (err) res.send(500, err);
                            else res.send(204);
                        });
                }
            }
        })
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
    else if (!req.body.id || !req.body.type) res.send(400, 'Missing data');
    else {
        db.collection('users').findOne({ _id: ObjectID.createFromHexString(userId) }, (err, doc) => {
            if (err) res.send(500)
            else if (!doc) res.send(404, 'User not found');
            else {
                var index = doc.playlists.findIndex(
                    (playlist) => playlist.id === Number(playlistId));
                if (index === -1) res.send(404, 'Playlist not found');
                else {
                    var playlist = doc.playlists[index];
                    playlist.videos[req.body.id] = {
                        id: req.body.id,
                        type: req.body.type
                    }
                    db.collection('users').update({ _id: ObjectID.createFromHexString(userId), "playlists.id": Number(playlistId) }, { $set: { "playlists.$": playlist } },
                        (err, doc) => {
                            if (err) res.send(500, err);
                            else res.send(204);
                        });
                }
            }
        })
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
    else {
        db.collection('users').findOne({ _id: ObjectID.createFromHexString(userId) }, (err, doc) => {
            if (err) res.send(500)
            else if (!doc) res.send(404, 'User not found');
            else {
                var index = doc.playlists.findIndex(
                    (playlist) => playlist.id === Number(playlistId));
                if (index === -1) res.send(404, 'Playlist not found');
                else {
                    var videos = [];
                    for (var id in doc.playlists[index].videos) {
                        if (doc.playlists[index].videos[id].type === 'local') {
                            var indexVideo = doc.videos.findIndex(
                                (_video) => _video.id === Number(id));
                            if (indexVideo !== -1) {
                                videos.push(doc.videos[indexVideo]);
                            } else {
                                var playlist = doc.playlists[index];
                                delete playlist.videos[id]
                                db.collection('users').update({ _id: ObjectID.createFromHexString(userId), "playlists.id": Number(playlistId) }, { $set: { "playlists.$": playlist } },
                                    (err, doc) => {
                                        if (err) res.send(500, err);
                                    });
                            }
                        } else videos.push(doc.playlists[index].videos[id]);
                    }
                    res.send(videos);
                }
            }
        })
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


        else {
            db.collection('users').findOne({ _id: ObjectID.createFromHexString(userId) }, (err, doc) => {
                if (err) res.send(500)
                else if (!doc) res.send(404, 'User not found');
                else {
                    var index = doc.playlists.findIndex(
                        (playlist) => playlist.id === Number(playlistId));
                    if (index === -1) res.send(404, 'Playlist not found');
                    else {
                        if (!doc.playlists[index].videos[videoId]) res.send(404, 'Video not found');
                        else {
                            var playlist = doc.playlists[index];
                            delete playlist.videos[videoId]
                            console.log(playlist)
                            db.collection('users').update({ _id: ObjectID.createFromHexString(userId), "playlists.id": Number(playlistId) }, { $set: { "playlists.$": playlist } },
                                (err, doc) => {
                                    if (err) res.send(500, err);
                                    else res.send(204);
                                });
                        }
                    }
                }
            })
        }
    });

//updateOrderVideosOfPlaylistOfUser


app.listen(8080);
console.log('HTTP server running');