const express = require('express');
const router = express.Router();
const dataController = require('../controllers/authController');

router.get('/', dataController.searchBySHKForAuth);


module.exports = router;
