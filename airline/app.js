var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var bodyParser = require('body-parser');
var session = require('express-session');
var sess
var indexRouter = require('./routes');
var usersRouter = require('./routes/users');



var monk = require('monk');
var db = monk('localhost:27017/airline');


var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
//app.use(express.static(path.join(__dirname, 'public')));
app.use('/public', express.static(__dirname + '/public'));

app.use(cookieParser());
app.use(session({secret: "No one  must know ;)"}));

app.post('/signin', function(req, res) {
    var collection = db.get('user');
    collection.find({user_email:req.body.emailid,user_pass:req.body.password}, function(err, videos){
        if (err) throw err;
        //res.redirect('/public/homepage.html');
        sess = req.session;
        sess.user_email = videos[0]['user_email'];  
        sess.user_id = videos[0]['user_id'];
      	//res.json(videos);
      	res.cookie('name','test',{expire:360000+Date.now()}); 
        
        res.redirect('/public/homepage.html');

    });
    
    
});


app.post('/search', (req, res) => {
    console.log(sess.user_id);
    var collection = db.get('flight_details');
    var from_place = req.body.from_place;
    var to_place = req.body.to_place;
    var date_to = req.body.date_to;
    var date_from = req.body.date_from;
    var num_passengers = req.body.num_passengers;
    var sortorder = req.body.sortorder;
    //var sql = "select air_flight.flight_id, air_flight.from_location, air_flight.to_location, airline_name, flight_departure_date, flight_arrival_date, departure_time, arrival_time, price  from air_flight inner join air_flight_details on air_flight.flight_id = air_flight_details.flight_id where from_location='"+from_place+"' and to_location='"+to_place+"' and total_seats >= '"+num_passengers +"' and flight_departure_date = '"+date_to+"' and air_flight.deleted!='1' order by price "+sortorder+";";
    //console.log(sql);
    //collection.find({$and:[{from:from_place},{to:to_place}]});
    collection.find({$and:[{from:from_place},{to:to_place},{departure_dates:date_to}]}, function(err, flight){
        if (err) throw err; 
        console.log(flight);
        res.send(flight);
       // res.end();
       //console.log(flight);

    });
});

//app.use('/', indexRouter);
app.use('/users', usersRouter);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
