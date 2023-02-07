const passport = require('passport');
const User = require('../models/userModel');
const Profile = require('../models/userProfileModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sendActivationLinkEmail = require('../helpers/sendActivationEmail');
const sendResetLinkEmail = require('../helpers/sendResetPasswordEmail');
const logger = require('../helpers/winston');
const db = require('../helpers/init-mysql');
const { QueryTypes } = require('Sequelize');
const getLogin = (req, res, next) => {
    res.render('userPages/login');
};

const postLogin = (req, res, next) => {
    const returnTo = req.session.returnTo; // Retrieve the saved URL from the session and redirect the user back
    delete req.session.returnTo;
    console.log('returning to:', returnTo);

    passport.authenticate('local', {
        successRedirect: returnTo || '/dashboard',
        failureRedirect: `/users/login`,
        failureFlash: true,
    })(req, res, next);
};

const getRegister = async (req, res, next) => {
    const userRoles = await getUserRole();

    res.render('userPages/register', { userRoles });
};

const postRegister = async (req, res, next) => {
    try {
        const { name, email, password, password2, user_roles } = req.body;
        const errors = req.ValidateErrors;
        if (errors.length > 0) {
            // return to form with errors
            return res.render('userPages/register', {
                errors,
                name,
                email,
                password,
                password2,
                user_roles,
            });
        }
        const user = await User.findOne({ where: { email: email } });
        if (user) {
            // User Exists, return back to form
            errors.push({ msg: 'Email is already registered' });
            return res.render('userPages/register', {
                errors,
                name,
                email,
                password,
                password2,
                user_roles,
            });
        }
        // validations passed, create user and send activation email
        const newUser = new User({ name, email, password, user_roles });
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(newUser.password, salt);
        // set password to hashed password and the activation_key
        newUser.password = hash;
        const savedUser = await newUser.save();
        sendActivationLinkEmail(savedUser.email);
        req.flash(
            'success_msg',
            'Please check your email and activate the account.'
        );
        return res.redirect('/users/login');
    } catch (error) {
        logger.error(error);
        next(error);
    }
}; // end of postRegisterController

const getForgotPassword = async (req, res, next) => {
    try {
        const token = req.params.token;
        const user = await User.findOne({ where: { reset_key: token } });
        if (!user) {
            req.flash('error_msg', `Invalid token.`);
            return res.redirect('/users/sendResetLink');
        }
        return res.render('userPages/forgotPassword');
    } catch (error) {
        logger.error(error);
        next(error);
    }
}; // end forgotPassword function

const postForgotPassword = async (req, res, next) => {
    try {
        const { token } = req.params;
        // process further, token issued by us...
        const { password } = req.body;
        const errors = req.ValidateErrors;
        if (errors.length > 0) {
            // return to form with errors
            return res.render(`userPages/forgotPassword`, { errors });
        }
        const decoded = await jwt.verify(token, process.env.JWT_RESET_KEY);
        const user = await User.findOne({
            where: { id: decoded.id, email: decoded.email, reset_key: token },
        });
        if (!user) {
            req.flash('error_msg', `Invalid User or expired link.`);
            return res.redirect('/users/sendResetLink');
        }
        // User found with id, email and token
        user.reset_key = ''; // so that same link cannot be used twice...
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        user.password = hash;
        const savedUser = await user.save(); //update user as active and no activation_key
        req.flash(
            'success_msg',
            `Password for <i>${decoded.email}</i> has been updated, you can login now.`
        );
        return res.redirect('/users/login');
    } catch (error) {
        // handle jwt errors
        if (error.name === 'TokenExpiredError') {
            req.flash('error_msg', `Link is expired, please regenerate`);
            return res.redirect('/users/sendResetLink');
        } else if (error.name === 'JsonWebTokenError') {
            req.flash('error_msg', `Link is invalid, please regenerate`);
            return res.redirect('/users/sendResetLink');
        } else {
            logger.error(error);
            next(error);
        }
    }
}; // end of postForgotPassword function

const getResetLink = (req, res, next) => {
    return res.render('userPages/resetPassword');
}; // end of getResetLink function

const postResetLink = async (req, res, next) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ where: { email } });
        if (!user) {
            req.flash(
                'error_msg',
                `<i>${email}</i> is not registered. Please try again or register first.`
            );
            return res.redirect('/users/sendResetLink');
        }
        // User found with email send activation link email
        sendResetLinkEmail(user.email);
        req.flash(
            'success_msg',
            `An email with link to reset password is sent on <i>${user.email}</i>. Please reset your password.`
        );
        return res.redirect('/users/login');
    } catch (error) {
        logger.error(error);
        next(error);
    }
}; // end of postResetLink function

const getActivationLink = (req, res, next) => {
    return res.render('userPages/resendActivation');
}; // end of getActivationLink function

const postActivationLink = async (req, res, next) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ where: { email } });
        if (!user) {
            req.flash(
                'error_msg',
                `<i>${email}</i> is not registered. Please try again or register first.`
            );
            return res.redirect('/users/sendActivationLink');
        }
        // User found with email send activation link email
        sendActivationLinkEmail(user.email);
        req.flash(
            'success_msg',
            `An email with activation link is send on <i>${user.email}</i>. Please activate your account.`
        );
        return res.redirect('/users/login');
    } catch (error) {
        logger.error(error);
        next(error);
    }
}; // end of postActivationLink function

const getActivateLinkHandler = async (req, res, next) => {
    try {
        const token = req.params.token;
        // check if token is expired

        const decoded = await jwt.verify(token, process.env.JWT_ACTIVE_KEY);
        const user = await User.findOne({
            where: {
                id: decoded.id,
                email: decoded.email,
                activation_key: token,
            },
        });
        if (!user) {
            req.flash('error_msg', `Invalid user or link`);
            return res.redirect('/users/sendActivationLink');
        }
        // User found with id, email and token
        user.activation_key = ''; // so that same link cannot be used twice...
        user.active = true;
        const savedUser = await user.save(); //update user as active and no activation_key
        req.flash(
            'success_msg',
            `${decoded.email} has been activated, you can login now.`
        );
        return res.redirect('/users/login');
    } catch (error) {
        // handle jwt errors
        if (error.name === 'TokenExpiredError') {
            req.flash('error_msg', `Link is expired, please regenerate`);
            return res.redirect('/users/sendActivationLink');
        } else if (error.name === 'JsonWebTokenError') {
            req.flash('error_msg', `Link is invalid, please regenerate`);
            return res.redirect('/users/sendActivationLink');
        } else {
            logger.error(error);
            next(error);
        }
    }
}; // end of getActivationLinkHandler function

const getProfile = async (req, res, next) => {
    // if profile is already there in db, fetch it and pass on to fill the form...
    try {
        const userProfile = await Profile.findOne({
            where: { user_id: req.user.id },
        });
        // console.log(userProfile, req.user.id);
        let { address, city, state, pincode, phone } = userProfile || {}; //blank if userProfile is not found in db.
        return res.render('userPages/userProfile', {
            address,
            city,
            state,
            pincode,
            phone,
        });
    } catch (error) {
        logger.error(error);
        next(error);
    }
}; // end of getProfile function

const postProfile = async (req, res, next) => {
    try {
        let savedUser;
        const { address, city, state, pincode, phone } = req.body;
        const userProfile = await Profile.findOne({
            where: { user_id: req.user.id },
        });
        if (userProfile) {
            // profile already in DB, update it
            savedUser = await userProfile.update({
                address,
                city,
                state,
                pincode,
                phone,
            });
        } else {
            // profile is not found, create new and save
            const newProfile = new Profile({
                user_id: req.user.id,
                address,
                city,
                state,
                pincode,
                phone,
            });
            savedUser = await newProfile.save();
        }
        req.flash('success_msg', 'Profile saved successfully.');
        return res.redirect('/users/profile');
    } catch (error) {
        logger.error(error);
        next(error);
    }
}; // end of postProfile function

const getLogout = async (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        req.flash('success_msg', 'You are logged out');
        res.redirect(`/users/login`);
        req.session.destroy();
    });
}; // end of getLogout function

async function getUserRole() {
    try {
        const rows = await db.query(`SELECT * FROM user_roles;`, {
            type: QueryTypes.SELECT,
        });
        console.log(rows);
        return rows;
    } catch (error) {
        if (error) {
            logger.error("Can't fetch user_roles from database", error);
            return null;
        }
    }
}

module.exports = {
    getLogin,
    postLogin,
    getRegister,
    postRegister,
    getForgotPassword,
    postForgotPassword,
    getResetLink,
    postResetLink,
    getActivationLink,
    postActivationLink,
    getActivateLinkHandler,
    getProfile,
    postProfile,
    getLogout,
};
