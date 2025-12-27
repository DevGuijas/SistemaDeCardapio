const express = require('express');
const path = require('path');
const methodOverride = require('method-override');
const multer = require('multer');
const { Sequelize, DataTypes } = require('sequelize'); // Alterado para Sequelize

const app = express();

// --- CONFIGURAÇÃO DO BANCO DE DADOS (SQLite Local) ---
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database.sqlite', // Cria este arquivo na pasta do projeto
    logging: false
});

// --- MODELO DO ITEM (Definição para SQLite) ---
const Item = sequelize.define('Item', {
    titulo: DataTypes.STRING,
    descricao: DataTypes.TEXT,
    preco: DataTypes.DOUBLE,
    imagem: DataTypes.STRING
});

// Sincroniza o banco (Cria a tabela se não existir)
sequelize.sync()
    .then(() => console.log("Banco SQLite do Rancho conectado e pronto!"))
    .catch(err => console.log("Erro ao iniciar SQLite:", err));

// --- CONFIGURAÇÕES ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

// --- CONFIGURAÇÃO DO MULTER (UPLOAD DE FOTOS) ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// --- ROTAS DO CARDÁPIO (PÚBLICO) ---
app.get('/', async (req, res) => {
    const itens = await Item.findAll(); // findAll substitui o find
    res.render('index', { itens });
});

// --- ROTAS DO ADMIN ---
// Listar itens no admin
app.get('/admin', async (req, res) => {
    const itens = await Item.findAll();
    res.render('admin', { itens });
});

// Adicionar novo item
app.post('/admin/add', upload.single('foto'), async (req, res) => {
    const { titulo, descricao, preco } = req.body;
    await Item.create({
        titulo,
        descricao,
        preco: parseFloat(preco),
        imagem: req.file ? req.file.filename : 'default.jpg'
    });
    res.redirect('/admin');
});

// Rota para abrir o formulário de edição
app.get('/admin/edit/:id', async (req, res) => {
    const item = await Item.findByPk(req.params.id); // findByPk busca pelo ID (Primary Key)
    res.render('edit', { item });
});

// Rota para processar a atualização (usando PUT)
app.put('/admin/edit/:id', upload.single('foto'), async (req, res) => {
    const { titulo, descricao, preco } = req.body;
    const item = await Item.findByPk(req.params.id);
    
    const updateData = { 
        titulo, 
        descricao, 
        preco: parseFloat(preco) 
    };
    
    if (req.file) {
        updateData.imagem = req.file.filename;
    }

    await item.update(updateData);
    res.redirect('/admin');
});

// Deletar item
app.delete('/admin/delete/:id', async (req, res) => {
    const item = await Item.findByPk(req.params.id);
    await item.destroy();
    res.redirect('/admin');
});

// --- SERVIDOR ---
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Rancho do Cupim rodando em http://localhost:${PORT}`);
});