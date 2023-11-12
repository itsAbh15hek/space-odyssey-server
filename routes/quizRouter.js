const express = require("express");
const quizController = require("./../controllers/quizController");
const authController = require("./../controllers/authController");
const router = express.Router();

//for creating a quiz
router.route('/createQuiz').post(authController.protect, authController.restrictToAdmin, quizController.createQuiz);
router.route('/giveQuiz/:quizID').get(quizController.giveQuiz);
router.route('/submitQuiz/:quizID').post(quizController.submitQuiz);
router.route('/getQuizes').get(quizController.getAvailableQuizes);
// router.route('/getQuizes').get(authController.protect, quizController.getAvailableQuizes);

module.exports = router;