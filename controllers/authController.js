const catchAsync = require("../util/catchAsync");
const jwt = require("jsonwebtoken"); //token token token babe '>'
const AppError = require("../util/appError");
const {promisify} = require('util');
const sendEmail = require("../util/email");
const crypto = require("crypto");
const bcryptjs = require("bcryptjs");
const QuizList = require("../model/quizListModel");
const User = require("../model/userModel");

const signToken = (id) => {
    return jwt.sign({id: id}, process.env.JWT_SECRET, {expiresIn: process.env.JWT_EXPIRES_IN});
}

const createSendToken = (user, status, res) => {
    const token = signToken(user._id);

    //we gonna set a cookie :3
    const cookieOptions = {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
        httpOnly: true, // secure: true //this shall be uncommented while in production
    }

    res.cookie('jwt', token, cookieOptions);


    //hide password
    user.password = undefined;

    res.status(status).json({
        status: 'success', token, data: {
            user
        }
    });
}

exports.signup = catchAsync(async (req, res, next) => {
    const quizList = await QuizList.create({
        quizes: []
    });

    //not simply using req.body due to security reasons
    const newUser = await User.create({
        username: req.body.username, email: req.body.email, name: req.body.name, password: req.body.password, //chillax! this will be encrypted before save
        passwordConfirm: req.body.passwordConfirm, //this will not be stored in DB
        quizList: quizList._id, active: true, isAdmin: false //one can be admin only by manually changing data in DB
    });

    //_id is the payload we want to put in jwt
    // this token will expire after process.enc.JWT_EXPIRES_IN time, that is 90days in our case
    createSendToken(newUser, 201, res);
});


exports.login = catchAsync(async (req, res, next) => {
    const {username, password} = req.body;

    //check if email and password exists => user entered these fields
    if (!username || !password) {
        return next(new AppError("Please provide email and password", 400));
    }

    //check if user exists and password is correct
    //we have restricted the default selection of password, so we explicitly select password
    const user = await User.findOne({username}).select('+password');
    if (!user || !(await user.correctPassword(password, user.password))) {
        return next(new AppError("Incorrect email or password!", 401));
    }
    //
    //if all ok, send token to client
    createSendToken(user, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
    let token;

    // check if there is a token
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    console.log(token);

    if (!token) {
        return next(new AppError("You are not logged in! Please log in again.", 401));
    }
    // verify the token
    //verify also accepts a callback function, but we will make it return a promise
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // check if user still exists => to check the case if user has jwt token but the user was deleted!
    //todo: hide inactive users from ^find result
    const freshUser = await User.findOne({_id: decoded.id});
    if (!freshUser) {
        return next(new AppError("The user belonging to this token does not exist.", 401));
    }

    // check if user changed password after jwt was issued
    if (freshUser.changePasswordAfter(decoded.iat)) {
        return next(new AppError("User recently changed their password! Please login again.", 401));
    }

    //grant access to the protected rout
    //also add this user to the request object
    req.user = freshUser;
    next();
});

//todo: cure theis method
exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        //roles is an array
        if (!roles.includes(req.user.role)) {
            return next(new AppError('You dont have permission to perform this action!', 403));
        }
        next();
    }
}


exports.forgotPassword = catchAsync(async (req, res, next) => {

    //get user based on posted email
    const user = await User.findOne({email: req.body.email});
    if (!user) {
        return next(new AppError("No user with that email address.", 404));
    }

    //generate token
    const resetToken = user.createPasswordResetToken();
    //validation is false because we are not giving, for example a confirm password
    await user.save({validateBeforeSave: false});


    //send it to user's email
    const resetUrl = `${req.protocol}://${req.get('host')}/users/resetPassword/${resetToken}`;
    const message = `Forgot password? Sumbit a patch request with your new password and passwordConfirm to:
     ${resetUrl}.\nPlease ignore this message if you didn't forgot the password!.`;

    try {
        //we need a key value for email
        await sendEmail({
            email: user.email, subject: "Reset password token. Valid for 10 min only!", message: message
        });

        res.status(200).json({
            status: 'success', message: 'Token sent to email'
        })
    } catch (err) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({validateBeforeSave: false});
        console.log(err);
        return next(new AppError('There was an error sending you email! Please try again later!', 500));
    }


});


//todo: no user is being found even on valid token
exports.resetPassword = catchAsync(async (req, res, next) => {

    //1. get user based on token
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    console.log(hashedToken);

    const user = await User.findOne({passwordResetToken: hashedToken, passwordResetExpires: {$gt: Date.now()}});


    //2. if token is not expired and there is a user then set new password
    if (!user) return next(new AppError('Token is invalid or has expired', 400));
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    //3. updated password changed property of user
    //done in pre('save'.... middleware in userModel

    //4. log the user in, send jwt
    createSendToken(user, 200, res);

});

exports.updateMyPassword = catchAsync(async (req, res, next) => {
    //1. get user from the collection
    //this is only accessable after user login hence req has user
    const user = await User.findById(req.user._id).select('+password');
    console.log("updateMyPassword user");
    console.log(user);

    //2. check if posted password is correct
    //tho there is supposed to be a user '>'
    if (!user || !(await user.correctPassword(req.body.password, user.password))) {
        return next(new AppError("Incorrect email or password!", 401));
    }

    //3. update password
    user.password = req.body.newPassword;
    user.passwordConfirm = req.body.passwordConfirm;
    console.log("updateMyPassword save is to be called next")
    await user.save();
    console.log(user);

    //4. log in using new password
    createSendToken(user, 200, res);

});