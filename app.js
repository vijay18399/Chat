var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var Sentiment = require("sentiment");
var sentiment = new Sentiment();
var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");
var session = require("express-session");
var spamcheck = require("spam-detection");
var isSpam = require("spam-detector");

var app = express();
const chatServer = require("http").createServer(app);

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
//chat
app.use(
  session({
    secret: "sessi0nS3cr3t",
    saveUninitialized: true,
    resave: false
  })
);

global.users = [];
const io = require("socket.io")(chatServer);

io.use((socket, next) => {
  let token = socket.handshake.query.username;
  if (token) {
    return next();
  }
  return next(new Error("authentication error"));
});

io.on("connection", client => {
  let token = client.handshake.query.username;
  client.on("disconnect", () => {
    var clientid = client.id;
    for (var i = 0; i < users.length; i++)
      if (users[i].id && users[i].id == clientid) {
        users.splice(i, 1);
        break;
      }
  });
  users.push({
    id: client.id,
    name: token
  });
  client.on("typing", data => {
    io.emit("typing", data);
  });

  client.on("stoptyping", data => {
    io.emit("stoptyping", data);
  });

  client.on("message", data => {
    var x = sentiment.analyze(data.msg);
    data.score = x.score;
    var matches = data.msg.match(/\bhttps?:\/\/\S+/gi);
    if (matches) {
      let originalString = data.msg;
      let newString = originalString.replace(
        /\b((?:[a-z][\w-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/g,
        ""
      );
      data.spamcheck = spamcheck.detect(newString);
      isSpam(matches[0], function(err, data1) {
        data.isurlspam = data1;
        io.emit("message", data);
      });
    } else {
      data.spamcheck = spamcheck.detect(data.msg);
      data.isurlspam = false;
      io.emit("message", data);
    }
  });

  io.emit("newuser", {
    id: client.id,
    name: token
  });
});
chatServer.listen(7777);

app.use("/", indexRouter);
app.use("/users", usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
