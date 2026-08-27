const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar banco de dados SQLite local
const dbFile = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbFile, (err) => {
  if (err) {
    console.error('Erro ao abrir o banco de dados', err.message);
  } else {
    console.log('Conectado ao banco de dados SQLite.');
  }
});

// Criar tabela de eventos garantindo todos os campos
db.run(`CREATE TABLE IF NOT EXISTS eventos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  coletivo TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT,
  endTime TEXT,
  location TEXT,
  description TEXT,
  link TEXT
)`, (err) => {
  if (!err) {
    db.run(`ALTER TABLE eventos ADD COLUMN endTime TEXT`, () => {});
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Rota para listar todos os eventos
app.get('/api/events', (req, res) => {
  db.all('SELECT * FROM eventos', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    const events = rows.map(row => {
      let endDateTime = null;
      if (row.date && row.endTime) {
        endDateTime = `${row.date}T${row.endTime}`;
      }

      return {
        id: row.id,
        title: `${row.title} (${row.coletivo})`, // Nome + coletivo na grade
        start: row.time ? `${row.date}T${row.time}` : row.date,
        end: endDateTime,
        extendedProps: {
          title: row.title,
          coletivo: row.coletivo,
          time: row.time || '',
          endTime: row.endTime || '',
          location: row.location || '',
          description: row.description || '',
          link: row.link || ''
        }
      };
    });
    res.json(events);
  });
});

// Rota para cadastrar um novo evento
app.post('/api/events', (req, res) => {
  const { title, coletivo, date, time, endTime, location, description, link } = req.body;
  
  if (!title || !coletivo || !date) {
    return res.status(400).json({ error: 'Título, Coletivo e Data são obrigatórios.' });
  }

  const query = `INSERT INTO eventos (title, coletivo, date, time, endTime, location, description, link) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  db.run(query, [title, coletivo, date, time || null, endTime || null, location || null, description || null, link || null], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ id: this.lastID, success: true });
  });
});

// Rota para atualizar um evento existente (Protegida por senha simples)
app.put('/api/events/:id', (req, res) => {
  const { id } = req.params;
  const { title, coletivo, date, time, endTime, location, description, link, senha } = req.body;

  // Senha mestre simples para os movimentos (você pode alterar para a senha que quiser aqui)
  if (senha !== 'movimento2026') {
    return res.status(403).json({ error: 'Senha de administração incorreta.' });
  }

  const query = `UPDATE eventos SET title = ?, coletivo = ?, date = ?, time = ?, endTime = ?, location = ?, description = ?, link = ? WHERE id = ?`;
  db.run(query, [title, coletivo, date, time || null, endTime || null, location || null, description || null, link || null, id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true });
  });
});

// Rota para excluir um evento (Protegida por senha simples)
app.delete('/api/events/:id', (req, res) => {
  const { id } = req.params;
  const { senha } = req.body;

  if (senha !== 'movimento2026') {
    return res.status(403).json({ error: 'Senha de administração incorreta.' });
  }

  db.run(`DELETE FROM eventos WHERE id = ?`, [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true });
  });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});