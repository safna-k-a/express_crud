require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const noCache = require("nocache");
const app = express();
const methodOverride = require("method-override");
app.use(methodOverride("_method"));
app.use(express.static("public"));
app.use(express.static("uploads"));
app.use(noCache());
app.use(cookieParser());

const PORT = process.env.PORT || 3000;

//mongoDB Connect
mongoose.connect("mongodb://127.0.0.1:27017/testDB");
const db = mongoose.connection;
db.on("error", (error) => console.log(error));
db.once("open", () => console.log("connected Successfully"));

//middleware

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(
    session({
        secret: "my secret key",
        saveUninitialized: true,
        resave: false,
    })
);
app.use((req, res, next) => {
    res.locals.message = req.session.message;
    res.locals.type = req.session.message ? req.session.message.type : null;
    delete req.session.message;
    next();
});

app.set("view engine", "ejs");

app.use("", require("./routes/routes"));
app.listen(PORT, () => {
    console.log("Server is running");
});

// Setting a cookie
app.get("/set-cookie", (req, res) => {
    res.cookie("userCookie", "cookieValue", { maxAge: 900000, httpOnly: true });
    res.send("Cookie has been set!");
});

// Retrieving a cookie
app.get("/get-cookie", (req, res) => {
    const userCookie = req.cookies.userCookie;
    res.send(`Cookie Value: ${userCookie}`);
});
