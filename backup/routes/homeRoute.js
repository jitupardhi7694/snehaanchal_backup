const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../helpers/auth-helper');
const { Op } = require('sequelize');

// app Landing page
router.get(['/', '/dashboard'], ensureAuthenticated, async (req, res) => {
  const data = await getDashboardData();
  res.render('dashboard', { data });
});

async function getDashboardData() {
  const Patient = require('../models/patientModel');
  let data = {};
  data.totalPatients = await Patient.count(); //{ where: { id: { [Op.lt]: 6 } } }
  // data.totalProducts = await Product.countDocuments();
  // data.totalOrders = await Order.countDocuments();
  // data.totalSales = await Order.aggregate([
  //   { $group: { _id: null, total: { $sum: '$total' } } },
  //   { $project: { _id: 0, total: 1 } }
  // ]);
  return data;
}

module.exports = router;
