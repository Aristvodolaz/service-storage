const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Опции Swagger
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Storage Service API',
      version: '1.0.0',
      description: 'API для работы с хранилищем данных. Предоставляет возможности для поиска товаров по артикулу или штрих-коду, информации о продуктах и авторизации сотрудников.',
      contact: {
        name: 'Команда разработки',
        email: 'dev@komus.net'
      }
    },
    servers: [
      {
        url: 'http://localhost:3006',
        description: 'Локальный сервер разработки'
      },
      {
        url: 'http://31.128.44.48:3006',
        description: 'Продакшн сервер'
      }
    ],
    tags: [
      {
        name: 'Склад',
        description: 'Операции со складскими данными'
      },
      {
        name: 'Desktop',
        description: 'Методы для desktop-приложения'
      }
    ],
    components: {
      schemas: {
        Error: {
          type: 'object',
          properties: {
            code: {
              type: 'integer',
              description: 'Код ошибки'
            },
            message: {
              type: 'string',
              description: 'Сообщение об ошибке'
            }
          }
        },
        Product: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Уникальный идентификатор товара'
            },
            article: {
              type: 'string',
              description: 'Артикул товара'
            },
            shk: {
              type: 'string',
              description: 'Штрих-код товара'
            },
            name: {
              type: 'string',
              description: 'Наименование товара'
            },
            price: {
              type: 'number',
              format: 'float',
              description: 'Цена товара'
            },
            quantity: {
              type: 'integer',
              description: 'Количество товара на складе'
            }
          }
        },
        ProductInfo: {
          type: 'object',
          properties: {
            productId: {
              type: 'string',
              description: 'Идентификатор продукта'
            },
            description: {
              type: 'string',
              description: 'Описание продукта'
            },
            specifications: {
              type: 'object',
              description: 'Технические характеристики продукта'
            },
            images: {
              type: 'array',
              items: {
                type: 'string',
                format: 'uri'
              },
              description: 'Ссылки на изображения продукта'
            }
          }
        },
        Employee: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Идентификатор сотрудника'
            },
            name: {
              type: 'string',
              description: 'Имя сотрудника'
            },
            position: {
              type: 'string',
              description: 'Должность сотрудника'
            },
            department: {
              type: 'string',
              description: 'Отдел сотрудника'
            },
            permissions: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Права доступа сотрудника'
            }
          }
        }
      },
      responses: {
        BadRequest: {
          description: 'Некорректный запрос',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                code: 400,
                message: 'Необходимо указать артикул или штрих-код'
              }
            }
          }
        },
        NotFound: {
          description: 'Ресурс не найден',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                code: 404,
                message: 'Товар не найден'
              }
            }
          }
        },
        InternalError: {
          description: 'Внутренняя ошибка сервера',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                code: 500,
                message: 'Внутренняя ошибка сервера'
              }
            }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.js'], // Пути к файлам с маршрутами
};

const specs = swaggerJsdoc(options);

module.exports = {
  serve: swaggerUi.serve,
  setup: swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Storage Service API Documentation'
  }),
  specs
};
