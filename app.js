/*eslint-env node*/

//------------------------------------------------------------------------------
// node.js starter application for Bluemix
//------------------------------------------------------------------------------

var path = require('path');

// This application uses express as its web server
// for more info, see: http://expressjs.com
var express = require('express');

// cfenv provides access to your Cloud Foundry environment
// for more info, see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');

var log4js = require('log4js');

var logger = log4js.getLogger('application');

// create a new express server
var app = express();
var http = require('http');

//bodyparser for POST requests.
var bodyParser = require('body-parser');
// parse application/x-www-form-urlencoded 
app.use(bodyParser.urlencoded({ extended: false }));
 
// parse application/json 
app.use(bodyParser.json());

var manager = require('./account');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// serve the files out of ./public as our main files
app.use(express.static(path.join(__dirname, 'public')));

// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

// start server on the specified port and binding host
app.listen(appEnv.port, '0.0.0.0', function () {

    // print a message when the server starts listening
    logger.info("server starting on " + appEnv.url);

    //Home page
    app.get("/", function (req, res) {
        res.render('index', {
            title: 'Cloud Insurance Co - the one with the AI Bot',
            page: 'homePage',
        });
    });

    app.get("/about", function (req, res) {
        res.render('about', {
            title: 'Cloud Insurance Co - About',
            page: 'homePage',
        });
    })

    //member page
    app.get("/member", function (req, res) {

        var name = req.query.name;
        var id = req.query.id;

        var db = cloudant.db.use("insurance");

        db.list(function (err, body) {

            if (err) {
                logger.error(err);
            } else {

                var rows = body.rows;
                var count = rows.length;

                logger.info("Number of accounts: " + count);

                var item;

                /* TODO: should be able to use a find method here */

                rows.forEach(function (account) {
                    db.get(account.id, {
                        revs_info: true
                    }, function (err, doc) {

                        if (doc.name === name && doc.id === id) {

                            res.render('member', {
                                title: 'Policy Member',
                                page: 'member',
                                memberData: doc
                            });
                        }
                    })
                })
            }
        })
    });


    app.param('id', function (req, res, next, id) {

        /* Facebook creds come in like this: id~name */

        var components = id.split('~')

        var identifier = components[0];
        var name = components[1];

        manager.findAccount(identifier, name, res, manager.handleAccountOutcome);
    });

    app.get("/person/:id", function (req, res) {});

    //health page
    app.get("/health", function (req, res) {
        db.find({
            selector: {
                payer_name: (!req.query.payername) ? 'Tom Murphy' : req.query.payername
            }
        }, function (er, result) {
            if (er) {
                throw er;
            }

            console.log('Found %d documents', result.docs.length);
            for (var i = 0; i < result.docs.length; i++) {
                //console.log('  Doc id: %s', result.docs[i]._id);

                res.render('health', {
                    title: 'Health Member',
                    page: 'health',
                    memberData: result.docs[i]
                });
            }
        });

    });


    //home insurance page
    app.get("/home", function (req, res) {
        db.find({
            selector: {
                payer_name: (!req.query.payername) ? 'Tom Murphy' : req.query.payername
            }
        }, function (er, result) {
            if (er) {
                throw er;
            }

            console.log('Found %d documents', result.docs.length);
            for (var i = 0; i < result.docs.length; i++) {
                //console.log('  Doc id: %s', result.docs[i]._id);

                res.render('home', {
                    title: 'Home Policy',
                    page: 'home',
                    memberData: result.docs[i]
                });
            }
        });

    });

    //car insurance page
    app.get("/auto", function (req, res) {
        db.find({
            selector: {
                payer_name: (!req.query.payername) ? 'Tom Murphy' : req.query.payername
            }
        }, function (er, result) {
            if (er) {
                throw er;
            }

            console.log('Found %d documents', result.docs.length);
            for (var i = 0; i < result.docs.length; i++) {
                //console.log('  Doc id: %s', result.docs[i]._id);

                res.render('auto', {
                    title: 'Auto Policy',
                    page: 'auto',
                    memberData: result.docs[i]
                });
            }
        });

    });


    //----------------------------------------------------------------------------------
    // Cloudant connections
    //----------------------------------------------------------------------------------    

    //Added for Json Readability    
    app.set('json spaces', 6);

    //Cloudant Initialization code
    require('dotenv').load();
    // Load the Cloudant library.
    var Cloudant = require('cloudant');
    //using Bluemix VCAP_SERVICES for Cloudant credentials
    if (process.env.VCAP_SERVICES) {
        // Running on Bluemix. Parse the port and host that we've been assigned.
        var env = JSON.parse(process.env.VCAP_SERVICES);
        var host = process.env.VCAP_APP_HOST;
        var port = process.env.VCAP_APP_PORT;
        //        console.log('VCAP_SERVICES: %s', process.env.VCAP_SERVICES);
        // Also parse Cloudant settings.
        var credentials = env['cloudantNoSQLDB'][0]['credentials'];
        username = credentials.username;
        password = credentials.password;

        // Initialize the library with CloudCo account.
        cloudant = Cloudant({
            account: username,
            password: password
        });
    }
    /*  var username = process.env.cloudant_username;
      var password = process.env.cloudant_password;

      // Initialize the library with CloudCo account.
      var cloudant = Cloudant({
          account: username,
          password: password
      });*/

    cloudant.db.create("insurance", function (err, res) {
        if (err) {
            logger.warn('database already created');
        } else {
            logger.info('database created');
        }
    });

    cloudant.db.list(function (err, allDbs) {
        console.log('All my databases: %s', allDbs)
    });

    //use Insurance DB
    var db = cloudant.db.use("insurance");

    //Create Index
    app.post('/insurance/createindex', function (req, res) {

        var payer_name = {
            name: 'payer-name',
            type: 'json',
            index: {
                fields: ['payer_name']
            }
        }
        db.index(payer_name, function (er, response) {
            if (er) {
                throw er;
            }
            console.log('Index creation result: %s', response.result);
            res.send('Index creation result: %s', response.result);
        });

    });

    //Quering with a query string
    // localhost:6001/insurance/query?payername=John+Appleseed -- pass a payername as query string.
    // localhost: 6001 / insurance / query -- Will pick default user for now.
    app.get("/insurance/query", function (req, res) {
        db.find({
            selector: {
                payer_name: (!req.query.payername) ? 'Tom Murphy' : req.query.payername
            }
        }, function (er, result) {
            if (er) {
                throw er;
            }

            console.log('Found %d documents', result.docs.length);
            for (var i = 0; i < result.docs.length; i++) {
                console.log('  Doc id: %s', result.docs[i]._id);
            }
            var jsonRES = [];
            jsonRES = result.docs;
            res.json(jsonRES);

        });
    });
    
        //-------------------------------------------------------------------
    // CRUD operations
    //-------------------------------------------------------------------

    //Create a doc
    function createDocument(req, res) {
        var db = cloudant.db.use(req.body.db);
        var cloudantResponse = this;
        db.insert(req.body.doc, req.body.docname, function (error, response) {
            if (!error) {
                logger.info("Response" + response.result);
                cloudantResponse.result = JSON.stringify(response);
                return cloudantResponse;
            }

        });

        res.send(cloudantResponse.result);
        res.end();
    }

    //POST call to create a document.
    app.post("/api/createdoc", createDocument);

    //Read a doc
    function readDocument(req, res) {
        var db = cloudant.db.use(req.query.db);
        var cloudantResponse = this;
        db.get(req.query.docname, {
            revs_info: true
        }, function (error, response) {
            if (!error) {
                logger.info("Response" + response.result);
                cloudantResponse.result = JSON.stringify(response);
                return cloudantResponse;
                //res.send(response.result);
            }

        });
        res.send(cloudantResponse.result);
        res.end();
    }

    //GET call to read a document.
    app.get("/api/readdoc", readDocument);

    //update a doc 
    function updateDocument(req, res) {
        var db = cloudant.db.use(req.body.db);
        var cloudantResponse = this;
        db.insert(req.body.doc, req.body.docname, function (error, response) {
            if (!error) {
               logger.info("Response" + response.result);
                cloudantResponse.result = JSON.stringify(response.result);
                return cloudantResponse;
            }

        });
        res.send(cloudantResponse.result);
        res.end();
    }

    //PUT call to update a document.
    app.put("/api/updatedoc", updateDocument);

    //Delete a doc
    function deleteDocument(req, res) {
        var db = cloudant.db.use(req.query.db);
        var cloudantResponse = this;
        db.destroy(req.query.docname, req.query.rev, function (error, response) {
            if (!error) {
                logger.info("Response" + response.result);
                cloudantResponse.result = JSON.stringify(response.result);
                return cloudantResponse;
            }

        });
        res.send(cloudantResponse.result);
        res.end();
    }
    //DELETE call to delete a document.
    app.delete("/api/deletedoc", deleteDocument);

});
