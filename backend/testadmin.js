require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const connectDB = require('./config/db');
const bcrypt = require('bcrypt');

const testAdmin = async () => {
    try {
        await connectDB();
        const admin = await Admin.findOne({ adminId: 'admin9032' });
        if (admin) {
            console.log('Admin found:', admin.adminId);
            const match = await admin.matchPassword('awari@123@9032');
            console.log('Password match:', match);

            // Generate token just to test
            const jwt = require('jsonwebtoken');
            const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET || 'secretkey', { expiresIn: '30d' });
            console.log('Token generated:', token);
        } else {
            console.log('Admin not found in DB!');
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

testAdmin();
