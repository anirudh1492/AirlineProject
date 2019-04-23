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

//app.use('/', indexRouter);
app.use('/users', usersRouter);
// catch 404 and forward to error handler
// app.use(function(req, res, next) {
//   next(createError(404));
// });

//app.use(express.static(path.join(__dirname, 'public')));
//app.use('/public', express.static(__dirname + '/public'));

app.use(cookieParser());
app.use(session({secret: "No one  must know ;)"}));

app.get('/', function (req, res) {
  res.redirect('/public/index.html');
  return;
});


app.post('/signin', function(req, res) {
    var collection = db.get('user');
    collection.find({user_email:req.body.emailid,user_pass:req.body.password}, function(err, result){
        if (err) throw err;
        //res.redirect('/public/homepage.html');
        sess = req.session;
        sess.user_email = result[0]['user_email'];  
        sess.profile_id = result[0]['_id'];
      	//res.json(videos);
      	res.cookie('name','test',{expire:360000+Date.now()}); 
        res.redirect('/public/homepage.html');

    });
    
    
});

app.post('/signup', (req, res) => {
    var collection = db.get('user');
    var firstname = req.body.firstname;
    var lastname = req.body.lastname;
    var password = req.body.password;
    var emailid = req.body.emailid;
    var mobile = parseInt(req.body.mobile);
    console.log(password);
    //var sql = "insert into user_profile(user_password, firstname, lastname, mobile_number, email_id) values (MD5('"+password+"'),'"+firstname+"','"+lastname+"','"+mobile+"','"+emailid+"')";
    //console.log(sql);
    //con.query(sql, function(err, result){
      //  try{
        //    if(err){
                //throw err;
          //  }
            //console.log("1 record added");
            //res.send("done");
        //}
        //catch(err){
          //  res.send(err);
        //}
    //});

    collection.insert({fname:firstname,lname:lastname,user_pass:password,user_email:emailid},function(err,result){
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
        //sess.user_id = result[0]['user_id'];
      	//res.json(videos);
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
  
  //var sql = "select group_concat(seat_number) as seat_numbers from passenger_seat inner join air_ticket_info on passenger_seat.ticket_id = air_ticket_info.ticket_id  where flight_id = "+flightID+" and flight_departure_date ='"+ dateFrom+"';";
    collection.find({f_id: flightId, f_dep_date: dateFrom}, { seat_details:1}, function (err, result) {
    if (err) throw err;
    res.send(result);
  });
});

app.post('/bookSeats', (req, res) => {
  var collection = db.get('ticket_details');
  console.log(req.body.length);
  //var profile_id = sess.profile_id;
  var email_id = sess.user_email;
  var flight_id = sess.flight_id;
  var flight_departure_date = sess.flight_departure_date;
  var seatArray = [];
  var passangerDetails = [];
  //To auto-increment ticket_id
  var sequenceDocument = collection.findAndModify({
    query:{_id: sequenceName },
    update: {$inc:{sequence_value:1}},
    new:true
 });

 //To get details of multiple people in one bookin
  for (var i = 0; i < req.body.length; i++) {
    seatArray.push(req.body[i].seatnumber);
    passangerDetails.push(req.body[i].passengername);
  }

  var flight_status = 1;
  
  collection.insert({_id:sequenceDocument.sequence_value, booked_by: email_id, f_id: flight_id, f_dep_date: flight_departure_date, f_status: flight_status,
  seat_details:seatArray, passenger_details: passangerDetails}, function (err, result) {
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
  //console.log(ticketid);
  //var sql = "select * from air_ticket_info where ticketid='"+ticketid;
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

//Anshul -- Complex query but since we are using one collection to store all the flight related data. This can be don. Need to check.
app.post('/ticket', function(req, res){
  var collection = db.get("ticket_details");
  console.log(req.body[0].ticket_id);
  var ticketid = req.body[0].ticket_id;
  //var sql = "select air_flight.flight_id, air_flight_details.flight_departure_date, departure_time, flight_arrival_date, arrival_time, price, from_location, to_location from air_flight_details inner join air_ticket_info on air_flight_details.flight_id = air_ticket_info.flight_id inner join air_flight on air_flight.flight_id = air_flight_details.flight_id where ticket_id = '"+ticketid+"'";
  
  collection.find({f_dep_date:ticketid}, function(err, result){
      if(err)
          throw err;
      res.send(result);
  });
});

//Anshul -- Complex query but since we are using one collection to store all the flight related data. This can be don. Need to check.
//Anirudh -- Got this working Partially - Need to Update the mongoDb collections
app.post('/ticketList', function(req, res){
  var collection = db.get("ticket_details");
  console.log(req.body);
  profile_id = sess.profile_id;
  var prof_id = String(profile_id)
  //var sql = "select air_flight.flight_id, air_ticket_info.ticket_id, air_flight_details.flight_departure_date, departure_time, flight_arrival_date, arrival_time, from_location, to_location from air_flight_details inner join air_ticket_info on air_flight_details.flight_id = air_ticket_info.flight_id inner join air_flight on air_flight.flight_id = air_flight_details.flight_id where profile_id = '"+profile_id+"'";
  console.log(typeof prof_id);
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
  //var sql = "select group_concat(fullname) as passengers from passenger_seat where ticket_id = '"+ticket_id+"'";
  //console.log(sql);
  collection.find({_id:ticket_id},{passenger_details:1}, function(err, result){
    if(err)throw err;
    res.send(result);
  });
});

app.post('/flight', (req, res) => {
  var collection = db.get("flight_details");
  //var sql = "select flight_id, airline_name, from_location, to_location, total_seats from air_flight where deleted!='1'";
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
  //sql = "update air_flight set total_seats='"+seat_number+"' where flight_id='"+flight_id+"'";
  // con.query(sql, function(err, result){
  //     if(err)
  //         throw err;
  //     res.send("Updated");
  // });

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
