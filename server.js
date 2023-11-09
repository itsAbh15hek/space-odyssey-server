// things related to server are here '>'
const path = require("path");
const dotenv = require("dotenv");
dotenv.config({path: path.join(__dirname, 'config.env')});


//defined in the beginning to catch uncaught exceptions asap
process.on('uncaughtException', err=>{
    console.log('Uncaught Exception 💥 Shutting down!...');
    console.log(err.name);
    console.log(err.message);
    process.exit(1);
});

const mongoose = require('mongoose');
// const DB = process.env.DATABASE.replace('<password>', process.env.DATABASE_PASSWORD);
const DB = process.env.DATABASE_LOCALE;
mongoose.connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: true,
    useUnifiedTopology: true
}).then((con) => {
    console.log("Connected to database!");
});

const app = require("./app");

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`App running on port ${port}`);
});


process.on('unhandledRejection', err => {
    console.log('Unhandled Rejection 💥 Shutting down!...');
    console.log(err.name);
    console.log(err.message);
    process.exit(1);
});



