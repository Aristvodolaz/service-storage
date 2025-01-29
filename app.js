const express = require('express');
const bodyParser = require('body-parser')
const app = express();


const logger = require('./utils/logger');

const port = 3005;
// Middleware
app.use(bodyParser.json());

const articleRoutes = require('./routes/article');  // Подключаем новый маршрут для артикула
const prunitRoutes = require('./routes/prunit');

// Маршруты
app.use('/search', articleRoutes);  
app.use('/searchPrunit', prunitRoutes);


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});