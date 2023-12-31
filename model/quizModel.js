const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({

    topic: {
        type: String, required: [true, "A quiz must have a topic"]
    }, questions: [{
        type: mongoose.Schema.ObjectId,
        ref: 'Question'
    }]
});


const Quiz = mongoose.model('Quiz', quizSchema);
module.exports = Quiz;