const dotenv = require('dotenv');
const path = require('path');
const jwt = require('jsonwebtoken');

dotenv.config({ path: path.join(__dirname, '.env') });

const user = {
  id: parseInt(process.argv[2] || '1', 10),
  username: process.argv[3] || 'diagnostic',
  email: process.argv[4] || 'diag@example.com'
};

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET not set in backend/.env');
  process.exit(1);
}

const token = jwt.sign({ id: user.id, username: user.username, email: user.email }, process.env.JWT_SECRET, { expiresIn: '24h' });
console.log(token);
