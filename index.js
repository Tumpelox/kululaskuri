const express = require("express");
const { google } = require("googleapis");
const session = require('express-session')
var MemoryStore = require('memorystore')(session)

const app = express();

const varmistus = (req, res, next) => {
  if(req.session.isAuth) {
    next()
  } else {
    res.redirect("/kirjaudu");
  }
}

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/views/css'));

app.use(session({
  secret: "volvo on paras auto",
  resave: false,
  saveUninitialized: false,
  store: new MemoryStore({
    checkPeriod: 1000 * 60 * 60 * 24 * 14 // prune expired entries every 24h
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 14
  }
}));

app.get("/", varmistus, (req, res) => {
  res.render("index.ejs");
});

app.get("/kirjaudu", (req, res) => {
  console.log("onnistui")
  res.render('kirjaudu.ejs')
})

app.get("/ulos", (req, res) => {
  req.session.isAuth = false;
  res.redirect("/");
})

app.post("/kirjaudu", (req, res) => {
  var { nimi, salasana } = req.body;
  try {
    if(salasana == "salasana" && nimi== "käyttäjä" ) {
      req.session.isAuth = true;
      res.redirect("/");
    } else {
      res.redirect("/kirjaudu")
    }
  } catch {
    res.status(500).send()
  }
})

app.post("/", async (req, res) => {
  var { tieto, hinta, tyyppi, paivamaara, keskikulutus, kilometrilukema } = req.body;

  const auth = new google.auth.GoogleAuth({
    keyFile: "credentials.json",
    scopes: "https://www.googleapis.com/auth/spreadsheets",
  });

  // Create client instance for auth
  const client = await auth.getClient();

  // Instance of Google Sheets API
  const googleSheets = google.sheets({ version: "v4", auth: client });

  const spreadsheetId = "";

  // Get metadata about spreadsheet
  const metaData = await googleSheets.spreadsheets.get({
    auth,
    spreadsheetId,
  });

  // Read rows from spreadsheet
  const getRows = await googleSheets.spreadsheets.values.get({
    auth,
    spreadsheetId,
    range: `${tyyppi}!A2:A`,
  });

  // Write row(s) to spreadsheet
  await googleSheets.spreadsheets.values.append({
    auth,
    spreadsheetId,
    range: `${tyyppi}!A3:A`,
    valueInputOption: "USER_ENTERED",
    resource: {
      values: [[tieto, hinta, paivamaara]],
    },
  });
  if (keskikulutus) {
    await googleSheets.spreadsheets.values.append({
      auth,
      spreadsheetId,
      range: "Keskikulutus!A5:A",
      valueInputOption: "USER_ENTERED",
      resource: {
        values: [[tieto, kilometrilukema, hinta, paivamaara]],
      }});
  }
  res.redirect("/?tila=tallennettu");
});

app.listen(1337, (req, res) => console.log("Kaynnissa. Portti: 1337"));
