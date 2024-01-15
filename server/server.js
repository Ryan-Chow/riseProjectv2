const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const bodyParser = require('body-parser'); // Middleware for parsing request bodies
const fs = require('fs');
const { Client } = require('pg');
const path = require('path');
const ejs = require('ejs');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');


// Create Express Application
const app = express();

// ----- DATES AND TIMESTAMPS ----- //

const currentDate = new Date();
const formattedDate = currentDate.toISOString().split('T')[0];

// ----- POSTGRES CLIENT CONNECTION ----- //
const client = new Client({
    user: 'rchow',
    host: 'localhost',
    database: 'rchow',
    port: 5432
});

client.connect()
    .then(() => console.log("Connected to DB."))
    .catch((e) => console.log(`Error while connecting to DB: ${e}`))

// Allow routers to query Postgres
// app.locals.db = client;

// ----- SESSION DATA (FOR USER ACCOUNTS) ----- //
const fileStore = new FileStore()

app.use(session({
    store: fileStore,
    secret: "foo",
    resave: false,
    saveUninitialized: false,
}));

// ----- BODY PARSER FOR POST REQUESTS AND EJS FOR DYNAMIC HTML FILES ----- //
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'ejs')

app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: false }));

// ----- MIDDlEWARE FUNCTIONS AND MORE ----- //



// So all the CSS actually opens per file.
app.use(express.static(path.join(__dirname, '../')));
app.use(express.json());

// ----- ROUTER PATHS ----- //




// ----- HOME PAGE ----- //

app.get('/', async (req, res) => {
    if (!req.session.user) {
        var homePath = "/Users/rchow/riseProjectv2/home.html";
        res.sendFile(homePath);
    } else {
        const leaguesData = await client.query(`SELECT (leaguename, leagueid) FROM leagues WHERE username = '${req.session.user}'`)
        const leagues = leaguesData.rows.map(row => {
            const [league_name, league_id] = row.row.slice(1, -1).split(',');
            return { league_name: league_name.trim(), league_id: league_id.trim() };
        });
        console.log(leagues);

        res.render('dashboard', { username: req.session.user, leagues: leagues });
    }
});

// ----- LOGIN REQUESTS ----- //

app.all('/login', async (req, res) => {
    if (req.method === "GET") {
        if (!req.session.user) {
            var loginPath = "/Users/rchow/riseProjectv2/login.html";
            res.sendFile(loginPath)
        } else {
            res.redirect('/')
        }
    } else if (req.method === "POST") {
        try {
            const { username, password } = req.body;
            // Check if the information exists in the database
            const result = await client.query(`SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`);

            if (result.rows.length > 0) {
                req.session.user = username;
                res.redirect('/')
            } else {
                return res.status(409).json({ error: 'Username or email is already taken.' })
            }
        } catch (error) {
            console.error('Error', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

// ----- FILTER REQUEST ----- //

app.all('/filters', async (req, res) => {
    if (!req.session.user) {
        res.redirect('/login')
    }
    if (req.method === "GET") {
        res.sendFile("/Users/rchow/riseProjectv2/filters.html");
    } else if (req.method === "POST") {
        const currentUser = req.session.user;
        const filtersData = req.body.filters

        userAlreadyHasFilters = await client.query(`SELECT * FROM filters WHERE username = '${currentUser}'`)

        if (userAlreadyHasFilters.rows.length > 0) {
            var sqlQuery = `UPDATE filters
                              SET skill = $2, cause = $3, virtual = $4
                              WHERE username = $1`
        } else {
            var sqlQuery = `
            INSERT INTO filters (username, skill, cause, virtual)
            VALUES ($1, $2, $3, $4)
            `;
        }

        // Extract values from filtersData
        const { causes, virtual, skills } = filtersData;

        // The array elements must be passed as separate parameters to the query
        const values = [
        currentUser,  // Replace with the actual username
        skills,           // skills is already an array, so no need for extra processing
        causes,           // causes is already an array, so no need for extra processing
        virtual,
        ];

        // Execute the query using client.query
        client.query(sqlQuery, values, (err, result) => {
            if (err) {
                console.error('Error inserting data:', err);
                res.status(500).json({ error: 'Internal Server Error' });
            } else {
                console.log('Data inserted successfully');
                res.status(200).json({ message: 'Data inserted successfully' });
            }
        });
    };
});

// ----- SIGNUP REQUESTS ----- //

app.all('/signup', async (req, res) => {
    if (req.method === "GET") {
        if (!req.session.user) {
            var signupPath = "/Users/rchow/riseProjectv2/signup.html";
            res.sendFile(signupPath)
        } else {
            res.redirect('/')
        }
    } else if (req.method === "POST") {
        try {
            const { username, email, password } = req.body;
    
            // Check if the username already exists in the database
            const result = await client.query(`SELECT * FROM users WHERE username = '${username}' OR email = '${email}'`);
            if (result.rows.length > 0) {
                // Username conflict (already taken)
                return res.status(409).json({ error: 'Username or email is already taken.' });
            } else {
                // Add data back into the users table
                await client.query(`INSERT INTO users(username, email, password, datecreated) VALUES ('${username}', '${email}', '${password}', '${formattedDate}')`);

                // Automatically log in.
                req.session.user = username;
                res.redirect('/')
            }
        } catch (error) {
            console.error('Error: ', error);
            res.status(500).json({ error: 'Internal server error.' })
        }
    }
});

// ----- INFO PAGES ----- //
app.get('/mission', (req, res) => {
    res.sendFile('/Users/rchow/riseProjectv2/mission.html');
});


app.all('/joinLeague', (req, res) => {
    const username = req.session.user;

    if (!username) {
        res.redirect('/');
        return;
    } else {
        res.render('joinLeague', { username: username });
    }
});

// ----- PROFILE AND DASHBOARD ----- //

app.get('/profile/:username', (req, res) => {
    const requestedUsername = req.params.username;

    if (requestedUsername === req.session.user) {
        res.render('profile', { username: requestedUsername, personalTrue: 'block' })
    } else {
        res.render('profile', { username: requestedUsername, personalTrue: 'hidden' })
    }
});






// ----- LEAGUES ----- //

app.all('/createLeague', async (req, res) => {
    if (!req.session.user) {
        res.redirect('/login')
    } else {
        if (req.method === 'GET') {
            res.sendFile('/Users/rchow/riseProjectv2/createLeague.html')
        } else if (req.method === 'POST') {
            try {
                const { league_name } = req.body;
                const username = req.session.user;

                const leagueID = uuidv4();
                const activityID = uuidv4();

                const formattedTimestamp = currentDate.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });

                await client.query(`INSERT INTO leagues(leaguename, leagueid, username, permission) VALUES ('${league_name}', '${leagueID}', '${username}', 'owner')`)
                await client.query(`INSERT INTO activity(leagueid, activity, activityid, time, type, status, username) VALUES ('${leagueID}', '${username} created League ${league_name}.', '${activityID}', '${formattedTimestamp}', 'create', 'approved', '${username}')`)
                await client.query(`INSERT INTO game(leagueid, username, currency, multiplier, level) VALUES ('${leagueID}', '${username}', 0, 1, 1)`)
                res.json({ leagueID: leagueID })
            } catch (error) {
                console.error('Error', error);
                res.status(500).json({ error: 'Internal server error.' })
            }
        }
    }
});

app.get('/league/:leagueID', async (req, res) => {
    const requestedLeagueID = req.params.leagueID;
    const currentUser = req.session.user

    // - Verify Authority - //
    const memberPermission = await client.query(`SELECT (leaguename, username, permission) FROM leagues WHERE leagueid = '${requestedLeagueID}' AND username = '${currentUser}'`)

    if (memberPermission.rows.length > 0) {
        // Treat the result, should be one single row.
        const rows = memberPermission.rows;
        const rowString = rows[0].row;
        const values = rowString.slice(1, -1).split(',');
        
        var leaguename = values[0];
        var username = values[1];
        var permission = values[2];

        // Check if req.session.user matches any username
        var userMatch = (username == currentUser);
        var ownerTrue = (permission == 'owner');

    } else {
        res.status(403).send('Access forbidden');
    }

    if (userMatch) {

        // --- DEALING WITH ACTIVITY --- //
        const activity = await client.query(`SELECT (activity, time) FROM activity WHERE leagueid = '${requestedLeagueID}'`)

        // Parse each row into an object
        const parsedActivities = activity.rows.map(entry => {
            const [activity, timestamp] = entry.row.slice(2, -2).split('","'); // Extracting activity and timestamp
        
            // Convert timestamp to MM/DD/YYYY, HH:mm:ss format with timezone
            const formattedTimestamp = moment(timestamp).format('MM/DD/YYYY, HH:mm:ss');
        
            return { activity, formattedTimestamp };
        });

        // Sort activities by timestamp in ascending order
        const sortedActivities = parsedActivities.sort((a, b) => new Date(b.formattedTimestamp) - new Date(a.formattedTimestamp));

        // Get the first 5 activities
        const first5Activities = sortedActivities.slice(0, 5);

        // --- DEALING WITH CURRENT TASK --- //

        const currentTask = await client.query(`SELECT * FROM activeTask WHERE leagueid = '${requestedLeagueID}' AND username = '${currentUser}'`)

        if (currentTask.rows.length > 0) {
            var task = currentTask.rows
        } else {
            var task = [
                {
                    leagueid: requestedLeagueID,
                    username: currentUser,
                    title: '',
                    description: '',
                    link: '',
                }
            ];
        }


        if (ownerTrue) {
                // User is an owner, return something specific for owners
                res.render('leagueHome', {
                    username: currentUser,
                    owner: 'yes',
                    leagueID: requestedLeagueID,
                    league_name: leaguename, // TODO DOESNT WORK
                    activity: first5Activities,
                    task: task,
                });
        } else {
                // User is a member, proceed to show the file
                res.render('leagueHome', {
                    username: currentUser,
                    owner: 'no',
                    leagueID: requestedLeagueID,
                    league_name: leaguename, // TODO DOESNT WORK
                    activity: first5Activities, 
                    task: task,
                });
        }
    }
});

app.post('/league/:leagueID', async (req, res) => {
    const currentUser = req.session.user;
    const { title } = req.body
    const requestedLeagueID = req.params.leagueID;

    console.log(title)

    const newActivityID = uuidv4();
    const formattedTimestamp = currentDate.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });

    await client.query(`INSERT INTO activity(leagueid, activity, activityid, time, type, status, username) VALUES ('${requestedLeagueID}', '${currentUser} marked >| ${title} |< as complete.', '${newActivityID}', '${formattedTimestamp}', 'task', 'pending', '${currentUser}')`)

    // Begin the transaction
    await client.query('BEGIN');

    // Move the row from activeTask to taskArchive and get the deleted row
    await client.query(`
      WITH deleted_row AS (
        DELETE FROM activeTask
        WHERE leagueID = '${requestedLeagueID}' AND username = '${currentUser}'
        RETURNING *
      )
      INSERT INTO taskArchive (leagueID, username, title, description, link)
      SELECT leagueID, username, title, description, link
      FROM deleted_row
      RETURNING *;
    `);

    // Commit the transaction
    await client.query('COMMIT');
    
    res.redirect(`/league/${requestedLeagueID}`);
});








app.get('/league/discover/:leagueID', async (req, res) => {
    const requestedLeagueID = req.params.leagueID;
    const currentUser = req.session.user;

     // - Verify Authority - //
     const memberPermission = await client.query(`SELECT (leaguename, username, permission) FROM leagues WHERE leagueid = '${requestedLeagueID}' AND username = '${currentUser}'`)

    if (memberPermission.rows.length > 0) {
        // Treat the result, should be one single row.
        const rows = memberPermission.rows;
        const rowString = rows[0].row;
        const values = rowString.slice(1, -1).split(',');
        
        var leaguename = values[0];
        var username = values[1];
        var permission = values[2];

        // Check if req.session.user matches any username
        var userMatch = (username == currentUser);
        var ownerTrue = (permission == 'owner');

    } else {
        res.status(403).send('Access forbidden');
    }

    if (userMatch) {

        // Get Opportunity Cards, given the filters
        const selectedFilters = await client.query(`SELECT (skill, cause, virtual) FROM filters WHERE username = '${currentUser}'`)

        const extractedRow = selectedFilters.rows[0].row;

        function parseCurlyBrackets(input) {
            let result = [];
            let currentContent = '';
            let insideCurlyBrackets = false;
            let skillscausepass = 0
        
            for (const char of input) {
                if (skillscausepass === 2) {
                    if (char === 't' || char === 'f') {
                        currentContent += char
                    }
                } else if (char === '{' || char === '}') {
                } else if (insideCurlyBrackets === true) {
                    currentContent += char
                } else if (insideCurlyBrackets === false && skillscausepass !== 2) {
                    currentContent = ''
                }

                if (char === '{') {
                    insideCurlyBrackets = true;
                } else if(char === '}') {
                    insideCurlyBrackets = false;
                    skillscausepass += 1
                    result.push(currentContent)
                    currentContent = ''
                }
            }

            result.push(currentContent)
        
            return result;
        }

        const splitExtractedRow = parseCurlyBrackets(extractedRow)

        const [skillsStr, causesStr, virtualStr] = splitExtractedRow;

        if (skillsStr.length === 0 && causesStr.length === 0) {
            var result = await client.query(`SELECT * FROM opp.opps WHERE opps.virtual = '${virtualStr}' ORDER BY random() LIMIT 10`);
        } else if (skillsStr.length === 0) {
            var causes = "('" + causesStr.replace(/,/g, "','") + "')";
            var result = await client.query(`SELECT * FROM opp.opps WHERE opps.cause in ${causes} AND opps.virtual = '${virtualStr}'`);
        } else if (causesStr.length === 0) {
            var skills = "('" + skillsStr.replace(/,/g, "','") + "')";
            var result = await client.query(`SELECT * FROM opp.opps WHERE opps.skills in ${skills} AND opps.virtual = '${virtualStr}' ORDER BY random() LIMIT 10`);
        } else {
            var causes = "('" + causesStr.replace(/,/g, "','") + "')";
            var skills = "('" + skillsStr.replace(/,/g, "','") + "')";
            var result = await client.query(`SELECT * FROM opp.opps WHERE opps.skills in ${skills} AND opps.cause in ${causes} AND opps.virtual = '${virtualStr}' ORDER BY random() LIMIT 10`);
        }

        result = result.rows
        
        if (ownerTrue) {
            res.render('findOpportunities', {
                username: currentUser,
                owner: 'yes',
                leagueID: requestedLeagueID,
                league_name: leaguename, // TODO FIX
                opportunities: result
            });
        } else {
            res.render('findOpportunities', {
                username: currentUser,
                owner: 'yes',
                leagueID: requestedLeagueID,
                league_name: leaguename, // TODO FIX
                opportunities: result
            })
        }
    }
});

app.post('/league/discover/:leagueID', async (req, res) => {
    const requestedLeagueID = req.params.leagueID;
    const currentUser = req.session.user;
    const { title, description, link } = req.body;

    const doesUserExist = await client.query(`SELECT * FROM activeTask WHERE username = '${currentUser}' AND leagueID = '${requestedLeagueID}'`)

    if (doesUserExist.rows.length === 0) {
        await client.query(
            'INSERT INTO activeTask (leagueID, username, title, description, link) VALUES ($1, $2, $3, $4, $5)',
            [requestedLeagueID, currentUser, title, description, link]
        );
    } else {
        await client.query(
            'UPDATE activeTask SET title = $1, description = $2, link = $3 WHERE username = $4 AND leagueID = $5',
            [title, description, link, currentUser, requestedLeagueID]
        );        
    }
});

app.get('/league/game/:leagueID', async (req, res) => {
    const requestedLeagueID = req.params.leagueID;
    const currentUser = req.session.user;

    if (!currentUser) {
        res.redirect('/login');
    } else {
        const leaderboard = await client.query(`SELECT * FROM game WHERE leagueid = '${requestedLeagueID}' ORDER BY level DESC`);

        res.render('leaderboard', {
            leagueID: requestedLeagueID,
            username: currentUser,
            leaderboard: leaderboard
        });
    }
});

app.post('/league/game/:leagueID', async (req, res) => {
    const requestedLeagueID = req.params.leagueID;
    const currentUser = req.session.user;
    const { buttonId, price } = req.body;
    console.log(price)

    const isUserRich = await client.query(`SELECT currency FROM game WHERE username = '${currentUser}' AND leagueid = '${requestedLeagueID}'`)

    if (isUserRich.rows[0].currency >= price) {
        if (buttonId.length === 3) {
                var multiplier = parseFloat(buttonId)
                await client.query(`UPDATE game SET currency = currency - ${price} WHERE username = '${currentUser}' AND leagueid = '${requestedLeagueID}'`)
                await client.query(`UPDATE game SET multiplier = multiplier + ${multiplier} WHERE username = '${currentUser}' AND leagueid = '${requestedLeagueID}'`)
            } else {
                await client.query(`UPDATE game SET currency = currency - ${price} WHERE username = '${currentUser}' AND leagueid = '${requestedLeagueID}'`)
                await client.query(`UPDATE game SET level = level + 1 WHERE username = '${currentUser}' AND leagueid = '${requestedLeagueID}'`)
            }
        res.json({ success: true });
    } else {
        res.status(400).json({ error: 'Insufficient funds' });
    }

    
});


app.get('/league/members/:leagueID', async (req, res) => {
    const requestedLeagueID = req.params.leagueID;
    const currentUser = req.session.user;

    // - Verify Authority - //
    const memberPermission = await client.query(`SELECT (leaguename, username, permission) FROM leagues WHERE leagueid = '${requestedLeagueID}' AND username = '${currentUser}'`);

    if (memberPermission.rows.length > 0) {
        // Treat the result, should be one single row.
        const rows = memberPermission.rows;
        const rowString = rows[0].row;
        const values = rowString.slice(1, -1).split(',');

        var leaguename = values[0];
        var username = values[1];
        var permission = values[2];

        // Check if req.session.user matches any username
        var userMatch = (username == currentUser);
        var ownerTrue = (permission == 'owner');

    } else {
        res.status(403).send('Access forbidden');
    }

    
    if (userMatch) {

        // Get list of members in the league
        const members = await client.query(`SELECT (username, permission) FROM leagues WHERE leagueid = '${requestedLeagueID}'`);

        const membersArray = members.rows.map(entry => {
            // Extract values from the row and remove unnecessary characters
            const [username, role] = entry.row.replace(/[()]/g, '').split(',');
          
            // Create a dictionary with the extracted values
            return { username, role };
          });

        console.log(membersArray)

        if (ownerTrue) {
            res.render('leagueMembers', {
                username: currentUser,
                owner: 'yes',
                leagueID: requestedLeagueID,
                league_name: leaguename,
                members: membersArray,
            });
        } else {
            res.render('leagueMembers', {
                username: currentUser,
                owner: 'no',
                leagueID: requestedLeagueID,
                league_name: leaguename,
                members: membersArray,
            })
        }
    }
});

app.get('/league/activity/:leagueID', async (req, res) => {
    const requestedLeagueID = req.params.leagueID;
    const currentUser = req.session.user

    // - Verify Authority - //
    const memberPermission = await client.query(`SELECT (leaguename, username, permission) FROM leagues WHERE leagueid = '${requestedLeagueID}' AND username = '${currentUser}'`)

    if (memberPermission.rows.length > 0) {
        // Treat the result, should be one single row.
        const rows = memberPermission.rows;
        const rowString = rows[0].row;
        const values = rowString.slice(1, -1).split(',');
        
        var leaguename = values[0];
        var username = values[1];
        var permission = values[2];

        // Check if req.session.user matches any username
        var userMatch = (username == currentUser);
        var ownerTrue = (permission == 'owner');

    } else {
        res.status(403).send('Access forbidden');
    }

    if (userMatch) {

        // --- DEALING WITH ACTIVITY --- //
        const activity = await client.query(`SELECT (activity, time) FROM activity WHERE leagueid = '${requestedLeagueID}'`)
        console.log(activity)

        // Parse each row into an object
        const parsedActivities = activity.rows.map(entry => {
            const [activity, timestamp] = entry.row.slice(2, -2).split('","'); // Extracting activity and timestamp
        
            // Convert timestamp to MM/DD/YYYY, HH:mm:ss format with timezone
            const formattedTimestamp = moment(timestamp).format('MM/DD/YYYY, HH:mm:ss');
        
            return { activity, formattedTimestamp };
        });

        // Sort activities by timestamp in ascending order
        const sortedActivities = parsedActivities.sort((a, b) => new Date(b.formattedTimestamp) - new Date(a.formattedTimestamp));


        if (ownerTrue) {
                // User is an owner, return something specific for owners
                res.render('leagueActivity', {
                    username: currentUser,
                    owner: 'yes',
                    leagueID: requestedLeagueID,
                    league_name: leaguename, // TODO DOESNT WORK
                    activity: sortedActivities,
                });
        } else {
                // User is a member, proceed to show the file
                res.render('leagueActivity', {
                    username: currentUser,
                    owner: 'no',
                    leagueID: requestedLeagueID,
                    league_name: leaguename, // TODO DOESNT WORK
                    activity: sortedActivities, 
                });
        }
    }
});

app.all('/league/ownerdashboard/:leagueID', async (req, res) => {
    const currentUser = req.session.user;
    const requestedLeagueID = req.params.leagueID;

    // - Verify Authority - //
    const memberPermission = await client.query(`SELECT (leaguename, username, permission) FROM leagues WHERE leagueid = '${requestedLeagueID}' AND username = '${currentUser}'`)

    if (memberPermission.rows.length > 0) {
        // Treat the result, should be one single row.
        const rows = memberPermission.rows;
        const rowString = rows[0].row;
        const values = rowString.slice(1, -1).split(',');
        
        var leaguename = values[0];
        var username = values[1];
        var permission = values[2];

        // Check if req.session.user matches any username
        var ownerTrue = (permission == 'owner');

    } else {
        res.status(403).send('Access forbidden');
    }

    if (ownerTrue) {
        if (req.method === 'GET') {
            // --- DEALING WITH ACTIVITY --- //
            const activity = await client.query(`SELECT (activity, activityID, time, status, type) FROM activity WHERE leagueid = '${requestedLeagueID}'`)

            // Parse each row into an object
            const parsedActivities = activity.rows.map(entry => {
                const [activity, activityID, timestamp, status, type] = entry.row.slice(2, -2).split(',').map(field => field.replace(/['"]/g, '')); // Extracting fields and removing quotes
                
                // Convert timestamp to MM/DD/YYYY, HH:mm:ss format with timezone
                const formattedTimestamp = moment(timestamp).format('MM/DD/YYYY, HH:mm:ss');
                
                return { activity, activityID, formattedTimestamp, status, type };
            });

            // Sort activities by timestamp in ascending order
            const sortedActivities = parsedActivities.sort((a, b) => new Date(b.formattedTimestamp) - new Date(a.formattedTimestamp));

            console.log(sortedActivities)
            res.render('approveActivity', {
                username: username,
                league_name: leaguename,
                leagueID: requestedLeagueID,
                activity: sortedActivities,
                activityID: sortedActivities.activityID,
            });
        } else if (req.method === 'POST') {
            const { activityID, action, activity } = req.body;
            const activityUser = activity.split(' ')[0];
            const requestedLeagueID = req.params.leagueID;
            const currentUser = req.session.user

            console.log(action)

            await client.query(`UPDATE activity SET status = '${action}' WHERE activityID = '${activityID}'`)

            const newActivityID = uuidv4();
            const formattedTimestamp = currentDate.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });

            await client.query(`INSERT INTO activity(leagueid, activity, activityid, time, type, status, username) VALUES ('${requestedLeagueID}', '${username} ${action} an action by ${activityUser}.', '${newActivityID}', '${formattedTimestamp}', 'vote', 'approved', '${currentUser}')`)
            
            if (action === 'approved') {
                await client.query(`UPDATE game SET currency = currency + 500 WHERE username = '${currentUser}' AND leagueid = '${requestedLeagueID}'`)
            }
            res.sendStatus(200);
        }
    }
});

























// Run the server on Port 3000
app.listen(3000, () => {
    console.log(`Server running on localhost:3000`);
  });
