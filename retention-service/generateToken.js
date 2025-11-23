import jwt from 'jsonwebtoken';

const token = jwt.sign(
  { user_id: 123, email: 'test@test.com' },
  'your_jwt_secret_key_here',
  { expiresIn: '7d' }
);

console.log('Your token:');
console.log(token);