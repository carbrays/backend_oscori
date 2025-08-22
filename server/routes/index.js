const express = require('express')
const router = express.Router();
const bcrypt = require('bcryptjs');

router.get('/', function(req, res) {
    res.json({ title: 'Servicios Admision'});
})

module.exports = router;