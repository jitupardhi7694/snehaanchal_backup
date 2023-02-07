const express = require('express');
const router = express.Router();
const db = require('../helpers/init-mysql');
const { QueryTypes } = require('Sequelize');
const logger = require('../helpers/winston');
const {
    religionValidationRules,
    validate,
} = require('../helpers/validators/masterValidators');
const {
    ensureAuthenticated,
    ensureNotAuthenticated,
} = require('../helpers/auth-helper');
const religionController = require('../controllers/religionController');
const rateLimitter = require('../helpers/rate-limiter');

// limit access to routes in this filename
router.use(rateLimitter);

// Main Page
router.get('/', ensureAuthenticated, async (req, res, next) => {
    await religionController.getReligion(req, res, next);
});

router.post(
    '/',
    ensureAuthenticated,
    religionValidationRules(),
    validate,
    (req, res, next) => {
        religionController.postReligion(req, res, next);
    }
);
// delete

router.get('/:id', async function (request, response, next) {
    var id = request.params.id;

    try {
        const rows = await db.query(
            `DELETE FROM religions WHERE id = "${id}"`,
            {
                // type: QueryTypes.DELETE,
            }
        );
        console.log('rows', rows);
        request.flash('success_msg', 'Data Deleted successfully.');
        return response.redirect('/religion');
    } catch (error) {
        if (error) {
            logger.error("Can't delete religions from database", error);
            return null;
        }
    }
});

module.exports = router;
