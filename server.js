var express = require('express');
var app = express();
var fs = require("fs");


app.post('/translate', function (req, res) {
     console.log(req.body);
})

var server = app.listen(2424, function () {
   var host = server.address().address
   var port = server.address().port
   console.log("Language Translator API Running at http://%s:%s", host, port)
})