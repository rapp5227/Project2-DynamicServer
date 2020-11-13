// Built-in Node.js modules
let fs = require('fs');
let path = require('path');

// NPM modules
let express = require('express');
let sqlite3 = require('sqlite3');

let public_dir = path.join(__dirname, 'public');
let template_dir = path.join(__dirname, 'templates');
let db_filename = path.join(__dirname, 'db', 'usenergy.sqlite3');

let app = express();
let port = 8000;

// open usenergy.sqlite3 database
let db = new sqlite3.Database(db_filename, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.log('Error opening ' + db_filename);
    }
    else {
        console.log('Now connected to ' + db_filename);
    }
});

app.use(express.static(public_dir)); // serve static files from 'public' directory


// GET request handler for home page '/' (redirect to /year/2018)
app.get('/', (req, res) => {
    res.redirect('/year/2018');
});

// GET request handler for '/year/*'
app.get('/year/:selected_year', (req, res) => {
    console.log(req.params.selected_year);
    fs.readFile(path.join(template_dir, 'year.html'), 'utf-8', (err, template) => {
        // modify `template` and send response
        // this will require a query to the SQL database

        res.status(200).type('html').send(template); // <-- you may need to change this
    });
});

// GET request handler for '/state/*'
app.get('/state/:selected_state', (req, res) => {
    console.log(req.params.selected_state);
    fs.readFile(path.join(template_dir, 'state.html'), 'utf-8', (err, template) => {
        // modify `template` and send response
        // this will require a query to the SQL database

        res.status(200).type('html').send(template); // <-- you may need to change this
    });
});

// GET request handler for '/energy/*'
app.get('/energy/:selected_energy_source', (req, res) => {
    console.log(req.params.selected_energy_source);

    fs.readFile(path.join(template_dir, 'energy.html'), 'utf-8', (err, template) => {
        db.all("select year, state_abbreviation, ? as energy from Consumption".replace('?',req.params.selected_energy_source),
        (err,rows) => {
            if(err) { // return 404 if energy type doesn't exist
                res.status(404).type('text/plain').send('Error: no data found for error type ' + req.params.selected_energy_source + '\n');
            } else {
                rows = rows.sort((a,b) => { // sort rows by year, then state abbreviation
                    if(a.year !== b.year) {
                        return a.year - b.year;
                    } else {
                        return a.state_abbreviation.localeCompare(b.state_abbreviation)
                    }
                });

                let year = rows[0].year;
                let tableContents = "<tr><td class = \"yearColumn\">" + year + "</td>"

                for(x of rows) {
                    if(x.year != year) { // at end of row, increment to next year
                        tableContents += "</tr>\n<tr><td class = \"yearColumn\">" + x.year + "</td>";
                        year = x.year;
                    }
                    tableContents += "<td id = \"" + x.state_abbreviation + "_" + x.year + "\" class = \"valueCell\">" + x.energy + "</td>"
                }

                // update template contents
                sourceCapitalized = req.params.selected_energy_source.charAt(0).toUpperCase()
                    + req.params.selected_energy_source.slice(1);
                sourceCapitalized = (sourceCapitalized=="Natural_gas") ? "Natural Gas" : sourceCapitalized; // removes underscore from natural gas

                template = template.replace('{ENERGY_TYPE}',sourceCapitalized);
                template = template.replace("{TABLE}",tableContents);
                template = template.replace("{IMAGE}",req.params.selected_energy_source+'.jpg')

                res.status(200).type('html').send(template);
            }
        });
    });
});

app.listen(port, () => {
    console.log('Now listening on port ' + port);
});
