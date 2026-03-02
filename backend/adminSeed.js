require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const connectDB = require('./config/db');

const seedAdmin = async () => {
    try {
        await connectDB();

        const existingAdmin = await Admin.findOne({ adminId: 'admin9032' });
        if (existingAdmin) {
            console.log('Admin already exists. Skipping seeding.');
            process.exit(0);
        }

        const admin = new Admin({
            adminId: 'admin9032',
            password: 'awari@123@9032'
        });

        await admin.save();
        console.log('Admin user seeded successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding admin:', error);
        process.exit(1);
    }
};

seedAdmin();
