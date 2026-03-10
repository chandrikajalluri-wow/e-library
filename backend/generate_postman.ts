import app from './src/app';
import listEndpoints from 'express-list-endpoints';
import * as fs from 'fs';

const endpoints = listEndpoints(app);

const collection = {
    info: {
        name: "E-Library API Collection",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    item: endpoints.map(ep => {
        return {
            name: ep.path,
            item: ep.methods.map(method => ({
                name: `[${method}] ${ep.path}`,
                request: {
                    method: method,
                    header: [],
                    url: {
                        raw: `{{baseUrl}}${ep.path.replace(/:([a-zA-Z0-9_]+)/g, '{{$1}}')}`,
                        host: ["{{baseUrl}}"],
                        path: ep.path.split('/').filter(Boolean).map(p => p.replace(/:([a-zA-Z0-9_]+)/g, '{{$1}}'))
                    }
                },
                response: []
            }))
        };
    })
};

fs.writeFileSync('postman_collection.json', JSON.stringify(collection, null, 2));

console.log('Postman collection generated successfully: postman_collection.json');
