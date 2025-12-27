const express = require('express');
const path = require('path');
const methodOverride = require('method-override');
const multer = require('multer');
const { Sequelize, DataTypes } = require('sequelize');
const session = require('express-session');

const app = express();

// --- CONFIGURAÇÃO DE SESSÃO ---
app.use(session({
    secret: 'rancho-secreto-123',
    resave: false,
    saveUninitialized: true
}));

// Middleware de proteção
function verificarAutenticacao(req, res, next) {
    if (req.session.autenticado) return next();
    res.redirect('/login');
}

// --- BANCO DE DADOS ---
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database.sqlite',
    logging: false
});

const Item = sequelize.define('Item', {
    titulo: DataTypes.STRING,
    descricao: DataTypes.TEXT,
    preco: DataTypes.DOUBLE,
    imagem: DataTypes.STRING,
    categoria: DataTypes.STRING,
    disponivel: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
});

sequelize.sync({ alter: true }).then(() => console.log("SQLite pronto!"));

// --- CONFIGURAÇÕES ---
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// --- ROTAS DE LOGIN ---
app.get('/login', (req, res) => res.render('login'));
app.post('/login', (req, res) => {
    const { senha } = req.body;
    if (senha === 'admin123') {
        req.session.autenticado = true;
        res.redirect('/admin');
    } else {
        res.send('Senha incorreta!');
    }
});
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// --- ROTAS PÚBLICAS ---
app.get('/', async (req, res) => {
    const itens = await Item.findAll();
    res.render('index', { itens });
});

// --- ROTAS ADMIN (PROTEGIDAS) ---
app.get('/admin', verificarAutenticacao, async (req, res) => {
    const itens = await Item.findAll();
    res.render('admin', { itens });
});

app.post('/admin/add', verificarAutenticacao, upload.single('foto'), async (req, res) => {
    const { titulo, descricao, preco, categoria } = req.body;
    await Item.create({
        titulo, descricao, categoria,
        preco: parseFloat(preco),
        imagem: req.file ? req.file.filename : 'default.jpg'
    });
    res.redirect('/admin');
});

// Rota rápida para alternar disponibilidade
app.put('/admin/status/:id', verificarAutenticacao, async (req, res) => {
    const item = await Item.findByPk(req.params.id);
    await item.update({ disponivel: !item.disponivel });
    res.redirect('/admin');
});

app.get('/admin/edit/:id', verificarAutenticacao, async (req, res) => {
    const item = await Item.findByPk(req.params.id);
    res.render('edit', { item });
});

app.put('/admin/edit/:id', verificarAutenticacao, upload.single('foto'), async (req, res) => {
    const { titulo, descricao, preco, categoria } = req.body;
    const item = await Item.findByPk(req.params.id);
    let updateData = { titulo, descricao, preco: parseFloat(preco), categoria };
    if (req.file) updateData.imagem = req.file.filename;
    await item.update(updateData);
    res.redirect('/admin');
});

app.delete('/admin/delete/:id', verificarAutenticacao, async (req, res) => {
    const item = await Item.findByPk(req.params.id);
    await item.destroy();
    res.redirect('/admin');
});

app.listen(3000, () => console.log(`Rodando em http://localhost:3000`));