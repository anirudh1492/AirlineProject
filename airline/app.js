var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var bodyParser = require('body-parser');
var session = require('express-session');
var sess
const fs = require('fs');
var indexRouter = require('./routes');
var usersRouter = require('./routes/users');
var crypto = require('crypto');

//var index = 8;


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
app.use('/public', express.static(__dirname + '/public'));

app.use('/users', usersRouter);

app.use(cookieParser());
app.use(session({secret: "No one  must know ;)"}));

app.get('/', function (req, res) {
  res.redirect('/public/index.html');
  return;
});


app.post('/signin', function(req, res) {
    var collection = db.get('user');
    var p = req.body.password;
    var md5_p = crypto.createHash('md5').update(p).digest("hex");
    console.log(md5_p);
    collection.find({user_email:req.body.emailid}, function(err, result){
        if (err){ 
            console.log("error ",err);
            // throw err;
            res.redirect('/public/homepage.html');
        }
        if(result){
            if(result[0]){
                if(md5_p == result[0].user_pass){
                    sess = req.session;
                    // console.log("result ",result);
                    sess.user_email = result[0]['user_email'];  
                    sess.profile_id = result[0]['_id'];
                    //res.json(videos);
                    res.cookie('name','test',{expire:360000+Date.now()}); 
                    res.redirect('/public/homepage.html');
                }  
                else
                {
                    console.log("Wrong password ");
                    // alert("Wrong credentials");
                    res.redirect('/public/homepage.html');
                }
            }
            else
            {
                console.log("no result ",result);
                // alert("Wrong credentials");
                res.redirect('/public/homepage.html');
            }
              
        } 
        else
        {
            console.log("no result ",result);
            // alert("Wrong credentials");
            res.redirect('/public/homepage.html');
        }
    });
    
    
});

app.post('/signup', (req, res) => {
    var collection = db.get('user');
    var firstname = req.body.firstname;
    var lastname = req.body.lastname;
    var password = req.body.password;
    var emailid = req.body.emailid;
    var mobile = parseInt(req.body.mobile);
    // console.log(password);
    collection.find({user_email:emailid},function(err,result){
            if(err){
                throw err;
            }
            if(result[0]){
                console.log("record exists");
                res.send("taken");
            }
            else
            {
                var pass_md5 = crypto.createHash('md5').update(password).digest("hex");
                collection.insert({fname:firstname,lname:lastname,user_pass:pass_md5,user_email:emailid},function(err,result){
                    try{
                        if(err){
                            throw err;
                        }
                        
                        console.log("record added");
                        res.send("done");
                    }
                    catch(err){
                        res.send(err);
                    }
            
                });
            }
            
    }
    );
    
    //index = index+1;

});

app.post('/seatSelect', function(req, res){
    var path = __dirname+"\\public\\flightSeats.html";
    console.log(path);
    fs.readFile(path, function(err, data){
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.write(data);
        res.end();
    });
});


app.post('/signinAdmin', (req, res) => {
  var collection = db.get('admin');
  collection.find({user_email:req.body.emailid,user_pass:req.body.password}, function(err, result){
        if (err) throw err;
        //res.redirect('/public/homepage.html');
        sess = req.session;
        sess.user_email = result[0]['user_email'];  

      	res.cookie('name','test',{expire:360000+Date.now()}); 
        res.redirect('/public/admin.html');

    });
});

app.post('/search', (req, res) => {
    console.log(sess.profile_id);
    var collection = db.get('flight_details');
    var from_place = req.body.from_place;
    var to_place = req.body.to_place;
    var date_to = req.body.date_to;
    var date_from = req.body.date_from;
    var num_passengers = req.body.num_passengers;
    var sortorder = req.body.sortorder;
    console.log(typeof(parseInt(sortorder)));
    var sortt = {price:1};


    collection.find({},{sort:{price:parseInt(sortorder)}},function(err, flight){
        if (err) throw err; 
        console.log(flight);
        res.send(flight);
       // res.end();
       //console.log(flight);

    });
    
    //res.send(ouput);
});

app.get('/resetSession',function(req,res){
  console.log('dddd');
  res.cookie("name","");
  console.log('Cookies:', req.cookies);
  res.send("Cokkie reset");
});

app.post('/bookedSeats', function (req, res) {
  console.log("server side " + req.body.flightId);
  var collection = db.get("ticket_details");
  var flightID = req.body.flightId;
  sess.flight_id = flightID;
  var dateFrom = req.body.dateFrom;
  sess.flight_departure_date = dateFrom;
    collection.find({f_id: flightID, f_dep_date: dateFrom}, { seat_details:1}, function (err, result) {
    if (err) throw err;
    res.send(result);
  });
});

app.post('/bookSeats', (req, res) => {
  var collection = db.get('ticket_details');
  console.log(req.body.length);
  
  var email_id = sess.user_email;

  var flight_departure_date = sess.flight_departure_date;
  var seatArray = [];
  var passengerDetails = [];

    var flight_id;
    var flight_dep_date;
    var from;
	var to;
	var departure_time;
	var arrival_time;
 //To get details of multiple people in one booking
  for (var i = 0; i < req.body.length; i++) {
    sess.flight_departure_date = req.body[i].dateFrom;
    flight_dep_date = req.body[i].dateFrom;
    flight_id = req.body[i].flight_id;
    from = req.body[i].from;
	to = req.body[i].to;
	departure_time = req.body[i].departure_time;
	arrival_time = req.body[i].arrival_time;
    seatArray.push(req.body[i].seatnumber);
    passengerDetails.push(req.body[i].passengername);
  }

  var flight_status = 1;
  var prof_id = String(sess.profile_id);
  
  collection.insert({pf_id:prof_id, booked_by: email_id, f_id: flight_id, f_dep_date: flight_dep_date, f_status: flight_status,
  seat_details:seatArray, passenger_details: passengerDetails,from_location:from,to_location:to,departure_time:departure_time,arrival_time:arrival_time}, function (err, result) {
    try {
      if (err) {
        throw err;
      }
      console.log("ticket record added");
      res.send("done");
    }
    catch (err) {
      res.send(err);
    }

  });
});

app.post('/findmybooking', (req, res) => {
  var ticketid = req.body.ticketid;
  var lastname = req.body.lastname;
  var u_email = sess.user_email;
  var collection = db.get("ticket_details");

  collections.find({_id:ticketid,booked_by:u_email}, function(err, result){
    if(err) throw err;
    res.send(result);
  });
});

//Anshul -- we need to use findAndModify with ticketid and email. This can be done later.
app.post('/onlinecheckin', (req, res) => {
  var ticketid = req.body.ticketid;
  var lastname = req.body.lastname;
  console.log(ticketid);
  var sql = "SELECT (CASE WHEN count = 1 THEN 'present' ELSE 'not present' END) as isPresent FROM (SELECT COUNT(*) AS count FROM air_ticket_info INNER JOIN user_profile ON air_ticket_info.profile_id = user_profile.profile_id WHERE ticket_id = '"+ticketid+"' AND lastname = '"+lastname+"') AS a";
  con.query(sql, function(err, result){
      if (err) 
          throw err;
      if(!result.includes('not')){
          sql = "insert into passenger_checkin(ticket_id, checkedin) values(ticketid, 'true')";
      }
  });
});


app.post('/ticket', function(req, res){
  var collection = db.get("ticket_details");
  console.log(req.body[0].ticket_id);
  var ticketid = req.body[0].ticket_id;

  collection.find({pf_id:ticketid}, function(err, result){
      if(err)
          throw err;
      res.send(result);
  });
});


//Anirudh -- Got this working Partially - Need to Update the mongoDb collections
app.post('/ticketList', function(req, res){
  var collection = db.get("ticket_details");
  console.log(req.body);
  profile_id = sess.profile_id;
  var prof_id = String(profile_id)
  
  console.log("prof_id",prof_id);
  collection.find({pf_id:prof_id}, function(err, result){
      if(err)
          throw err;
      console.log(result);
      res.send(result);
  });
});


app.post('/passenger', (req, res) => {
  console.log("passenger");
  console.log(req.body[0].ticket_id);
  ticket_id = req.body[0].ticket_id;
  var collection = db.get("ticket_details");

  collection.find({pf_id:ticket_id},{passenger_details:1}, function(err, result){
    console.log(result);
    if(err)throw err;
    res.send(result);
  });
});

app.post('/flight', (req, res) => {
  var collection = db.get("flight_details");
 
  collection.find({deleted:0},{airline_id:1,airline_name:1,from:1,to:1,total_seats:1},
    function(err,result){
      if(err)throw err;
      res.send(result);
    });
});

app.post('/flights', (req, res) => {
  console.log(req.body);
  var a_name = req.body.airlinename;
  var airlineid = parseInt(req.body.airlineid);
  var from_location = req.body.fromlocation;
  var to_location = req.body.tolocation;
  var totalseats = req.body.totalseats;
  var departuredate = req.body.departuredate;
  var departuretime = req.body.departuretime;
  var arrivaldate = req.body.arrivaldate;
  var arrivaltime = req.body.arrivaltime;
  var p = req.body.price;
  var collection = db.get("flight_details");

  collection.insert({airline_id:airlineid,airline_name:a_name,from:from_location,to:to_location,
    total_seats:totalseats,departure_dates:departuredate,departure_time:departuretime,
     arrival_date:arrivaldate, arrival_time:arrivaltime,price:p,seats_left:totalseats,deleted:0},
      function(err,result){
      if(err)throw err;
      console.log("Insertion reult is");
      console.log(result);
      res.send("done");
    });
});

app.post('/updateFlight', (req, res) => {
  var flight_id = parseInt(req.body.flight_id);
  var seat_number = req.body.seats;
  console.log(flight_id+"-"+seat_number);
  var collection = db.get("flight_details");
  collection.update({airline_id:flight_id}, {$set:{total_seats:seat_number}}, function(err, result){
    if(err)throw err;
    res.send("done");
  });


});

app.post('/deleteflight', (req, res) => {
  var collection = db.get("flight_details");
  var aid = req.body.airline_id;
  console.log("airline id to be deleted is ");
  airlineid = parseInt(aid);
  console.log(airlineid);
  collection.update({airline_id:airlineid}, {$set:{deleted:1}}, function(err, result){
    if(err)throw err;
    res.send(result);
  });
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
