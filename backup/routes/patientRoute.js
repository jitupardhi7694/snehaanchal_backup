const express = require('express');
const logger = require('../helpers/winston');
const db = require('../helpers/init-mysql');
const { QueryTypes } = require('Sequelize');
const { clouddebugger } = require('googleapis/build/src/apis/clouddebugger');
const {
    ensureAuthenticated,
    ensureNotAuthenticated,
} = require('../helpers/auth-helper');
const {
    patientValidationRules,
    validate,
} = require('../helpers/validators/patientValidator');
const Patient = require('../models/patientModel');
const router = express.Router();

// Patients Registration Form Page
router.get(['/register', '/'], ensureAuthenticated, async (req, res) => {
    const patientTypes = await getPatientTypes();
    const religions = await getReligions();
    const languages = await getLanguages();
    // console.log(patientTypes);
    res.render('patientPages/registerPatient', {
        patientTypes,
        religions,
        languages,
    });
});

router.post(
    '/register',
    ensureAuthenticated,
    patientValidationRules(),
    validate,
    async (req, res, next) => {
        const user_id = req.user.id;
        const ip_addr =
            req.headers['x-forwarded-for'] ||
            req.remoteAddress ||
            req.socket.remoteAddress ||
            (req.socket ? req.socket.remoteAddress : null);
        const {
            name,
            age,
            gender,
            reg_id,
            reg_date,
            aadhar,
            ref_by,
            pic_filename,
        } = req.body;
        try {
            const { name, email, password, password2 } = req.body;
            const errors = req.ValidateErrors;
            if (errors.length > 0) {
                // return to form with errors
                return res.render('app/patientPages/registerPatient', {
                    errors,
                    name,
                    age,
                    gender,
                    reg_id,
                    reg_date,
                    aadhar,
                    ref_by,
                    pic_filename,
                });
            } else {
                // create new patient
                const newPatient = await Patient.create({
                    name,
                    age,
                    gender,
                    reg_id,
                    reg_date,
                    aadhar,
                    ref_by,
                    pic_filename,
                    user_id,
                    ip_addr,
                });
                req.flash(
                    'success_msg',
                    `Patient ${newPatient.name} is saved.`
                );
                return res.redirect('/dashboard');
            }
        } catch (error) {
            console.log(error);
        }
    }
);

async function getPatientTypes() {
    try {
        const rows = await db.query(`SELECT * FROM patient_type`, {
            type: QueryTypes.SELECT,
        });
        console.log(rows);
        return rows;
    } catch (error) {
        if (error) {
            logger.error("Can't fetch patient_type from database", error);
            return null;
        }
    }
}

async function getReligions() {
    try {
        const rows = await db.query(`SELECT * FROM religions`, {
            type: QueryTypes.SELECT,
        });
        console.log(rows);
        return rows;
    } catch (error) {
        if (error) {
            logger.error("Can't fetch religions from database", error);
            return null;
        }
    }
}
async function getLanguages() {
    try {
        const rows = await db.query(`SELECT * FROM languages`, {
            type: QueryTypes.SELECT,
        });
        return rows;
        console.log(rows);
    } catch (error) {
        if (error) {
            logger.error("Can't fetch languages from database", error);
            return null;
        }
    }
}

async function getNextID(schoolID) {
    try {
        const rows = await db.query(
            `SELECT (MAX(std_admission_no)+1) AS nextID FROM cstdmstxi WHERE std_schoolid='${schoolID}'`,
            {
                type: QueryTypes.SELECT,
            }
        );
        if (rows[0].nextID === null || rows[0].nextID === 0) {
            return 100; // we start from 100 if there are no records
        } else {
            return rows[0].nextID;
        }
    } catch (err) {
        console.log("Error: Can't fetch the new ID for inserting records", err);
        return null;
    }
}

module.exports = router;
