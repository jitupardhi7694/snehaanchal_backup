const Religion = require('../models/religionModel');
const logger = require('../helpers/winston');
const db = require('../helpers/init-mysql');
const { QueryTypes } = require('Sequelize');
// Religion Add Form Page
const getReligion = async (req, res, next) => {
    const userData = await getReligions();
    res.render('masterPages/religion', { userData });
};

const postReligion = async (req, res, next) => {
    try {
        // console.log("req.body",req.body)
        const { religionName, id } = req.body;
        if (req.body.id != '') {
            const religion = await updateReligion(religionName, id);
            console.log('religion', religion);
            if (religion) {
                req.flash('success_msg', 'Data Updated successfully.');
                return res.redirect('/religion');
            }
        }
        const errors = req.ValidateErrors;
        const userData = await getReligions();
        if (errors.length > 0) {
            // return to form with errors
            return res.render('masterPages/religion', {
                errors,
                religionName,
                userData,
            });
        }
        const religion = await Religion.findOne({
            where: { religion: religionName },
        });
        if (religion) {
            // Already Exists, return back to form
            errors.push({ msg: 'This religion is already saved' });
            return res.render('masterPages/religion', {
                errors,
                religionName,
                userData,
            });
        }
        // validations passed, create record and send flash text
        const newRecord = await Religion.create({ religion: religionName });
        req.flash('success_msg', 'Data Sucessfully saved.');
        return res.redirect('/religion');
    } catch (error) {
        logger.error(error);
        next(error);
    }
};

async function getReligions() {
    try {
        const rows = await db.query(`SELECT * FROM religions`, {
            type: QueryTypes.SELECT,
        });
        // console.log('rows', rows);
        return rows;
    } catch (error) {
        if (error) {
            logger.error("Can't fetch religions from database", error);
            return null;
        }
    }
}

async function updateReligion(religionName, id) {
    try {
        const rows = await db.query(
            `UPDATE religions  SET religion = "${religionName}" WHERE id = "${id}"`,
            {
                //type: QueryTypes.UPDATE,
            }
        );
        console.log('rows', rows);
        return rows;
    } catch (error) {
        if (error) {
            logger.error("Can't fetch religions from database", error);
            return null;
        }
    }
}

module.exports = { getReligion, postReligion };
