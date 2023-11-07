const PORT = process.env.PORT || 5000;
const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const jwt = require('jsonwebtoken');

const clientRequestHandler = express();
const JWT_SECRET = process.env.JWT_SECRECT_KEY;

const community_foods_database_name = 'communityfoods';
const donated_foods_collection_name = 'donated_foods';


//middlewares
clientRequestHandler.use(cors({
    credentials: true,
}));
clientRequestHandler.use(cookieParser());
clientRequestHandler.use(express.json());

//token verification custom middleware
const verifyUser = (request, response, next) => {
    const token = request.cookies?.ACCESS_TOKEN;
    console.log(token);
    if (token) {
        jwt.verify(token, JWT_SECRET, {
            algorithms: 'HS512',
            expiresIn: '1d',
        }, (error, decoded) => {
            if (decoded) {
                response.user = decoded;
                next();
            }
            if (error) {
                response.status(401).send({ message: 'Unauthorized user' });
            }
        })
    } else {
        return response.status(401).send({ message: 'Unauthorized user' });
    }
}

const uri = `mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@cluster0.2jixdw6.mongodb.net/?retryWrites=true&w=majority`;

const mongoClient = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


clientRequestHandler.post('/api/v1/token', (request, response) => {
    jwt.sign(request.body, JWT_SECRET, {
        algorithm: 'HS512',
        expiresIn: '1d',
    }, (error, token) => {
        if (token) {
            console.log(token);
            response.cookie('ACCESS_TOKEN', token, { httpOnly: true, secure: true, sameSite: 'none' }).send({ user: 'valid', token });
        } else {
            response.send({ user: 'unauthorized', error: error });
        }
    });
});


clientRequestHandler.get('/', async (request, response) => {
    try {
        await mongoClient.connect();
        const donated_foods = mongoClient.db(community_foods_database_name).collection(donated_foods_collection_name);
        const all_foods = await donated_foods.find().toArray();
        response.send(all_foods);

    } catch (error) {
        response.send({ message: error });
    } finally {
        mongoClient.close();
    }
})
clientRequestHandler.get('/featuredfoods', async (request, response) => {
    try {
        await mongoClient.connect();
        const donated_foods = mongoClient.db(community_foods_database_name).collection(donated_foods_collection_name);
        const featured_foods = await donated_foods.find().sort({ food_quantity: -1 }).limit(6).toArray();
        console.log(featured_foods);
        response.send(featured_foods);

    } catch (error) {
        console.log(error);
    } finally {
        mongoClient.close();
    }
})

clientRequestHandler.listen(PORT, () => {
    console.log(`Community Food Sharing Platform Server is running at port ${PORT}`);
})
