const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');

const app = express();
const port = 3001;

app.use(bodyParser.json());

let articles = [];
let idCounter = 1;
let index = {};

function indexArticle(article) {
    const words = article.content.split(/\W+/);
    words.forEach(word => {
        word = word.toLowerCase();
        if (!index[word]) {
            index[word] = [];
        }
        if (!index[word].includes(article.id)) {
            index[word].push(article.id);
        }
    });
}

app.post('/articles', (req, res) => {
    const { title, content, tags } = req.body;
    const newArticle = { id: idCounter++, title, content, tags, date: new Date() };
    articles.push(newArticle);
    indexArticle(newArticle);
    res.status(201).send(newArticle);
});

app.get('/articles/search', (req, res) => {
    const { keyword, tag, sortBy } = req.query;
    let results = [];

    if (keyword) {
        const lowerKeyword = keyword.toLowerCase();
        const articleIds = index[lowerKeyword] || [];
        results = articles.filter(article => articleIds.includes(article.id));
    }

    if (tag) {
        results = results.filter(article => article.tags.includes(tag));
    }

    if (sortBy === 'relevance' && keyword) {
        results.sort((a, b) => {
            const aFrequency = (a.title.match(new RegExp(keyword, 'gi')) || []).length + 
                               (a.content.match(new RegExp(keyword, 'gi')) || []).length;
            const bFrequency = (b.title.match(new RegExp(keyword, 'gi')) || []).length + 
                               (b.content.match(new RegExp(keyword, 'gi')) || []).length;
            return bFrequency - aFrequency;
        });
    } else if (sortBy === 'date') {
        results.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    res.send(results);
});

app.get('/articles/:id', (req, res) => {
    const article = articles.find(a => a.id === parseInt(req.params.id));
    if (article) {
        res.send(article);
    } else {
        res.status(404).send({ message: 'Article not found' });
    }
});

// Optional Persistence (Save to File)
app.post('/save', (req, res) => {
    fs.writeFileSync('articles.json', JSON.stringify(articles));
    res.send({ message: 'Articles saved to file' });
});

// Load Articles from File
app.post('/load', (req, res) => {
    if (fs.existsSync('articles.json')) {
        articles = JSON.parse(fs.readFileSync('articles.json'));
        // Rebuild the index
        index = {};
        articles.forEach(article => indexArticle(article));
        res.send({ message: 'Articles loaded from file' });
    } else {
        res.status(404).send({ message: 'No articles file found' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
