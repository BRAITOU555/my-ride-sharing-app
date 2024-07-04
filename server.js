require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const Joi = require('joi');
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const app = express();
const port = process.env.PORT || 3000;

const SECRET_KEY = process.env.SECRET_KEY;

app.use(express.json());

// Connecter à la base de données SQLite
const db = new sqlite3.Database(':memory:');

db.serialize(() => {
  // Créer les tables
  db.run("CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT, password TEXT)");
  db.run("CREATE TABLE rides (id INTEGER PRIMARY KEY AUTOINCREMENT, driver_id INTEGER, passenger_id INTEGER, start_location TEXT, end_location TEXT, status TEXT, fare REAL)");
  db.run("CREATE TABLE reviews (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, ride_id INTEGER, rating INTEGER, comment TEXT)");
  db.run("CREATE TABLE driver_locations (id INTEGER PRIMARY KEY AUTOINCREMENT, driver_id INTEGER, latitude REAL, longitude REAL)");
});

// Schémas de validation Joi
const userSchema = Joi.object({
  name: Joi.string().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

const updateProfileSchema = Joi.object({
  name: Joi.string().min(3).max(30).optional(),
  email: Joi.string().email().optional(),
  password: Joi.string().min(6).optional()
});

// Middleware d'authentification
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) {
    return res.status(401).json({ error: 'Token not found' });
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token is not valid' });
    }
    req.user = user;
    next();
  });
};

// Route pour l'inscription
app.post('/register', async (req, res) => {
  const { error } = userSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { name, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  db.run('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hashedPassword], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ id: this.lastID });
  });
});

// Route pour la connexion
app.post('/login', (req, res) => {
  const { error } = loginSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { email, password } = req.body;
  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    const match = await bcrypt.compare(password, row.password);
    if (!match) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: row.id, email: row.email }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ token });
  });
});

// Route pour mettre à jour le profil utilisateur
app.put('/profile', authenticateToken, async (req, res) => {
  const { error } = updateProfileSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { name, email, password } = req.body;
  const userId = req.user.id;

  const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;

  db.run('UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email), password = COALESCE(?, password) WHERE id = ?', [name, email, hashedPassword, userId], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Profile updated successfully' });
  });
});

// Route pour mettre à jour la position du conducteur
app.post('/driver/location', authenticateToken, (req, res) => {
  const { latitude, longitude } = req.body;
  const driverId = req.user.id;

  db.run('INSERT INTO driver_locations (driver_id, latitude, longitude) VALUES (?, ?, ?)', [driverId, latitude, longitude], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Location updated successfully' });
  });
});

// Route pour obtenir la position des conducteurs
app.get('/drivers/locations', (req, res) => {
  db.all('SELECT * FROM driver_locations', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Route pour ajouter un avis
app.post('/reviews', authenticateToken, (req, res) => {
  const { user_id, ride_id, rating, comment } = req.body;
  db.run('INSERT INTO reviews (user_id, ride_id, rating, comment) VALUES (?, ?, ?, ?)', [user_id, ride_id, rating, comment], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ id: this.lastID });
  });
});

// Route pour obtenir les avis d'un trajet
app.get('/reviews/:ride_id', (req, res) => {
  const { ride_id } = req.params;
  db.all('SELECT * FROM reviews WHERE ride_id = ?', [ride_id], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Route pour gérer les paiements
app.post('/create-payment-intent', authenticateToken, async (req, res) => {
  const { amount } = req.body;

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'usd',
      payment_method_types: ['card'],
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
