const express = require("express");
const quizController = require("./../controllers/quizController");
const authController = require("./../controllers/authController");
const router = express.Router();

//for creating a quiz
router.route('/createQuiz').post(authController.protect, authController.restrictToAdmin, quizController.createQuiz);
router.route('/giveQuiz/:quizID').get(quizController.giveQuiz);
router.route('/submitQuiz/:quizID').post(quizController.submitQuiz);
router.route('/getQuizes/:offset').get(quizController.getAvailableQuizes);
router.route('/getSubmittedQuizes/:offset').get(authController.protect, quizController.getSubmittedQuizes);
router.route('/getCreatedQuizes/:offset').get(authController.protect, authController.restrictToAdmin, quizController.getCreatedQuizes);
router.route('/getSubmittedQuiz/:quizID').get(authController.protect, quizController.getParticularSubmittedQuiz);
router.route('/getCreatedQuiz/:quizID').get(authController.protect, authController.restrictToAdmin, quizController.getParticularCreatedQuiz);

module.exports = router;